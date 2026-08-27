import { CubeIcon, RectangleGroupIcon } from "@heroicons/react/20/solid";
import { Link, useParams } from "react-router";

import { formatLocation, listInventory } from "~/app/data/inventory";
import { Badge } from "~/catalyst-ui/badge";
import { Heading, Subheading } from "~/catalyst-ui/heading";

export function loader() {
	return { entries: listInventory() };
}

export default function InventoryIndex({ loaderData }: { loaderData: ReturnType<typeof loader> }) {
	const { repo } = useParams();

	return (
		<>
			<Heading>Inventory</Heading>
			<Subheading className="mt-1">
				Custom rigs and standalone equipment in this repository.
			</Subheading>

			<ul className="mt-6 divide-y divide-zinc-950/5 dark:divide-white/10">
				{loaderData.entries.map((entry) => (
					<li key={entry.id}>
						<Link
							to={`/${repo}/inventory/${entry.id}`}
							className="flex items-center gap-3 py-3 hover:bg-zinc-950/[2.5%] dark:hover:bg-white/5"
						>
							{entry.kind === "rig" ? (
								<RectangleGroupIcon className="size-5 shrink-0 fill-zinc-500" />
							) : (
								<CubeIcon className="size-5 shrink-0 fill-zinc-500" />
							)}

							<span className="flex-1 font-medium">{entry.name}</span>

							<span className="text-sm text-zinc-500">
								{formatLocation(entry.location) || "No location"}
							</span>

							<Badge color={entry.kind === "rig" ? "cyan" : "zinc"}>
								{entry.kind === "rig" ? "P&ID" : "Standalone"}
							</Badge>
						</Link>
					</li>
				))}
			</ul>
		</>
	);
}
