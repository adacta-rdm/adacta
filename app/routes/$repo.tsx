import { Outlet } from "react-router";

import { groupByLocation, listInventory } from "~/app/data/inventory";
import { AppLayout } from "~/app/layout/AppLayout";

/**
 * Repository scope.
 *
 * The sidebar is shared by every section. The inventory tree is therefore loaded here
 * rather than inside the inventory section.
 */
export function loader() {
	return { buildings: groupByLocation(listInventory()) };
}

export default function Repository({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
	return (
		<AppLayout buildings={loaderData.buildings}>
			<Outlet />
		</AppLayout>
	);
}
