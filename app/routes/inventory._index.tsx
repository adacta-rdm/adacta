import { Link } from "react-router";

import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

/**
 * The sidebar lists every rig and equipment unit by location. This page will
 * later give an overview, for example of recently added entries.
 */
export default function InventoryIndex() {
	return (
		<div className="space-y-5">
			<div>
				<Heading>Inventory</Heading>
				<Subheading className="mt-1">Custom rigs and standalone equipment.</Subheading>
			</div>

			<Text>Open a rig or an equipment unit from the list by location in the sidebar.</Text>

			<div className="flex gap-6 text-sm">
				<Link
					to="/inventory/new"
					className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
				>
					Add inventory item
				</Link>
				<Link
					to="/catalog"
					className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
				>
					Import from catalog
				</Link>
			</div>
		</div>
	);
}
