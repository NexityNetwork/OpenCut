// Anonymous per-device owner id for the vault (no auth yet; D1 is keyed on this).
const KEY = "vault-owner-id";

export function getVaultOwner(): string {
	if (typeof window === "undefined") return "anon";
	let id = localStorage.getItem(KEY);
	if (!id) {
		id =
			typeof crypto !== "undefined" && crypto.randomUUID
				? crypto.randomUUID()
				: `o_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		localStorage.setItem(KEY, id);
	}
	return id;
}
