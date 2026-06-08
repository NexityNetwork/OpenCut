import { getCloudflareContext } from "@opennextjs/cloudflare";

function readEnv(name: string): string {
	try {
		const { env } = getCloudflareContext();
		const v = (env as Record<string, unknown>)[name];
		if (typeof v === "string" && v) return v;
	} catch {
		// not running on Cloudflare (e.g. local dev) — fall through to process.env
	}
	return process.env[name] ?? "";
}

export async function POST(request: Request) {
	const body = (await request.json().catch(() => ({}))) as {
		url?: string;
		mode?: string;
	};
	const url = (body.url ?? "").trim();
	const mode = body.mode === "video" ? "video" : "audio";
	if (!url || !/^https?:\/\//i.test(url)) {
		return Response.json({ error: "Enter a valid https link" }, { status: 400 });
	}

	const base = readEnv("YTDLP_URL").replace(/\/+$/, "");
	const secret = readEnv("IMPORT_SECRET");
	if (!base) {
		return Response.json(
			{ error: "Importer is not configured" },
			{ status: 503 },
		);
	}

	let upstream: Response;
	try {
		upstream = await fetch(`${base}/import`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-import-secret": secret,
			},
			body: JSON.stringify({ url, mode }),
		});
	} catch {
		return Response.json({ error: "Importer is unreachable" }, { status: 502 });
	}

	const data = (await upstream.json().catch(() => ({}))) as {
		error?: string;
		detail?: string;
		[k: string]: unknown;
	};
	if (!upstream.ok) {
		const msg =
			data.error === "bot_check"
				? "This source is blocking automated downloads right now."
				: data.error === "unauthorized"
					? "Importer authentication failed."
					: data.detail || data.error || "Import failed";
		return Response.json({ error: msg }, { status: 502 });
	}
	return Response.json(data);
}
