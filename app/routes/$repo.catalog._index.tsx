import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/20/solid";
import clsx from "clsx";
import { eq, isNull } from "drizzle-orm";
import { useEffect } from "react";
import { Link, Form, useSubmit, useNavigation } from "react-router";

import { services } from "~/app/.server/context";
import { RepoDB } from "~/app/services/RepoDB";
import { Heading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";
import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer";
import { Product } from "~/drizzle/schema/repo.Product";
import { ProductSeries } from "~/drizzle/schema/repo.ProductSeries";

import type { Route } from "./+types/$repo.catalog._index";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary";

/**
 * "Nabertherm" sorts before "NETZSCH", and "B2" before "B10".
 */
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

export function loader({ context, request }: Route.LoaderArgs) {
	const db = context.get(services).get(RepoDB);

	let rows = db
		.select({
			slug: Product.slug,
			name: Product.name,
			productNumber: Product.productNumber,
			subtitle: Product.subtitle,
			imagePath: Product.imagePath,
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
			collator.compare(left.productNumber, right.productNumber),
	);

	return { products: rows, query };
}

export default function RepoCatalogIndex({ loaderData, params }: Route.ComponentProps) {
	const { products, query } = loaderData;
	const navigation = useNavigation();
	const submit = useSubmit();

	// When nothing is happening, navigation.location will be undefined,
	// but when the user navigates it will be populated with the next
	// location while data loads.
	// Then we check if they're searching with location.search.
	const searching = navigation.location && new URLSearchParams(navigation.location.search).has("q");

	// Keep the search input's value in sync on browser navigation.
	// Without this, the search input would still have the old value
	// when using the browser's back button.
	useEffect(() => {
		const searchField = document.getElementById("q");
		if (searchField instanceof HTMLInputElement) {
			searchField.value = query || "";
		}
	}, [query]);

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
				<Heading>Catalog</Heading>
				<p role="status" className="text-sm text-foreground-muted">
					{products.length} products
				</p>
			</div>

			<div className="relative">
				<Form
					id="search-form"
					role="search"
					onChange={(event) => {
						const isFirstSearch = query === null;
						return submit(event.currentTarget, { replace: !isFirstSearch });
					}}
				>
					{/*
						The wait is shown where the reader is already looking. Both marks are
						kept mounted so one fades into the other, and the spinner carries a
						delay so a query answered in a few milliseconds never flashes it.
					*/}
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
						placeholder="Filter by order code, name, or manufacturer"
						aria-label="Filter the catalog"
						className={clsx(
							"w-full rounded-lg border border-border bg-surface py-2 pr-10 pl-10 text-sm text-foreground placeholder:text-foreground-muted focus:border-focus focus:outline-none",
							searching && "text-foreground-muted",
						)}
					/>
					{query && (
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
					)}
				</Form>
			</div>

			<div className={clsx("transition-opacity", searching && "opacity-40 delay-300")}>
				{products.length === 0 ? (
					<Text>Nothing matches “{query}”.</Text>
				) : (
					<div className="overflow-x-auto rounded-xl border border-border bg-surface">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-border text-xs font-medium text-foreground-muted">
								<tr>
									<th scope="col" className="w-10 py-2 pl-3" />
									<th scope="col" className="py-2 pr-4">
										Order code
									</th>
									<th scope="col" className="py-2 pr-4">
										Product
									</th>
									<th scope="col" className="py-2 pr-4">
										Series
									</th>
									<th scope="col" className="py-2 pr-4">
										Manufacturer
									</th>
								</tr>
							</thead>

							<tbody className="divide-y divide-border">
								{products.map((product) => (
									<tr key={`${product.manufacturerSlug}/${product.slug}`}>
										<td className="py-1.5 pl-3">
											<div className="flex size-8 items-center justify-center rounded bg-surface-muted">
												{product.imagePath && (
													<img
														src={product.imagePath}
														alt=""
														className="max-h-full max-w-full object-contain p-0.5"
													/>
												)}
											</div>
										</td>

										<th scope="row" className="py-1.5 pr-4 font-normal">
											<Link
												to={`/${params.repo}/catalog/${product.manufacturerSlug}/${product.slug}`}
												className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
											>
												{product.productNumber}
											</Link>
										</th>

										<td className="py-1.5 pr-4 text-foreground">{product.name}</td>

										<td className="py-1.5 pr-4 text-foreground-muted">
											{product.seriesName ?? "—"}
										</td>

										<td className="py-1.5 pr-4">
											<Link
												to={`/${params.repo}/catalog/${product.manufacturerSlug}`}
												className="text-foreground-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
											>
												{product.manufacturerName}
											</Link>
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
