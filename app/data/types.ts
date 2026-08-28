/**
 * Shapes shared by loaders and components, plus the pure helpers that work on
 * them. No database imports, so this is safe in the browser bundle.
 */

export type Repository = {
	id: number;
	slug: string;
	name: string;
};

export type InventoryKind = "rig" | "equipment";

export type Location = {
	building: string | null;
	room: string | null;
	label: string | null;
};

export type InventoryEntry = {
	id: number;
	name: string;
	kind: InventoryKind;
	location: Location;
};

export type Room = { identifier: string | null; entries: InventoryEntry[] };
export type Building = { identifier: string | null; rooms: Room[] };

export function formatLocation(location: Location): string {
	return [
		location.label,
		location.building ? `Building ${location.building}` : undefined,
		location.room ? `Room ${location.room}` : undefined,
	]
		.filter((part): part is string => Boolean(part))
		.join(" · ");
}

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
