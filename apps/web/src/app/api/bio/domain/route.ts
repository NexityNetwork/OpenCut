import {
	bioDb,
	ensureBioTables,
	sessionUserId,
	bioFallbackHost,
	createCustomHostname,
	getCustomHostname,
	deleteCustomHostname,
} from "@/bio/server";

// Custom domains for bio pages, via Cloudflare for SaaS custom hostnames.
// Requires a logged-in owner with a published page. The visitor flow:
// their CNAME → bio-edge.51ultron.com → this worker → middleware rewrites
// by Host → /biodomain/<host> renders the page.

const DOMAIN_RE =
	/^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

export async function GET(request: Request) {
	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);
	const owner = await sessionUserId(request);
	if (!owner) return Response.json({ domain: null });

	const row = await d
		.prepare(
			"SELECT domain, ch_id, status FROM bio_domains WHERE owner = ?",
		)
		.bind(owner)
		.first<{ domain: string; ch_id: string | null; status: string }>();
	if (!row) return Response.json({ domain: null, target: bioFallbackHost() });

	// Refresh live status from Cloudflare when we have a hostname id.
	let status = row.status;
	let sslStatus = "";
	if (row.ch_id) {
		try {
			const live = await getCustomHostname(row.ch_id);
			status = live.status;
			sslStatus = live.sslStatus;
			if (status !== row.status) {
				await d
					.prepare("UPDATE bio_domains SET status = ? WHERE owner = ?")
					.bind(status, owner)
					.run();
			}
		} catch {
			/* keep stored status */
		}
	}
	return Response.json({
		domain: row.domain,
		status,
		sslStatus,
		target: bioFallbackHost(),
	});
}

export async function POST(request: Request) {
	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);
	const owner = await sessionUserId(request);
	if (!owner) {
		return Response.json({ error: "Log in to connect a domain" }, { status: 401 });
	}

	const b = (await request.json().catch(() => ({}))) as { domain?: string };
	const domain = String(b.domain || "")
		.trim()
		.toLowerCase()
		.replace(/^https?:\/\//, "")
		.replace(/\/.*$/, "");
	if (!DOMAIN_RE.test(domain)) {
		return Response.json({ error: "Enter a valid domain" }, { status: 400 });
	}
	if (domain.endsWith("51ultron.com")) {
		return Response.json({ error: "That domain is reserved" }, { status: 400 });
	}

	const page = await d
		.prepare("SELECT handle FROM bio_pages WHERE owner = ? AND published = 1")
		.bind(owner)
		.first<{ handle: string }>();
	if (!page) {
		return Response.json(
			{ error: "Publish your page first, then connect a domain" },
			{ status: 400 },
		);
	}

	const clash = await d
		.prepare("SELECT owner FROM bio_domains WHERE domain = ? AND owner != ?")
		.bind(domain, owner)
		.first<{ owner: string }>();
	if (clash) {
		return Response.json({ error: "That domain is already connected" }, { status: 409 });
	}

	try {
		const ch = await createCustomHostname(domain);
		await d
			.prepare(
				`INSERT INTO bio_domains (domain, owner, ch_id, status, created_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(domain) DO UPDATE SET ch_id = excluded.ch_id, status = excluded.status`,
			)
			.bind(domain, owner, ch.id, ch.status, Date.now())
			.run();
		return Response.json({
			ok: true,
			domain,
			status: ch.status,
			target: bioFallbackHost(),
		});
	} catch (e) {
		const msg = e instanceof Error ? e.message : "Couldn't register the domain";
		// Most common: Cloudflare for SaaS not enabled on the zone yet.
		return Response.json({ error: msg }, { status: 502 });
	}
}

export async function DELETE(request: Request) {
	const d = bioDb();
	if (!d) return Response.json({ error: "not configured" }, { status: 503 });
	await ensureBioTables(d);
	const owner = await sessionUserId(request);
	if (!owner) return Response.json({ error: "unauthorized" }, { status: 401 });

	const row = await d
		.prepare("SELECT ch_id FROM bio_domains WHERE owner = ?")
		.bind(owner)
		.first<{ ch_id: string | null }>();
	if (row?.ch_id) {
		try {
			await deleteCustomHostname(row.ch_id);
		} catch {
			/* remove locally regardless */
		}
	}
	await d.prepare("DELETE FROM bio_domains WHERE owner = ?").bind(owner).run();
	return Response.json({ ok: true });
}
