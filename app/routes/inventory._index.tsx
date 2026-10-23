import { eq } from "drizzle-orm";
import { Link, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { ListPanel, ListEmpty, ListView } from "~/app/components/ListPanel.tsx";
import { ListTable, ListTableHead } from "~/app/components/ListTable.tsx";
import { formatLocation } from "~/app/lib/location.ts";
import { ListFilter } from "~/app/route-components/ListFilter.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";

import type { Route } from "./+types/inventory._index.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const linkClassName =
	"font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus";

export async function loader({ context, request }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const query = new URL(request.url).searchParams.get("q") ?? "";
	const params = new URL(request.url).searchParams;
	const showArchived = {
		rigs: params.get("rigs") === "archived",
		equipment: params.get("equipment") === "archived",
	};
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);

	// Location is optional. Both lists include entries without a building or room.
	const rigs = await db
		.select({
			id: Rig.id,
			slug: Rig.slug,
			name: Rig.name,
			archivedAt: Rig.metadataArchivedAt,
			location: { building: Rig.building, room: Rig.room, position: Rig.position },
		})
		.from(Rig);

	const equipment = await db
		.select({
			id: Equipment.id,
			slug: Equipment.slug,
			name: Product.name,
			serialNumber: Equipment.serialNumber,
			archivedAt: Equipment.metadataArchivedAt,
			location: {
				building: Equipment.building,
				room: Equipment.room,
				position: Equipment.position,
			},
			product: {
				manufacturerSlug: Manufacturer.slug,
				manufacturerName: Manufacturer.name,
				productSlug: Product.slug,
				productNumber: Product.productNumber,
				subtitle: Product.subtitle,
			},
		})
		.from(Equipment)
		.innerJoin(Product, eq(Product.id, Equipment.productId))
		.innerJoin(Manufacturer, eq(Manufacturer.id, Product.manufacturerId));

	// Each word may match a different field. For example, "B3 balance" matches
	// a balance whose recorded building is B3.
	function matches(values: (string | null)[]) {
		const text = values.filter(Boolean).join(" ").toLowerCase();

		return words.every((word) => text.includes(word));
	}

	return {
		query,
		showArchived,
		counts: {
			rigs: {
				active: rigs.filter((entry) => entry.archivedAt === null).length,
				archived: rigs.filter((entry) => entry.archivedAt !== null).length,
			},
			equipment: {
				active: equipment.filter((entry) => entry.archivedAt === null).length,
				archived: equipment.filter((entry) => entry.archivedAt !== null).length,
			},
		},
		rigs: rigs
			.filter((rig) => (rig.archivedAt !== null) === showArchived.rigs)
			.filter((rig) => matches([rig.name, formatLocation(rig.location)]))
			.sort((left, right) => collator.compare(left.name, right.name)),
		equipment: equipment
			.filter((entry) => (entry.archivedAt !== null) === showArchived.equipment)
			.filter((entry) =>
				matches([
					entry.name,
					entry.serialNumber,
					formatLocation(entry.location),
					entry.product.manufacturerName,
					entry.product.productNumber,
					entry.product.subtitle,
				]),
			)
			.sort(
				(left, right) =>
					collator.compare(left.name, right.name) ||
					collator.compare(left.serialNumber ?? "", right.serialNumber ?? ""),
			),
	};
}

