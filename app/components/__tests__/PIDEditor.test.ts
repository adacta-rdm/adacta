import { describe, expect, test } from "bun:test";

import { connectionDrawing } from "~/app/components/PIDEditor.tsx";
import { getPIDAnchorAlignment, type PIDHelperAnchor } from "~/app/components/PIDHelperLines.tsx";

describe("P&ID connection drawing", () => {
	test("draws electrical wiring with scaled dashes", () => {
		expect(connectionDrawing("M 0 0 L 40 0", "electrical", 1, false)).toEqual({
			lines: [{ path: "M 0 0 L 40 0", dashes: "5 3" }],
		});
		expect(connectionDrawing("M 0 0 L 40 0", "electrical", 3, false)).toEqual({
			lines: [{ path: "M 0 0 L 40 0", dashes: "15 9" }],
		});
	});
});

describe("P&ID symbol-center alignment", () => {
	test("selects the nearest symbol center on each axis", () => {
		const moving = anchor({ nodeId: "moving", x: 96, y: 104 });
		const stationary = [
			anchor({ nodeId: "vertical", x: 100, y: 300 }),
			anchor({ nodeId: "horizontal", x: 500, y: 101 }),
			anchor({ nodeId: "horizontal-other", x: 300, y: 101 }),
		];

		expect(getPIDAnchorAlignment([moving], stationary, 5)).toEqual({
			delta: { x: 4, y: -3 },
			lines: {
				horizontal: {
					moving: { ...moving, x: 100, y: 101 },
					stationary: stationary[1],
					alignedStationary: [stationary[1], stationary[2]],
				},
				vertical: {
					moving: { ...moving, x: 100, y: 101 },
					stationary: stationary[0],
					alignedStationary: [stationary[0]],
				},
			},
		});
	});

	test("aligns symbols regardless of their connection types", () => {
		const moving = anchor({ nodeId: "moving", x: 96, y: 104 });
		const stationary = anchor({ nodeId: "stationary", x: 100, y: 100 });

		expect(getPIDAnchorAlignment([moving], [stationary], 5)).toEqual({
			delta: { x: 4, y: -4 },
			lines: {
				horizontal: {
					moving: { ...moving, x: 100, y: 100 },
					stationary,
					alignedStationary: [stationary],
				},
				vertical: {
					moving: { ...moving, x: 100, y: 100 },
					stationary,
					alignedStationary: [stationary],
				},
			},
		});
	});

	test("does not align beyond the threshold", () => {
		const moving = anchor({ nodeId: "moving", x: 94, y: 106 });
		const stationary = anchor({ nodeId: "stationary", x: 100, y: 100 });

		expect(getPIDAnchorAlignment([moving], [stationary], 5)).toEqual({
			delta: { x: 0, y: 0 },
			lines: { horizontal: undefined, vertical: undefined },
		});
	});

	test("aligns a fractional vessel center with a round symbol", () => {
		const moving = anchor({ nodeId: "vessel", x: 94.7, y: 105.3 });
		const stationary = [anchor({ nodeId: "instrument", x: 100, y: 100 })];

		const delta = getPIDAnchorAlignment([moving], stationary, 6).delta;
		expect(delta.x).toBeCloseTo(5.3);
		expect(delta.y).toBeCloseTo(-5.3);
	});
});

function anchor(value: PIDHelperAnchor): PIDHelperAnchor {
	return value;
}
