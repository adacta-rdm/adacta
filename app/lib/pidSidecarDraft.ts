export type SidecarDraft = { initialToml: string; source: string; exported: string | null };

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const STORAGE_PREFIX = "adacta:pid-sidecar-draft:";

export function readSidecarDraft(
	storage: DraftStorage,
	rigSlug: string,
	initialToml: string,
): SidecarDraft | undefined {
	try {
		const stored = storage.getItem(`${STORAGE_PREFIX}${rigSlug}`);
		if (!stored) return;
		const value: unknown = JSON.parse(stored);
		if (
			value &&
			typeof value === "object" &&
			"initialToml" in value &&
			value.initialToml === initialToml &&
			"source" in value &&
			typeof value.source === "string" &&
			"exported" in value &&
			(value.exported === null || typeof value.exported === "string")
		)
			return value as SidecarDraft;
	} catch {
		// A disabled storage API must not prevent editing.
	}
}

export function storeSidecarDraft(storage: DraftStorage, rigSlug: string, draft: SidecarDraft) {
	try {
		const key = `${STORAGE_PREFIX}${rigSlug}`;
		if (draft.source === draft.initialToml) storage.removeItem(key);
		else storage.setItem(key, JSON.stringify(draft));
	} catch {
		// The in-memory draft remains editable when storage is unavailable.
	}
}
