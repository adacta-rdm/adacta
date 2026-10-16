import * as inventoryRoute from "~/app/routes/inventory.tsx";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Returns the entries that the inventory sidebar lists, in the order of the
 * tree. A test checks there whether a write added or kept an entry.
 */
export async function listedInventory(scope: ServiceContainer) {
	const result = await testRoute(scope, inventoryRoute, {}).loader();

	return (result.data?.buildings ?? []).flatMap((building) =>
		building.rooms.flatMap((room) => room.entries),
	);
}
