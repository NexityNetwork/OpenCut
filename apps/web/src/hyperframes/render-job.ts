// Shared Azure Container Apps job driver for HyperFrames renders. Reuses the
// recycled render box (ultron-hyperframes-render-job): clone the job's
// container, override IN_KEY/OUT_KEY, and start a manual execution via ARM.

import { getCloudflareContext } from "@opennextjs/cloudflare";

const API_VERSION = "2024-03-01";
const JOB = "ultron-hyperframes-render-job";

export function cfEnv(name: string): string {
	try {
		const { env } = getCloudflareContext();
		const v = (env as Record<string, unknown>)[name];
		if (typeof v === "string" && v) return v;
	} catch {
		/* not on CF */
	}
	return process.env[name] ?? "";
}

export function isAzureConfigured(): boolean {
	return (
		!!cfEnv("AZURE_CLIENT_SECRET") &&
		!!cfEnv("AZURE_CLIENT_ID") &&
		!!cfEnv("AZURE_TENANT") &&
		!!cfEnv("AZURE_SUBSCRIPTION")
	);
}

function armBase(): string {
	return `https://management.azure.com/subscriptions/${cfEnv(
		"AZURE_SUBSCRIPTION",
	)}/resourceGroups/${cfEnv(
		"AZURE_RG",
	)}/providers/Microsoft.App/jobs/${JOB}`;
}

export async function azureToken(): Promise<string> {
	const res = await fetch(
		`https://login.microsoftonline.com/${cfEnv("AZURE_TENANT")}/oauth2/v2.0/token`,
		{
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({
				client_id: cfEnv("AZURE_CLIENT_ID"),
				client_secret: cfEnv("AZURE_CLIENT_SECRET"),
				grant_type: "client_credentials",
				scope: "https://management.azure.com/.default",
			}),
		},
	);
	if (!res.ok) throw new Error(`AAD token failed (${res.status})`);
	return (await res.json()).access_token as string;
}

// Start a render execution. Returns the execution name (for polling).
export async function startRender(opts: {
	inKey: string;
	outKey: string;
	jobId?: string;
}): Promise<string | null> {
	const token = await azureToken();
	const base = armBase();
	const auth = { Authorization: `Bearer ${token}` };

	const jobRes = await fetch(`${base}?api-version=${API_VERSION}`, {
		headers: auth,
	});
	if (!jobRes.ok) throw new Error(`read job failed (${jobRes.status})`);
	const job = await jobRes.json();
	const container = JSON.parse(
		JSON.stringify(job.properties.template.containers[0]),
	);
	const setEnv = (name: string, value: string) => {
		container.env = container.env ?? [];
		const e = container.env.find((x: { name: string }) => x.name === name);
		if (e) {
			delete e.secretRef;
			e.value = value;
		} else {
			container.env.push({ name, value });
		}
	};
	setEnv("IN_KEY", opts.inKey);
	setEnv("OUT_KEY", opts.outKey);
	setEnv("JOB_ID", opts.jobId ?? `hf-${Date.now()}`);

	const startRes = await fetch(`${base}/start?api-version=${API_VERSION}`, {
		method: "POST",
		headers: { ...auth, "Content-Type": "application/json" },
		body: JSON.stringify({ containers: [container] }),
	});
	if (!startRes.ok) {
		throw new Error(
			`start failed (${startRes.status}): ${(await startRes.text()).slice(0, 300)}`,
		);
	}
	try {
		const started = await startRes.json();
		return started?.name ?? started?.id?.split("/").pop() ?? null;
	} catch {
		const list = await (
			await fetch(`${base}/executions?api-version=${API_VERSION}`, {
				headers: auth,
			})
		).json();
		return (
			(list.value ?? []).sort(
				(
					a: { properties?: { startTime?: string } },
					b: { properties?: { startTime?: string } },
				) =>
					(b.properties?.startTime ?? "").localeCompare(
						a.properties?.startTime ?? "",
					),
			)[0]?.name ?? null
		);
	}
}
