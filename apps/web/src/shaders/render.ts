"use client";

import {
	COMMON_GLSL,
	VERTEX_SHADER,
	WRAPPER_MAIN,
	getShaderDefinition,
} from "./registry";

// Renders the Pixel-Perfect background shaders to a canvas so the WASM
// compositor can upload them as external textures (the same path Lottie uses).
// One shared WebGL context renders every shader; each call copies the result
// into a fresh 2D canvas so concurrent clips don't clobber each other and the
// compositor's identity-keyed texture cache re-uploads changed frames.

type ProgramEntry = {
	program: WebGLProgram;
	locations: {
		resolution: WebGLUniformLocation | null;
		time: WebGLUniformLocation | null;
		mouse: WebGLUniformLocation | null;
		uZoom: WebGLUniformLocation | null;
		uHue: WebGLUniformLocation | null;
		uSaturation: WebGLUniformLocation | null;
		uContrast: WebGLUniformLocation | null;
		uBrightness: WebGLUniformLocation | null;
	};
};

let gl: WebGLRenderingContext | null = null;
let glCanvas: HTMLCanvasElement | null = null;
let positionBuffer: WebGLBuffer | null = null;
const programCache = new Map<string, ProgramEntry | null>();

// Per scene node: remember the last rendered key + output canvas so a paused
// playhead is a cheap cache hit (no GL work, no re-upload).
const nodeCache = new WeakMap<
	object,
	{ key: string; output: HTMLCanvasElement }
>();

function ensureContext(): WebGLRenderingContext | null {
	if (gl && glCanvas && !gl.isContextLost()) return gl;
	glCanvas = document.createElement("canvas");
	gl =
		(glCanvas.getContext("webgl", {
			antialias: true,
			preserveDrawingBuffer: true,
			premultipliedAlpha: false,
		}) as WebGLRenderingContext | null) ?? null;
	if (!gl) return null;
	positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	// Fullscreen triangle.
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 3, -1, -1, 3]),
		gl.STATIC_DRAW,
	);
	programCache.clear();
	return gl;
}

function compile(
	context: WebGLRenderingContext,
	type: number,
	source: string,
): WebGLShader | null {
	const shader = context.createShader(type);
	if (!shader) return null;
	context.shaderSource(shader, source);
	context.compileShader(shader);
	if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
		context.deleteShader(shader);
		return null;
	}
	return shader;
}

function getProgram(
	context: WebGLRenderingContext,
	shaderId: string,
): ProgramEntry | null {
	if (programCache.has(shaderId)) return programCache.get(shaderId) ?? null;

	const definition = getShaderDefinition(shaderId);
	if (!definition) {
		programCache.set(shaderId, null);
		return null;
	}

	// Rename the shader's main() and redirect its writes into the scratch
	// `fragColor`, matching the Pixel-Perfect wrapper.
	const userSrc = definition.fragmentShader
		.replace(/\bvoid\s+main\b/, "void userMain")
		.replace(/\bgl_FragColor\b/g, "fragColor");
	const fragSrc = `${COMMON_GLSL}\n${userSrc}\n${WRAPPER_MAIN}`;

	const vert = compile(context, context.VERTEX_SHADER, VERTEX_SHADER);
	const frag = compile(context, context.FRAGMENT_SHADER, fragSrc);
	if (!vert || !frag) {
		programCache.set(shaderId, null);
		return null;
	}
	const program = context.createProgram();
	if (!program) {
		programCache.set(shaderId, null);
		return null;
	}
	context.attachShader(program, vert);
	context.attachShader(program, frag);
	context.linkProgram(program);
	context.deleteShader(vert);
	context.deleteShader(frag);
	if (!context.getProgramParameter(program, context.LINK_STATUS)) {
		programCache.set(shaderId, null);
		return null;
	}

	const u = (name: string) => context.getUniformLocation(program, name);
	const entry: ProgramEntry = {
		program,
		locations: {
			resolution: u("resolution"),
			time: u("time"),
			mouse: u("mouse"),
			uZoom: u("uZoom"),
			uHue: u("uHue"),
			uSaturation: u("uSaturation"),
			uContrast: u("uContrast"),
			uBrightness: u("uBrightness"),
		},
	};
	programCache.set(shaderId, entry);
	return entry;
}

export function renderShaderFrame({
	owner,
	shaderId,
	timeSeconds,
	width,
	height,
}: {
	owner: object;
	shaderId: string;
	timeSeconds: number;
	width: number;
	height: number;
}): HTMLCanvasElement | null {
	const w = Math.max(1, Math.round(width));
	const h = Math.max(1, Math.round(height));
	const t = Number.isFinite(timeSeconds) && timeSeconds > 0 ? timeSeconds : 0;
	// Quantize to ~30fps so sub-frame seeks reuse the cached frame.
	const key = `${shaderId}:${Math.round(t * 30)}:${w}x${h}`;

	const cached = nodeCache.get(owner);
	if (cached && cached.key === key) return cached.output;

	const context = ensureContext();
	if (!context || !glCanvas) return cached?.output ?? null;

	const entry = getProgram(context, shaderId);
	if (!entry) return cached?.output ?? null;

	if (glCanvas.width !== w || glCanvas.height !== h) {
		glCanvas.width = w;
		glCanvas.height = h;
	}
	context.viewport(0, 0, w, h);
	context.useProgram(entry.program);

	context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
	const posLoc = context.getAttribLocation(entry.program, "aPosition");
	context.enableVertexAttribArray(posLoc);
	context.vertexAttribPointer(posLoc, 2, context.FLOAT, false, 0, 0);

	const { locations } = entry;
	if (locations.resolution) context.uniform2f(locations.resolution, w, h);
	if (locations.time) context.uniform1f(locations.time, t);
	if (locations.mouse) context.uniform2f(locations.mouse, 0.5, 0.5);
	if (locations.uZoom) context.uniform1f(locations.uZoom, 1);
	if (locations.uHue) context.uniform1f(locations.uHue, 0);
	if (locations.uSaturation) context.uniform1f(locations.uSaturation, 1);
	if (locations.uContrast) context.uniform1f(locations.uContrast, 1);
	if (locations.uBrightness) context.uniform1f(locations.uBrightness, 1);

	context.drawArrays(context.TRIANGLES, 0, 3);

	// Copy into a fresh canvas: the compositor caches external textures by
	// object identity, and the shared GL canvas is reused by other clips.
	const output = document.createElement("canvas");
	output.width = w;
	output.height = h;
	const outContext = output.getContext("2d");
	if (!outContext) return cached?.output ?? null;
	outContext.drawImage(glCanvas, 0, 0);

	nodeCache.set(owner, { key, output });
	return output;
}
