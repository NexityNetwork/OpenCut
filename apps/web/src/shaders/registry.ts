// Animated full-frame background shaders, ported from Pixel-Perfect
// (github.com/vansh-nagar/Pixel-Perfect). Each is a self-contained GLSL ES 1.00
// fragment shader whose body uses the helpers in COMMON_GLSL and is driven by a
// `time` uniform, so it is fully deterministic for scrubbing and export.

export type ShaderDefinition = {
	id: string;
	title: string;
	description: string;
	/** GLSL `void main()` body; helpers from COMMON_GLSL are available. */
	fragmentShader: string;
};

// Fullscreen-triangle vertex shader (raw WebGL, no three.js).
export const VERTEX_SHADER = /* glsl */ `
	attribute vec2 aPosition;
	void main() {
		gl_Position = vec4(aPosition, 0.0, 1.0);
	}
`;

// Wraps every shader: runs its (renamed) main, then post-processes with the
// universal hue/saturation/contrast/brightness controls (neutral by default).
export const WRAPPER_MAIN = /* glsl */ `
	void main() {
		fragColor = vec4(0.0, 0.0, 0.0, 1.0);
		userMain();
		gl_FragColor = vec4(applyAdjust(fragColor.rgb), fragColor.a);
	}
`;

// Shared helpers + uniforms prepended to every fragment shader.
export const COMMON_GLSL = /* glsl */ `
	precision highp float;

	uniform vec2 resolution;
	uniform float time;
	uniform vec2 mouse;

	uniform float uZoom;
	uniform float uHue;
	uniform float uSaturation;
	uniform float uContrast;
	uniform float uBrightness;

	vec4 fragColor;

	#define PI 3.14159265359
	#define TAU 6.28318530718

	float hash21(vec2 p) {
		p = fract(p * vec2(123.34, 456.21));
		p += dot(p, p + 45.32);
		return fract(p.x * p.y);
	}

	float vnoise(in vec2 p) {
		vec2 i = floor(p);
		vec2 f = fract(p);
		vec2 u = f * f * (3.0 - 2.0 * f);
		float a = hash21(i);
		float b = hash21(i + vec2(1.0, 0.0));
		float c = hash21(i + vec2(0.0, 1.0));
		float d = hash21(i + vec2(1.0, 1.0));
		return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
	}

	float fbm(vec2 p) {
		float v = 0.0;
		float amp = 0.5;
		mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
		for (int i = 0; i < 6; i++) {
			v += amp * vnoise(p);
			p = m * p;
			amp *= 0.5;
		}
		return v;
	}

	mat2 rot(float a) {
		float c = cos(a);
		float s = sin(a);
		return mat2(c, -s, s, c);
	}

	vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
		return a + b * cos(TAU * (c * t + d));
	}

	vec2 uvCentered() {
		vec2 p = (gl_FragCoord.xy * 2.0 - resolution.xy) / min(resolution.x, resolution.y);
		return p / uZoom;
	}

	vec2 uv01() {
		vec2 p = gl_FragCoord.xy / resolution.xy;
		return (p - 0.5) / uZoom + 0.5;
	}

	vec3 hueRotate(vec3 col, float a) {
		const vec3 k = vec3(0.57735);
		float c = cos(a);
		return col * c + cross(k, col) * sin(a) + k * dot(k, col) * (1.0 - c);
	}

	vec3 applyAdjust(vec3 col) {
		col = hueRotate(col, uHue);
		float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
		col = mix(vec3(l), col, uSaturation);
		col = (col - 0.5) * uContrast + 0.5;
		col *= uBrightness;
		return clamp(col, 0.0, 1.0);
	}
`;

