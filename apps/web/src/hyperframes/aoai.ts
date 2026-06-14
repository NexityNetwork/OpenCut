// One place to call Azure OpenAI chat completions. Newer gpt-5.x deployments
// reject `max_tokens` (they require `max_completion_tokens`), so normalize that
// here and keep both the composer and the enhancer on the same code path.

export type AoaiArgs = {
	endpoint: string; // AZURE_OPENAI_ENDPOINT (trailing slash ok)
	deployment: string; // deployment / model name
	key: string;
	messages: { role: "system" | "user" | "assistant"; content: string }[];
	temperature?: number;
	maxTokens?: number;
	json?: boolean;
	apiVersion?: string;
};

export async function callAoai(args: AoaiArgs): Promise<string> {
	const isG5 = /^gpt-5/i.test(args.deployment);
	const body: Record<string, unknown> = { messages: args.messages };
	if (args.json) body.response_format = { type: "json_object" };
	if (typeof args.temperature === "number") body.temperature = args.temperature;
	if (typeof args.maxTokens === "number") {
		if (isG5) body.max_completion_tokens = args.maxTokens;
		else body.max_tokens = args.maxTokens;
	}
	const base = args.endpoint.replace(/\/$/, "");
	const url = `${base}/openai/deployments/${args.deployment}/chat/completions?api-version=${
		args.apiVersion ?? "2024-10-21"
	}`;
	const res = await fetch(url, {
		method: "POST",
		headers: { "api-key": args.key, "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		throw new Error(`aoai ${res.status}: ${(await res.text()).slice(0, 300)}`);
	}
	const data = (await res.json()) as {
		choices?: { message?: { content?: string } }[];
	};
	return data.choices?.[0]?.message?.content ?? "";
}
