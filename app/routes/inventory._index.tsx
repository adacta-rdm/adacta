import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { eq, isNull } from "drizzle-orm";
import { useEffect } from "react";
import { Form, Link, useNavigation, useSubmit } from "react-router";

import { services } from "~/app/.server/context.ts";
import { KindIcon } from "~/app/components/KindIcon.tsx";
import { formatLocation } from "~/app/lib/location.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Badge } from "~/catalyst-ui/badge.tsx";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { InventoryEntryProduct } from "~/drizzle/schema/InventoryEntryProduct.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";

import type { Route } from "./+types/inventory._index.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export async function loader({ context, request }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);

	let rows = await db
		.select({ entry: InventoryEntry, product: Product, manufacturer: Manufacturer })
		.from(InventoryEntry)
		.leftJoin(InventoryEntryProduct, eq(InventoryEntryProduct.inventoryEntryId, InventoryEntry.id))
		.leftJoin(Product, eq(Product.id, InventoryEntryProduct.productId))
		.leftJoin(Manufacturer, eq(Manufacturer.id, Product.manufacturerId))
		.where(isNull(InventoryEntry.metadataArchivedAt))
		.all();

	const query = new URL(request.url).searchParams.get("q");
	const words = query ? query.toLowerCase().split(/\s+/).filter(Boolean) : [];
	if (words.length > 0) {
		rows = rows.filter(({ entry, product, manufacturer }) => {
			const location = formatLocation({
				building: entry.locationBuildingIdentifier,
				room: entry.locationRoomIdentifier,
				label: entry.locationLabel,
			});
			const haystack = [
				entry.name,
				entry.serialNumber,
				location,
				product?.name,
				product?.productNumber,
				product?.subtitle,
				manufacturer?.name,
			]
				.filter(Boolean)
				.join(" ")
				.toLowerCase();

			return words.every((word) => haystack.includes(word));
		});
	}

	rows.sort((left, right) => collator.compare(left.entry.name, right.entry.name));

	return {
		entries: rows.map(({ entry, product, manufacturer }) => ({
			id: entry.id,
			slug: entry.slug,
			name: entry.name,
			kind: entry.kind,
			serialNumber: entry.serialNumber,
			location: {
				building: entry.locationBuildingIdentifier,
				room: entry.locationRoomIdentifier,
				label: entry.locationLabel,
			},
			product:
				product && manufacturer
					? {
							manufacturerSlug: manufacturer.slug,
							manufacturerName: manufacturer.name,
							productSlug: product.slug,
							name: product.name,
							productNumber: product.productNumber,
							imageFileId: product.imageFileId,
							origin: product.origin,
						}
					: null,
		})),
		query,
	};
}

export default function InventoryIndex({ loaderData }: Route.ComponentProps) {
	const { entries, query } = loaderData;
	const navigation = useNavigation();
	const submit = useSubmit();
	const searching = navigation.location && new URLSearchParams(navigation.location.search).has("q");

	useEffect(() => {
		const searchField = document.getElementById("q");
		if (searchField instanceof HTMLInputElement) searchField.value = query || "";
	}, [query]);

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
				<div>
					<Heading>Inventory</Heading>
					<Subheading className="mt-1">Custom rigs and standalone equipment.</Subheading>
				</div>
				<div className="flex items-center gap-4 text-sm text-foreground-muted">
					<p role="status">{entries.length} entries</p>
					<Link
						to={`/inventory/new`}
						className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
					>
						Add equipment
					</Link>
				</div>
			</div>

			<div className="relative">
				<Form
					role="search"
					onChange={(event) => submit(event.currentTarget, { replace: query !== null })}
				>
					<span className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2">
						<MagnifyingGlassIcon
							className={clsx(
								"size-5 text-foreground-muted transition-opacity",
								searching && "opacity-0",
							)}
						/>
						<span
							aria-hidden
							className={clsx(
								"absolute inset-0 rounded-full border-2 border-border border-t-foreground opacity-0 transition-opacity",
								searching && "animate-spin opacity-100 delay-300",
							)}
						/>
					</span>
					<input
						id="q"
						name="q"
						type="text"
						defaultValue={query ?? ""}
						placeholder="Filter by entry, serial number, model, or location"
						aria-label="Filter the inventory"
						className={clsx(
							"w-full rounded-lg border border-border bg-surface py-2 pr-10 pl-10 text-sm text-foreground placeholder:text-foreground-muted focus:border-focus focus:outline-none",
							searching && "text-foreground-muted",
						)}
					/>
					{query ? (
						<button
							type="button"
							aria-label="Clear the filter"
							onClick={(event) => {
								const form = event.currentTarget.form;
								if (!form) return;

								const field = form.elements.namedItem("q");
								if (field instanceof HTMLInputElement) field.value = "";
								void submit(form, { replace: true });
							}}
							className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
						>
							<XMarkIcon className="size-4" />
						</button>
					) : null}
				</Form>
			</div>

			<div className={clsx("transition-opacity", searching && "opacity-40 delay-300")}>
				{entries.length === 0 ? (
					<Text>Nothing matches “{query}”.</Text>
				) : (
					<div className="overflow-x-auto rounded-xl border border-border bg-surface">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-border text-xs font-medium text-foreground-muted">
								<tr>
									<th scope="col" className="w-10 py-2 pl-3" />
									<th scope="col" className="py-2 pr-4">
										Inventory entry
									</th>
									<th scope="col" className="py-2 pr-4">
										Catalog model
									</th>
									<th scope="col" className="py-2 pr-4">
										Serial number
									</th>
									<th scope="col" className="py-2 pr-4">
										Location
									</th>
									<th scope="col" className="py-2 pr-4">
										Type
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-border">
								{entries.map((entry) => (
									<tr key={entry.id}>
										<td className="py-1.5 pl-3">
											<div className="flex size-8 items-center justify-center rounded bg-surface-muted">
												{entry.product?.imageFileId ? (
													<img
														src={`/files/originals/${entry.product.imageFileId}`}
														alt=""
														className="max-h-full max-w-full object-contain p-0.5"
													/>
												) : (
													<KindIcon kind={entry.kind} className="size-5 text-foreground-muted" />
												)}
											</div>
										</td>
										<th scope="row" className="py-1.5 pr-4 font-normal">
											<Link
												to={`/inventory/${entry.slug}`}
												className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
											>
												{entry.name}
											</Link>
										</th>
										<td className="py-1.5 pr-4">
											{entry.product ? (
												<div>
													<Link
														to={`/catalog/${entry.product.manufacturerSlug}/${entry.product.productSlug}`}
														className="text-foreground hover:text-link focus-visible:outline-2 focus-visible:outline-focus"
													>
														{entry.product.name}
													</Link>
													<p className="font-mono text-xs text-foreground-muted">
														{entry.product.manufacturerName} ·{" "}
														{entry.product.productNumber ?? "Model number not recorded"}
													</p>
													{entry.product.origin === "user" ? (
														<Badge color="amber" className="mt-1">
															User entered
														</Badge>
													) : null}
												</div>
											) : (
												<span className="text-foreground-muted">—</span>
											)}
										</td>
										<td className="py-1.5 pr-4 font-mono text-foreground-muted">
											{entry.serialNumber ?? "—"}
										</td>
										<td className="py-1.5 pr-4 text-foreground-muted">
											{formatLocation(entry.location) || "—"}
										</td>
										<td className="py-1.5 pr-4">
											<Badge color={entry.kind === "rig" ? "cyan" : "zinc"}>
												{entry.kind === "rig" ? "Rig" : "Equipment"}
											</Badge>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
