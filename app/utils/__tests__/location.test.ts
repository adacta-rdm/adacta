import { describe, expect, test } from "bun:test";

import { formatLocation, groupByLocation, type Location } from "~/app/utils/location";

function location(parts: Partial<Location> = {}): Location {
	return { building: null, room: null, label: null, ...parts };
}

describe("formatLocation", () => {
	test("joins label, building and room", () => {
		expect(formatLocation(location({ label: "Bench 2", building: "B3", room: "101" }))).toBe(
			"Bench 2 · Building B3 · Room 101",
		);
	});

	test("omits the parts that are missing", () => {
		expect(formatLocation(location({ building: "B3", room: "102" }))).toBe(
			"Building B3 · Room 102",
		);
	});

	test("returns an empty string when nothing is known", () => {
		expect(formatLocation(location())).toBe("");
	});

	test("ignores blank strings", () => {
		expect(formatLocation(location({ label: "", building: "B3" }))).toBe("Building B3");
	});
});

type Entry = { name: string; location: Location };

function entry(name: string, parts: Partial<Location> = {}): Entry {
	return { name, location: location(parts) };
}

/**
 * Flatten a tree to "building/room/name" strings for readable assertions.
 */
function flatten(buildings: ReturnType<typeof groupByLocation<Entry>>): string[] {
	return buildings.flatMap((building) =>
		building.rooms.flatMap((room) =>
			room.entries.map((e) => `${building.identifier ?? "-"}/${room.identifier ?? "-"}/${e.name}`),
		),
	);
}

describe("groupByLocation", () => {
	test("returns nothing for no entries", () => {
		expect(groupByLocation([])).toEqual([]);
	});

	test("nests an entry under its building and room", () => {
		expect(flatten(groupByLocation([entry("Rig", { building: "B3", room: "101" })]))).toEqual([
			"B3/101/Rig",
		]);
	});

	test("puts entries sharing a room together", () => {
		const entries = [
			entry("Rig A", { building: "B3", room: "101" }),
			entry("Rig B", { building: "B3", room: "101" }),
		];

		expect(groupByLocation(entries)).toHaveLength(1);
		expect(groupByLocation(entries)[0]?.rooms).toHaveLength(1);
	});

	test("sorts buildings and rooms numerically, not alphabetically", () => {
		const entries = [
			entry("Ten", { building: "B10", room: "10" }),
			entry("Two", { building: "B2", room: "2" }),
		];

		expect(flatten(groupByLocation(entries))).toEqual(["B2/2/Two", "B10/10/Ten"]);
	});

	test("sorts entries within a room by name", () => {
		const entries = [
			entry("Zeta", { building: "B3", room: "101" }),
			entry("alpha", { building: "B3", room: "101" }),
		];

		expect(flatten(groupByLocation(entries))).toEqual(["B3/101/alpha", "B3/101/Zeta"]);
	});

	test("sorts entries without a building last", () => {
		const entries = [entry("Spare"), entry("Rig", { building: "B3", room: "101" })];

		expect(flatten(groupByLocation(entries))).toEqual(["B3/101/Rig", "-/-/Spare"]);
	});

	test("sorts a room-less entry last within its building", () => {
		const entries = [
			entry("Loose", { building: "B3" }),
			entry("Placed", { building: "B3", room: "101" }),
		];

		expect(flatten(groupByLocation(entries))).toEqual(["B3/101/Placed", "B3/-/Loose"]);
	});

	test("treats blank and whitespace identifiers as unassigned", () => {
		expect(flatten(groupByLocation([entry("Spare", { building: "  ", room: "" })]))).toEqual([
			"-/-/Spare",
		]);
	});
});
