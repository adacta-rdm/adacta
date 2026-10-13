import { describe, expect, test } from "bun:test";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	maximumSizeForPIDSymbol,
	pidInstrumentPresets,
	searchPIDSymbolGroups,
} from "~/app/components/PIDSymbol.tsx";
import {
	connectedPIDPortIds,
	pidHandleMarker,
	pidHandleOffset,
	rotatePIDPort,
	type PIDPort,
} from "~/app/components/pid-symbols/ConnectablePIDSymbol.tsx";
import {
	JunctionSymbol,
	junctionArmsForNode,
	junctionPath,
} from "~/app/components/pid-symbols/JunctionSymbol.tsx";
import {
	ThreeWayValveSymbol,
	threeWayValvePorts,
} from "~/app/components/pid-symbols/ThreeWayValveSymbol.tsx";

describe("maximumSizeForPIDSymbol", () => {
	test("uses the footprint target when no context size is supplied", () => {
		expect(maximumSizeForPIDSymbol("gas-bottle")).toBe(56);
		expect(maximumSizeForPIDSymbol("pump")).toBe(40);
		expect(maximumSizeForPIDSymbol("valve")).toBe(32);
		expect(maximumSizeForPIDSymbol("junction")).toBe(20);
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

describe("JunctionSymbol", () => {
	test("shows a faint cross before a connection is added", () => {
		const markup = renderToStaticMarkup(createElement(JunctionSymbol, { connectedArms: [] }));

		expect(markup).toContain("pid-symbol-drawing opacity-30");
		expect(markup).toContain('d="M 0 10 H 10 M 10 0 V 10 M 10 10 H 20 M 10 10 V 20"');
	});

	test("draws each arm with its connected line kind and weight", () => {
		const markup = renderToStaticMarkup(
			createElement(JunctionSymbol, {
				connectedArms: [
					{ portId: "inlet", kind: "jacketed", weight: 2, outgoing: false },
					{ portId: "outlet", kind: "traced", weight: 1, outgoing: true },
				],
			}),
		);

		expect(markup).toContain('viewBox="0 0 20 20"');
		expect(markup).toContain('style="stroke-width:2"');
		expect(markup).toContain("stroke-dasharray=");
		expect(markup).toContain('d="M -8 10');
		expect(markup).not.toContain("<circle");
	});
});

describe("junctionPath", () => {
	test("draws only the arms with connected ports", () => {
		expect(junctionPath(["inlet", "outlet"])).toBe("M 0 10 H 10 M 10 10 H 20");
		expect(junctionPath(["inlet", "branch-inlet", "outlet"])).toBe(
			"M 0 10 H 10 M 10 0 V 10 M 10 10 H 20",
		);
		expect(junctionPath(["branch-inlet", "outlet"])).toBe("M 10 0 V 10 M 10 10 H 20");
	});

	test("draws no arm without a connection", () => {
		expect(junctionPath([])).toBe("");
	});

	test("extends an arm to a handle centered on the boundary", () => {
		expect(junctionPath(["inlet", "branch"], 4)).toBe("M -4 10 H 10 M 10 10 V 24");
	});
});

describe("junctionArmsForNode", () => {
	test("uses each edge's kind and weight at its junction handle", () => {
		const edges = [
			{
				source: "feed",
				sourceHandle: "outlet",
				target: "junction",
				targetHandle: "inlet",
				data: { kind: "jacketed" as const, weight: 2 },
			},
			{
				source: "junction",
				sourceHandle: "outlet",
				target: "reactor",
				targetHandle: "inlet",
				data: { kind: "traced" as const, weight: 1 },
			},
		];

		const arms = junctionArmsForNode(edges, "junction");

		expect(arms).toEqual([
			{ portId: "inlet", kind: "jacketed", weight: 2, outgoing: false },
			{ portId: "outlet", kind: "traced", weight: 1, outgoing: true },
		]);
	});
});

describe("P&ID symbol search", () => {
	const cases = [
		["MFC", ["instrument"]],
		["MFM", ["instrument"]],
		["Mass flow controller", ["instrument"]],
		["FIRC", ["instrument"]],
		["pressure gauge", ["instrument"]],
		["gas-cylinder", ["gas-bottle"]],
		["pressure vessel", ["horizontal-vessel", "vertical-vessel"]],
		["packed tower", ["fluid-contacting-column"]],
		["plate column", ["tray-column"]],
		["three way valve", ["three-way-valve"]],
		["non return valve", ["check-valve"]],
		["metering valve", ["needle-valve"]],
		["pressure regulator", ["pressure-reducing-valve"]],
		["gravity damper", ["backdraft-damper"]],
		["PHE", ["plate-heat-exchanger"]],
		["fixed tube sheet heat exchanger", ["straight-tube-heat-exchanger"]],
		["sight glass", ["viewing-glass"]],
		["flow indicator", ["instrument", "viewing-glass"]],
		["Exhaust", ["covered-gas-vent", "curved-gas-vent"]],
	] as const;

	for (const [query, kinds] of cases) {
		test(`finds ${kinds.join(" and ")} for ${query}`, () => {
			const results = searchPIDSymbolGroups(query).flatMap((group) => group.symbols);

			expect(results.map((symbol) => symbol.kind)).toEqual([...kinds]);
		});
	}

	for (const preset of pidInstrumentPresets) {
		test(`finds only Instrument for the complete ${preset.code} code`, () => {
			const results = searchPIDSymbolGroups(preset.code).flatMap((group) => group.symbols);

			expect(results.map((symbol) => symbol.kind)).toEqual(["instrument"]);
			expect(results[0]?.matchedAlias).toBe(preset.code);
		});
	}

	test("shows the alias that matched a symbol", () => {
		const results = searchPIDSymbolGroups("Exhaust").flatMap((group) => group.symbols);

		expect(results[0]?.matchedAlias).toBe("exhaust");
	});

	test("keeps canonical matches ahead of aliases", () => {
		const results = searchPIDSymbolGroups("check valve").flatMap((group) => group.symbols);

		expect(results.map((symbol) => symbol.kind)).toEqual(["check-valve"]);
		expect(results[0]?.matchedAlias).toBeUndefined();
	});

	test("does not equate pressure relief and pressure reduction", () => {
		const results = searchPIDSymbolGroups("pressure relief valve");

		expect(results).toEqual([]);
	});

	test("keeps canonical results when the filter is blank", () => {
		const results = searchPIDSymbolGroups("  ").flatMap((group) => group.symbols);

		expect(results.map((symbol) => symbol.kind)).toContain("instrument");
		expect(results.map((symbol) => symbol.kind)).toContain("covered-gas-vent");
		expect(results.every((symbol) => symbol.matchedAlias === undefined)).toBe(true);
	});
});