export const SHADERS: ShaderDefinition[] = [
	{
		id: "plasma-flow",
		title: "Plasma Flow",
		description: "Interfering sine fields cycling through a vivid palette.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uvCentered();
				float t = time * 0.4;
				float v = 0.0;
				v += sin(uv.x * 3.0 + t);
				v += sin((uv.y * 3.0 + t) * 0.7);
				v += sin((uv.x * 2.0 + uv.y * 2.0 + t) * 0.8);
				vec2 c = uv + 0.6 * vec2(sin(t * 0.3), cos(t * 0.4));
				v += sin(length(c) * 5.0 - t * 1.5);
				v *= 0.25;
				vec3 col = palette(
					v,
					vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)
				);
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
	{
		id: "aurora-curtain",
		title: "Aurora Curtain",
		description: "Drifting ribbons of green and violet over a night sky.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uv01();
				float t = time * 0.15;
				float n = fbm(vec2(uv.x * 2.5, uv.y * 1.5 - t));
				float curtain = fbm(vec2(uv.x * 3.0 + t, uv.y * 4.0 - t * 1.5));
				float ribbon = smoothstep(0.1, 0.7, n) * (1.0 - smoothstep(0.2, 0.95, uv.y));
				ribbon *= 0.6 + 0.4 * curtain;
				vec3 green = vec3(0.10, 0.95, 0.55);
				vec3 teal = vec3(0.10, 0.65, 0.95);
				vec3 purple = vec3(0.55, 0.20, 0.95);
				vec3 col = mix(green, teal, fbm(uv * 3.0 + t));
				col = mix(col, purple, smoothstep(0.35, 1.0, uv.y));
				col *= ribbon * 1.6;
				col += vec3(0.02, 0.03, 0.09);
				col += hash21(uv * resolution.xy) * 0.015;
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
	{
		id: "liquid-metal",
		title: "Liquid Metal",
		description: "Layered domain warping pooling into a flowing chrome surface.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uv01() * 3.0;
				float t = time * 0.15;
				vec2 q = vec2(fbm(uv + t), fbm(uv + vec2(5.2, 1.3)));
				vec2 r = vec2(
					fbm(uv + 4.0 * q + vec2(1.7, 9.2) + t * 0.5),
					fbm(uv + 4.0 * q + vec2(8.3, 2.8))
				);
				float f = fbm(uv + 4.0 * r);
				vec3 col = mix(vec3(0.08, 0.10, 0.15), vec3(0.90, 0.93, 0.99), f);
				col = mix(col, vec3(0.35, 0.45, 0.70), clamp(length(q), 0.0, 1.0));
				col = mix(col, vec3(0.97), r.x * 0.55);
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
	{
		id: "drifting-clouds",
		title: "Drifting Clouds",
		description: "Soft warped clouds rolling across a clear blue sky.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uv01();
				float aspect = resolution.x / resolution.y;
				uv.x *= aspect;
				float t = time * 0.05;
				float f = fbm(uv * 3.0 + vec2(t, t * 0.5));
				f = fbm(uv * 3.0 + f + vec2(t * 0.5, 0.0));
				vec3 sky = vec3(0.25, 0.45, 0.85);
				vec3 cloud = vec3(1.0);
				vec3 col = mix(sky, cloud, smoothstep(0.25, 0.85, f));
				col = mix(col, vec3(0.55, 0.70, 0.95), (1.0 - uv.y) * 0.25);
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
	{
		id: "neon-rings",
		title: "Neon Rings",
		description: "Pulsing, wobbling concentric rings through a cosine spectrum.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uvCentered();
				float t = time * 0.5;
				float r = length(uv);
				float a = atan(uv.y, uv.x);
				float wob = 0.05 * sin(a * 6.0 + t * 2.0);
				float rings = abs(fract((r + wob) * 4.0 - t) * 2.0 - 1.0);
				float glow = 0.025 / (rings + 0.025);
				vec3 col = palette(
					r - t * 0.2,
					vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)
				) * glow;
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
	{
		id: "kaleidoscope",
		title: "Kaleidoscope",
		description: "Eight-fold mirrored noise rotating through the spectrum.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uvCentered();
				float t = time * 0.2;
				uv = rot(t * 0.3) * uv;
				float r = length(uv);
				float a = atan(uv.y, uv.x);
				float seg = TAU / 8.0;
				a = mod(a, seg);
				a = abs(a - seg * 0.5);
				vec2 p = vec2(cos(a), sin(a)) * r;
				float n = fbm(p * 3.0 + t);
				vec3 col = palette(
					n + r - t * 0.3,
					vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67)
				);
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
	{
		id: "liquid-caustics",
		title: "Liquid Caustics",
		description: "Sunlight refracting through rippling water onto a pool floor.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uv01() * 4.0;
				float aspect = resolution.x / resolution.y;
				uv.x *= aspect;
				float t = time * 0.4;
				vec2 p = uv;
				for (int i = 0; i < 4; i++) {
					float fi = float(i) + 1.0;
					p += vec2(sin(p.y * 1.5 + t + fi), cos(p.x * 1.5 - t + fi)) * 0.35;
				}
				float v = abs(sin(p.x) * sin(p.y));
				float caustic = pow(1.0 - v, 4.0);
				vec3 col = mix(vec3(0.0, 0.22, 0.45), vec3(0.45, 0.95, 1.0), caustic);
				col += pow(caustic, 3.0) * 0.5;
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
	{
		id: "gentle-waves",
		title: "Gentle Waves",
		description: "A calm light-to-blue gradient rolling with soft waves.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uv01();
				float t = time * 0.12;
				float w = sin(uv.x * 3.0 + t) * 0.05
						+ sin(uv.x * 6.5 - t * 1.3) * 0.025
						+ sin(uv.x * 1.5 + t * 0.6) * 0.06;
				float y = uv.y + w;
				vec3 top = vec3(0.95, 0.97, 1.0);
				vec3 mid = vec3(0.55, 0.72, 0.98);
				vec3 bot = vec3(0.30, 0.45, 0.92);
				vec3 col = mix(bot, mid, smoothstep(0.0, 0.6, y));
				col = mix(col, top, smoothstep(0.55, 1.05, y));
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
	{
		id: "spotlight",
		title: "Spotlight",
		description: "A noise-wobbled glow breathing in the dark.",
		fragmentShader: /* glsl */ `
			void main() {
				vec2 uv = uv01();
				float aspect = resolution.x / resolution.y;
				vec2 center = vec2(0.5 + 0.12 * sin(time * 0.3), 0.5 + 0.1 * cos(time * 0.23));
				vec2 diff = uv - center;
				diff.x *= aspect;
				float d = length(diff);
				float n = fbm(uv * 6.0 + time * 0.4);
				d += (n - 0.5) * 0.1;
				float glow = smoothstep(0.35, 0.0, d);
				vec3 col = mix(vec3(0.0), vec3(1.0), glow);
				gl_FragColor = vec4(col, 1.0);
			}
		`,
	},
];

export const getShaderDefinition = (id: string): ShaderDefinition | undefined =>
	SHADERS.find((s) => s.id === id);