export default function InventoryIndex({ loaderData }: Route.ComponentProps) {
	const { rigs, equipment, query, showArchived, counts } = loaderData;
	const navigation = useNavigation();
	const searching = navigation.state !== "idle";

	// Each tab link retains the other panel's selection and the shared query.
	const archiveFor = (kind: "rigs" | "equipment") => {
		const address = (archived: boolean) => {
			const params = new URLSearchParams();
			if (query) params.set("q", query);

			for (const panel of ["rigs", "equipment"] as const) {
				if (panel === kind ? archived : showArchived[panel]) params.set(panel, "archived");
			}

			return `/inventory${params.size ? `?${params}` : ""}`;
		};

		return {
			active: { to: address(false), count: counts[kind].active },
			archived: { to: address(true), count: counts[kind].archived },
			showArchived: showArchived[kind],
		};
	};

	return (
		<div className="space-y-6">
			<div>
				<Heading>Inventory</Heading>
				<Subheading className="mt-1">Custom rigs and standalone equipment.</Subheading>
			</div>

			<div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
				<Link to="/inventory/new" className={linkClassName}>
					Add inventory item
				</Link>
				<Link to="/catalog" className={linkClassName}>
					Import from catalog
				</Link>
			</div>

			<ListView
				filter={
					<ListFilter
						id="inventory-filter"
						label="Filter inventory"
						placeholder="Name, serial number, model, or location"
						query={query}
						hiddenFields={{
							...(showArchived.rigs ? { rigs: "archived" } : {}),
							...(showArchived.equipment ? { equipment: "archived" } : {}),
						}}
					/>
				}
			>
				<div className="space-y-3">
					<Subheading>Rigs</Subheading>
					<ListPanel label="Rigs" busy={searching} archive={archiveFor("rigs")}>
						{rigs.length === 0 ? (
							<ListEmpty>
								{query.trim()
									? "No rigs match the filter."
									: showArchived.rigs
										? "No rigs have been archived."
										: "No rigs have been recorded yet."}
							</ListEmpty>
						) : (
							<ListTable label="Rigs">
								<ListTableHead>
									<tr>
										<th scope="col">Name</th>
										<th scope="col">Location</th>
									</tr>
								</ListTableHead>
								<tbody className="divide-y divide-border">
									{rigs.map((rig) => (
										<tr key={rig.id} className="hover:bg-surface-muted">
											<th scope="row" className="py-3 pr-4 pl-5 text-left font-normal">
												{showArchived.rigs ? (
													<span className="font-medium">{rig.name}</span>
												) : (
													<Link to={`/inventory/rigs/${rig.slug}`} className={linkClassName}>
														{rig.name}
													</Link>
												)}
											</th>
											<td className="py-3 pr-4 text-foreground-muted">
												{formatLocation(rig.location) || "No location recorded"}
											</td>
										</tr>
									))}
								</tbody>
							</ListTable>
						)}
					</ListPanel>
				</div>
				<div className="space-y-3">
					<Subheading>Equipment</Subheading>
					<ListPanel label="Equipment" busy={searching} archive={archiveFor("equipment")}>
						{equipment.length === 0 ? (
							<ListEmpty>
								{query.trim()
									? "No equipment matches the filter."
									: showArchived.equipment
										? "No equipment has been archived."
										: "No equipment has been recorded yet."}
							</ListEmpty>
						) : (
							<ListTable label="Equipment">
								<ListTableHead>
									<tr>
										<th scope="col">Equipment</th>
										<th scope="col">Catalog model</th>
										<th scope="col">Location</th>
									</tr>
								</ListTableHead>
								<tbody className="divide-y divide-border">
									{equipment.map((entry) => (
										<tr key={entry.id} className="hover:bg-surface-muted">
											<th scope="row" className="py-3 pr-4 pl-5 text-left font-normal">
												{showArchived.equipment ? (
													<span className="font-medium">{entry.name}</span>
												) : (
													<Link to={`/inventory/equipment/${entry.slug}`} className={linkClassName}>
														{entry.name}
													</Link>
												)}
											</th>
											<td className="py-3 pr-4">
												<Link
													to={`/catalog/${entry.product.manufacturerSlug}/${entry.product.productSlug}`}
													className={linkClassName}
												>
													{entry.product.productNumber ?? entry.name}
												</Link>
												<p className="text-foreground-muted">{entry.product.manufacturerName}</p>
											</td>
											<td className="py-3 pr-4 text-foreground-muted">
												{formatLocation(entry.location) || "No location recorded"}
											</td>
										</tr>
									))}
								</tbody>
							</ListTable>
						)}
					</ListPanel>
				</div>
			</ListView>
		</div>
	);
}
