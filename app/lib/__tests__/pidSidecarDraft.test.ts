import { describe, expect, test } from "bun:test";

import { readSidecarDraft, storeSidecarDraft } from "~/app/lib/pidSidecarDraft.ts";

function storage() {
	const items = new Map<string, string>();
	return {
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => void items.set(key, value),
		removeItem: (key: string) => void items.delete(key),
	};
}

describe("P&ID sidecar draft storage", () => {
	test("restores an edited draft for the same rig and generated skeleton", () => {
		const tab = storage();
		const draft = { initialToml: "generated", source: "edited", exported: null };
		tab.setItem("adacta:pid-sidecar-draft:rig-a", JSON.stringify(draft));

		const result = readSidecarDraft(tab, "rig-a", "generated");

		expect(result).toEqual(draft);
	});

	test("does not restore a draft for another rig", () => {
		const tab = storage();
		tab.setItem(
			"adacta:pid-sidecar-draft:rig-a",
			JSON.stringify({ initialToml: "generated", source: "edited", exported: null }),
		);

		const result = readSidecarDraft(tab, "rig-b", "generated");

		expect(result).toBeUndefined();
	});

	test("does not restore a draft for a changed skeleton", () => {
		const tab = storage();
		tab.setItem(
			"adacta:pid-sidecar-draft:rig-a",
			JSON.stringify({ initialToml: "generated", source: "edited", exported: null }),
		);

		const result = readSidecarDraft(tab, "rig-a", "new skeleton");

		expect(result).toBeUndefined();
	});

	test("clears the stored draft after reset", () => {
		const tab = storage();
		tab.setItem(
			"adacta:pid-sidecar-draft:rig-a",
			JSON.stringify({ initialToml: "generated", source: "edited", exported: null }),
		);

		storeSidecarDraft(tab, "rig-a", {
			initialToml: "generated",
			source: "generated",
			exported: null,
		});

		expect(tab.getItem("adacta:pid-sidecar-draft:rig-a")).toBeNull();
	});
});
