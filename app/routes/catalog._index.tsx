import { eq, isNull } from "drizzle-orm";
import { Link, href, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { ListPanel, ListEmpty, ListView } from "~/app/components/ListPanel.tsx";
import { ListTable, ListTableHead } from "~/app/components/ListTable.tsx";
import { CatalogSelection, useCatalogSelection } from "~/app/route-components/CatalogSelection.tsx";
import { ListFilter } from "~/app/route-components/ListFilter.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { ProductSeries } from "~/drizzle/schema/ProductSeries.ts";

import type { Route } from "./+types/catalog._index.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

/**
 * "Nabertherm" sorts before "NETZSCH", and "B2" before "B10".
 */
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export async function loader({ context, request }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);

	let rows = await db
		.select({
			id: Product.id,
			slug: Product.slug,
			name: Product.name,
			productNumber: Product.productNumber,
			subtitle: Product.subtitle,
			description: Product.description,
			origin: Product.origin,
			imageFileId: Product.imageFileId,
			manufacturerSlug: Manufacturer.slug,
			manufacturerName: Manufacturer.name,
			seriesName: ProductSeries.name,
		})
		.from(Product)
		.innerJoin(Manufacturer, eq(Manufacturer.id, Product.manufacturerId))
		.leftJoin(ProductSeries, eq(ProductSeries.id, Product.seriesId))
		.where(isNull(Product.metadataArchivedAt))
		.all();

	const query = new URL(request.url).searchParams.get("q");
	const words = query ? query.toLowerCase().split(/\s+/).filter(Boolean) : [];
	if (words.length > 0) {
		// Every word of the query must appear somewhere in the row. Typing
		// "bronkhorst 201cv" therefore narrows to that manufacturer's F-201CV
		// controllers, in either order.
		rows = rows.filter((product) => {
			const haystack = [
				product.productNumber,
				product.name,
				product.subtitle,
				product.description,
				product.manufacturerName,
				product.seriesName,
			]
				.join(" ")
				.toLowerCase();

			return words.every((word) => haystack.includes(word));
		});
	}

	rows.sort(
		(left, right) =>
			collator.compare(left.manufacturerName, right.manufacturerName) ||
			collator.compare(left.productNumber ?? left.name, right.productNumber ?? right.name),
	);

	return { products: rows, query };
}

export default function CatalogIndex({ loaderData }: Route.ComponentProps) {
	const { products, query } = loaderData;
	const navigation = useNavigation();
	const { selected, selectionSearch, selectProduct } = useCatalogSelection();

	const searching = navigation.state !== "idle";

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
				<Heading>Catalog</Heading>
				<CatalogSelection />
				<p role="status" className="text-sm text-foreground-muted">
					{products.length} products
				</p>
			</div>

			<ListView
				filter={
					<ListFilter
						id="catalog-filter"
						label="Filter catalog"
						placeholder="Order code, name, or manufacturer"
						query={query ?? ""}
						hiddenFields={{ selected: [...selected] }}
					/>
				}
			>
				<ListPanel label="Catalog products" busy={searching}>
					{products.length === 0 ? (
						<ListEmpty>
							{query?.trim()
								? "No products match the filter."
								: "No products have been recorded yet."}
						</ListEmpty>
					) : (
						<ListTable label="Catalog products">
							<ListTableHead>
								<tr>
									<th scope="col" className="w-10">
										<span className="sr-only">Select</span>
									</th>
									<th scope="col" className="w-10" />
									<th scope="col">Order code</th>
									<th scope="col">Product</th>
									<th scope="col">Series</th>
									<th scope="col">Manufacturer</th>
								</tr>
							</ListTableHead>

							<tbody className="divide-y divide-border">
								{products.map((product) => (
									<tr
										key={`${product.manufacturerSlug}/${product.slug}`}
										className="hover:bg-surface-muted"
									>
										<td className="py-3 pr-4 pl-5">
											<input
												type="checkbox"
												aria-label={`Select ${product.manufacturerName} ${product.productNumber ?? product.name}`}
												checked={selected.has(String(product.id))}
												onChange={(event) => selectProduct(product.id, event.currentTarget.checked)}
											/>
										</td>
										<td className="py-3 pr-4">
											<div className="flex size-8 items-center justify-center rounded bg-surface-muted">
												{product.imageFileId !== null && (
													<img
														src={href("/files/originals/:fileId", {
															fileId: String(product.imageFileId),
														})}
														alt=""
														className="max-h-full max-w-full object-contain p-0.5"
													/>
												)}
											</div>
										</td>

										<th scope="row" className="py-3 pr-4 font-normal">
											<Link
												to={`/catalog/${product.manufacturerSlug}/${product.slug}?${selectionSearch}`}
												className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
											>
												{product.productNumber ?? "Not recorded"}
											</Link>
										</th>

										<td className="py-3 pr-4 text-foreground">
											{product.name}
											{product.origin === "user" && (
												<span className="ml-2 text-xs text-foreground-muted">User entered</span>
											)}
										</td>

										<td className="py-3 pr-4 text-foreground-muted">{product.seriesName ?? "—"}</td>

										<td className="py-3 pr-4">
											<Link
												to={`/catalog/${product.manufacturerSlug}?${selectionSearch}`}
												className="text-foreground-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
											>
												{product.manufacturerName}
											</Link>
										</td>
									</tr>
								))}
							</tbody>
						</ListTable>
					)}
				</ListPanel>
			</ListView>
		</div>
	);
}
