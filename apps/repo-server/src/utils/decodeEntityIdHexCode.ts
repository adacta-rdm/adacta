import assert from "node:assert";

export function decodeEntityIdHexCode(id: string): number {
	assert(
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id),
		`decodeEntityIdHexCode: id is not a UUID: ${id}`
	);
	return Number.parseInt(id[16] + id[17], 16);
}
