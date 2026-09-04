/**
 * Where something stands in the laboratory. Also how to present a set of them.
 *
 * Identifiers are organization-specific and often alphanumeric ("B3", "101a"),
 * so they are text rather than numbers.
 */

export type Location = {
	building: string | null;
	room: string | null;
	label: string | null;
};

/**
 * Anything that sits somewhere and has a name.
 */
export type Located = { name: string; location: Location };

/**
 * One line describing a location, most specific part first.
 */
export function formatLocation(location: Location): string {
	return [
		location.label,
		location.building ? `Building ${location.building}` : undefined,
		location.room ? `Room ${location.room}` : undefined,
	]
		.filter((part): part is string => Boolean(part))
		.join(" · ");
}

export type Room<T extends Located> = { identifier: string | null; entries: T[] };
export type Building<T extends Located> = { identifier: string | null; rooms: Room<T>[] };

/**
 * Group into the Building -> Room -> entry tree the sidebar renders.
 *
 * Generic over the entry so this helper never has to know what is being placed.
 */
export function groupByLocation<T extends Located>(entries: T[]): Building<T>[] {
	const buildings = new Map<string | null, Map<string | null, T[]>>();

	for (const entry of entries) {
		const building = identifier(entry.location.building);
		const room = identifier(entry.location.room);

		const rooms = buildings.get(building) ?? new Map<string | null, T[]>();
		const roomEntries = rooms.get(room) ?? [];

		roomEntries.push(entry);
		rooms.set(room, roomEntries);
		buildings.set(building, rooms);
	}

	return [...buildings]
		.sort(([left], [right]) => compareIdentifiers(left, right))
		.map(([id, rooms]) => ({
			identifier: id,
			rooms: [...rooms]
				.sort(([left], [right]) => compareIdentifiers(left, right))
				.map(([roomId, roomEntries]) => ({
					identifier: roomId,
					entries: [...roomEntries].sort((left, right) => collator.compare(left.name, right.name)),
				})),
		}));
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * Blank and whitespace-only identifiers mean "unassigned".
 */
function identifier(value: string | null): string | null {
	return value?.trim() || null;
}

/**
 * Unassigned sorts last. A real building therefore never appears below one.
 */
function compareIdentifiers(left: string | null, right: string | null): number {
	if (left === null) return right === null ? 0 : 1;
	if (right === null) return -1;

	return collator.compare(left, right);
}
