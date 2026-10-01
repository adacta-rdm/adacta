import { describe, expect, test } from "bun:test";

import type { PIDGraph } from "~/app/lib/PID.ts";
import {
	commitPIDHistory,
	createPIDHistory,
	redoPIDHistory,
	undoPIDHistory,
} from "~/app/lib/PIDHistory.ts";

describe("P&ID history", () => {
	test("moves committed graphs through undo and redo", () => {
		const initial = graph("Initial");
		const changed = graph("Changed");
		const history = commitPIDHistory(createPIDHistory(), initial, changed);

		const undone = undoPIDHistory(history, changed);
		expect(undone.graph).toEqual(initial);
		expect(undone.history.past).toHaveLength(0);
		expect(undone.history.future).toEqual([changed]);

		const redone = redoPIDHistory(undone.history, initial);
		expect(redone.graph).toEqual(changed);
		expect(redone.history.past).toEqual([initial]);
		expect(redone.history.future).toHaveLength(0);
	});

	test("does not record a graph that did not change", () => {
		const initial = graph("Initial");

		expect(commitPIDHistory(createPIDHistory(), initial, initial)).toEqual(createPIDHistory());
	});

	test("clears redo entries after a new edit", () => {
		const initial = graph("Initial");
		const changed = graph("Changed");
		const replacement = graph("Replacement");
		const committed = commitPIDHistory(createPIDHistory(), initial, changed);
		const undone = undoPIDHistory(committed, changed);

		const replaced = commitPIDHistory(undone.history, initial, replacement);

		expect(replaced.future).toHaveLength(0);
		expect(replaced.past).toEqual([initial]);
	});

	test("retains only the configured number of entries", () => {
		let history = createPIDHistory();

		for (let index = 0; index < 4; index += 1) {
			history = commitPIDHistory(history, graph(`${index}`), graph(`${index + 1}`), 3);
		}

		expect(history.past.map((entry) => entry.nodes[0]?.label)).toEqual(["1", "2", "3"]);
	});

	test("copies snapshots before storing them", () => {
		const initial = graph("Initial");
		const history = commitPIDHistory(createPIDHistory(), initial, graph("Changed"));

		initial.nodes[0]!.label = "Mutated";

		expect(history.past[0]?.nodes[0]?.label).toBe("Initial");
	});
});

function graph(label: string): PIDGraph {
	return {
		nodes: [
			{
				id: "node-1",
				kind: "pump",
				label,
				secondaryLabel: null,
				parentId: null,
				inletCount: 1,
				orientation: 0,
				position: { x: 0, y: 0 },
			},
		],
		edges: [],
	};
}
