/**
 * Inventory entries and their location hierarchy.
 *
 * Fixture data for now. Only the bodies of these functions change when the
 * database lands; routes stay untouched.
 *
 * An entry is a physical thing that sits somewhere in the lab. Two kinds:
 *
 *   rig        custom built, has a P&ID
 *   equipment  standalone vendor equipment, has a location but no P&ID
 *
 * NAMING: "entry" is a placeholder. The term for this concept has not been
 * chosen yet. "Facility" is deliberately not used.
 */

export type InventoryKind = "rig" | "equipment";

export type Location = {
	building: string | null;
	room: string | null;
	label: string | null;
};

export type InventoryEntry = {
	id: string;
	name: string;
	kind: InventoryKind;
	location: Location;
};

const entries: InventoryEntry[] = [
	{
		id: "ammonia-rig",
		name: "Ammonia Synthesis Rig",
		kind: "rig",
		location: { building: "B3", room: "101", label: "Bench 2" },
	},
	{
		id: "so2-rig",
		name: "SO2 Oxidation Rig",
		kind: "rig",
		location: { building: "B3", room: "101", label: null },
	},
	{
		id: "analytical-balance",
		name: "Analytical Balance XS205",
		kind: "equipment",
		location: { building: "B3", room: "102", label: null },
	},
	{
		id: "micro-gc",
		name: "Micro GC 490",
		kind: "equipment",
		location: { building: "B3", room: "102", label: "Cabinet A" },
	},
	{
		id: "methanation-rig",
		name: "Methanation Test Stand",
		kind: "rig",
		location: { building: "B7", room: "12", label: null },
	},
	{
		id: "spare-mfc",
		name: "Mass Flow Controller (spare)",
		kind: "equipment",
		location: { building: null, room: null, label: null },
	},
];

export function listInventory(): InventoryEntry[] {
	return entries;
}

export function findInventoryEntry(id: string): InventoryEntry | undefined {
	return entries.find((entry) => entry.id === id);
}

export function formatLocation(location: Location): string {
	return [
		location.label,
		location.building ? `Building ${location.building}` : undefined,
		location.room ? `Room ${location.room}` : undefined,
	]
		.filter((part): part is string => Boolean(part))
		.join(" · ");
}

export type Room = { identifier: string | null; entries: InventoryEntry[] };
export type Building = { identifier: string | null; rooms: Room[] };

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * Entries without a building or room sort last, under an "Unassigned" bucket.
 */
function compareIdentifiers(left: string | null, right: string | null): number {
	if (left === null) return right === null ? 0 : 1;
	if (right === null) return -1;
	return collator.compare(left, right);
}

/**
 * Group entries into the Building -> Room -> Entry tree used by the sidebar.
 */
export function groupByLocation(list: InventoryEntry[]): Building[] {
	const buildings = new Map<string | null, Map<string | null, InventoryEntry[]>>();

	for (const entry of list) {
		const building = entry.location.building?.trim() || null;
		const room = entry.location.room?.trim() || null;

		const rooms = buildings.get(building) ?? new Map<string | null, InventoryEntry[]>();
		const roomEntries = rooms.get(room) ?? [];

		roomEntries.push(entry);
		rooms.set(room, roomEntries);
		buildings.set(building, rooms);
	}

	return [...buildings]
		.sort(([left], [right]) => compareIdentifiers(left, right))
		.map(([identifier, rooms]) => ({
			identifier,
			rooms: [...rooms]
				.sort(([left], [right]) => compareIdentifiers(left, right))
				.map(([roomIdentifier, roomEntries]) => ({
					identifier: roomIdentifier,
					entries: [...roomEntries].sort((left, right) => collator.compare(left.name, right.name)),
				})),
		}));
}
