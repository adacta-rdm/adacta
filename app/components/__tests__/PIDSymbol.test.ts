import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { maximumSizeForPIDSymbol } from "~/app/components/PIDSymbol.tsx";
import {
	connectedPIDPortIds,
	pidHandleMarker,
	pidHandleOffset,
	rotatePIDPort,
	type PIDPort,
} from "~/app/components/pid-symbols/ConnectablePIDSymbol.tsx";
import { JunctionSymbol, junctionPath } from "~/app/components/pid-symbols/JunctionSymbol.tsx";
import {
	ThreeWayValveSymbol,
	threeWayValvePorts,
} from "~/app/components/pid-symbols/ThreeWayValveSymbol.tsx";

describe("maximumSizeForPIDSymbol", () => {
	test("uses the footprint target when no context size is supplied", () => {
		expect(maximumSizeForPIDSymbol("gas-bottle")).toBe(56);
		expect(maximumSizeForPIDSymbol("pump")).toBe(40);
		expect(maximumSizeForPIDSymbol("valve")).toBe(32);
		expect(maximumSizeForPIDSymbol("junction")).toBe(10);
	});

	test("caps a context size at the footprint target", () => {
		expect(maximumSizeForPIDSymbol("gas-bottle", 72)).toBe(56);
		expect(maximumSizeForPIDSymbol("pump", 36)).toBe(36);
		expect(maximumSizeForPIDSymbol("valve", 48)).toBe(32);
	});

	test("uses the total envelope target for a three-way valve", () => {
		expect(maximumSizeForPIDSymbol("three-way-valve")).toBe(32);
	});
});

describe("three-way valve ports", () => {
	test("uses one inlet and two outlets by default", () => {
		expect(threeWayValvePorts(1)).toEqual([
			{ id: "inlet", type: "target", side: "right", x: 0.86903125, y: 0.5 },
			{ id: "outlet-left", type: "source", side: "top", x: 0.3825625, y: 0.0135 },
			{ id: "outlet-right", type: "source", side: "bottom", x: 0.3825625, y: 0.9865 },
		]);
	});

	test("reverses all handles for two inlets", () => {
		expect(threeWayValvePorts(2)).toEqual([
			{ id: "inlet", type: "source", side: "right", x: 0.86903125, y: 0.5 },
			{ id: "outlet-left", type: "target", side: "top", x: 0.3825625, y: 0.0135 },
			{ id: "outlet-right", type: "target", side: "bottom", x: 0.3825625, y: 0.9865 },
		]);
	});

	test("keeps the original valve proportions", () => {
		const markup = renderToStaticMarkup(createElement(ThreeWayValveSymbol));

		expect(markup).toContain(
			'd="m4.458.432 15.568 31.136H4.458L20.026.432ZM12.242 16l15.567-7.784v15.568z"',
		);
	});
});

describe("P&ID handle positioning", () => {
	test("places a side handle on an inset drawing boundary", () => {
		expect(
			pidHandleOffset({ id: "port", type: "source", side: "right", x: 0.75, y: 0.4 }, false),
		).toEqual({ right: "25%", top: "40%", transform: "translate(0, -50%)" });
	});

	test("leaves a node-boundary handle on the node boundary", () => {
		expect(
			pidHandleOffset({ id: "port", type: "target", side: "left", x: 0, y: 0.5 }, false),
		).toEqual({ left: 0, top: "50%", transform: "translate(0, -50%)" });
	});
});

describe("P&ID handle direction markers", () => {
	const sourceRotations = { top: 270, right: 0, bottom: 90, left: 180 } as const;
	const targetRotations = { top: 90, right: 180, bottom: 270, left: 0 } as const;

	for (const side of ["top", "right", "bottom", "left"] as const) {
		test(`points away from a ${side} source port`, () => {
			expect(pidHandleMarker({ type: "source", side }, false)).toEqual({
				kind: "single",
				rotation: sourceRotations[side],
			});
		});

		test(`points toward a ${side} target port`, () => {
			expect(pidHandleMarker({ type: "target", side }, false)).toEqual({
				kind: "single",
				rotation: targetRotations[side],
			});
		});
	}

	test("uses the rotated port side", () => {
		const port: PIDPort = { id: "inlet", type: "target", side: "top", x: 0.25, y: 0 };
		const rotatedPort = rotatePIDPort(port, 1);

		expect(rotatedPort).toEqual({
			id: "inlet",
			type: "target",
			side: "right",
			x: 1,
			y: 0.25,
		});
		expect(pidHandleMarker(rotatedPort, false).rotation).toBe(180);
	});

	test("uses a two-way marker for bidirectional ports", () => {
		expect(pidHandleMarker({ type: "source", side: "bottom" }, true)).toEqual({
			kind: "bidirectional",
			rotation: 90,
		});
	});

	test("recognizes either edge endpoint and leaves other ports marked", () => {
		const connected = connectedPIDPortIds(
			[
				{
					source: "node",
					sourceHandle: "outlet",
					target: "other",
					targetHandle: "inlet",
				},
				{
					source: "other",
					sourceHandle: "outlet",
					target: "node",
					targetHandle: "branch-inlet",
				},
			],
			"node",
		);
		const ports = ["inlet", "branch-inlet", "outlet", "branch"];

		expect([...connected]).toEqual(["outlet", "branch-inlet"]);
		expect(ports.filter((portId) => !connected.has(portId))).toEqual(["inlet", "branch"]);
	});
});

describe("junctionPath", () => {
	test("shows a faint cross before a connection is added", () => {
		const markup = renderToStaticMarkup(createElement(JunctionSymbol, { connectedPortIds: [] }));

		expect(markup).toContain("pid-symbol-drawing opacity-30");
		expect(markup).toContain('d="M 0 5 H 5 M 5 0 V 5 M 5 5 H 10 M 5 5 V 10"');
	});

	test("draws only the arms with connected ports", () => {
		expect(junctionPath(["inlet", "outlet"])).toBe("M 0 5 H 5 M 5 5 H 10");
		expect(junctionPath(["inlet", "branch-inlet", "outlet"])).toBe(
			"M 0 5 H 5 M 5 0 V 5 M 5 5 H 10",
		);
		expect(junctionPath(["branch-inlet", "outlet"])).toBe("M 5 0 V 5 M 5 5 H 10");
	});

	test("draws no arm without a connection", () => {
		expect(junctionPath([])).toBe("");
	});

	test("extends an arm to a handle centered on the boundary", () => {
		expect(junctionPath(["inlet", "branch"], 4)).toBe("M -4 5 H 5 M 5 5 V 14");
	});
});
