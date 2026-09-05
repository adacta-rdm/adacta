/**
 * What one manufacturer makes.
 *
 * Products that belong to a series are shown as one table. Its columns are the
 * specifications that differ between the members, so a reader choosing between
 * nine mass flow controllers reads the three lines that separate them instead
 * of the nine lines each one carries. What the members agree on is written
 * once, above the table.
 *
 * Products in no series are shown as cards, because each one stands alone.
 */
import { and, asc, eq, isNull } from "drizzle-orm";
import { Link } from "react-router";

import { services } from "~/app/.server/context";
import { compareSpecifications, type Specification } from "~/app/lib/specificationComparison";
import { RepoDB } from "~/app/services/RepoDB";
import { Subheading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";
import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer";
import { Product } from "~/drizzle/schema/repo.Product";
import { ProductSeries } from "~/drizzle/schema/repo.ProductSeries";
import { ProductSpecification } from "~/drizzle/schema/repo.ProductSpecification";

import type { Route } from "./+types/$repo.catalog.$manufacturerSlug._index";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary";

type CatalogProduct = {
	slug: string;
	name: string;
	productNumber: string;
	subtitle: string;
	imagePath: string | null;
	specifications: Specification[];
};

export function loader({ context, params }: Route.LoaderArgs) {
	const db = context.get(services).get(RepoDB);

	const manufacturer = db
		.select({ id: Manufacturer.id })
		.from(Manufacturer)
		.where(
			and(eq(Manufacturer.slug, params.manufacturerSlug), isNull(Manufacturer.metadataArchivedAt)),
		)
		.get();

	if (!manufacturer) {
		throw new Response(`Manufacturer "${params.manufacturerSlug}" not found.`, { status: 404 });
	}

	const rows = db
		.select()
		.from(Product)
		.where(and(eq(Product.manufacturerId, manufacturer.id), isNull(Product.metadataArchivedAt)))
		.orderBy(asc(Product.seriesPosition), asc(Product.productNumber))
		.all();

	// One query for every specification of this manufacturer, ordered as it is
	// written on the product. Reading them per product would be one query a row.
	const specifications = new Map<number, Specification[]>();
	const specificationRows = db
		.select({
			productId: ProductSpecification.productId,
			name: ProductSpecification.name,
			value: ProductSpecification.value,
		})
		.from(ProductSpecification)
		.innerJoin(Product, eq(Product.id, ProductSpecification.productId))
		.where(eq(Product.manufacturerId, manufacturer.id))
		.orderBy(asc(ProductSpecification.productId), asc(ProductSpecification.position))
		.all();

	for (const row of specificationRows) {
		const list = specifications.get(row.productId) ?? [];
		list.push({ name: row.name, value: row.value });
		specifications.set(row.productId, list);
	}

	const seriesRows = db
		.select()
		.from(ProductSeries)
		.where(eq(ProductSeries.manufacturerId, manufacturer.id))
		.orderBy(asc(ProductSeries.name))
		.all();

	const describe = (product: (typeof rows)[number]): CatalogProduct => ({
		slug: product.slug,
		name: product.name,
		productNumber: product.productNumber,
		subtitle: product.subtitle,
		imagePath: product.imagePath,
		specifications: specifications.get(product.id) ?? [],
	});

	return {
		series: seriesRows.map((series) => ({
			slug: series.slug,
			name: series.name,
			subtitle: series.subtitle,
			description: series.description,
			website: series.website,
			imagePath: rows.find((p) => p.seriesId === series.id)?.imagePath ?? null,
			products: rows.filter((product) => product.seriesId === series.id).map(describe),
		})),
		standalone: rows.filter((product) => product.seriesId === null).map(describe),
	};
}

export default function RepoCatalogManufacturerSlugIndex({
	loaderData,
	params,
}: Route.ComponentProps) {
	const { series, standalone } = loaderData;

	if (series.length === 0 && standalone.length === 0) {
		return <Text>No products yet.</Text>;
	}

	return (
		<div className="space-y-10">
			{series.map((family) => (
				<SeriesTable
					key={family.slug}
					family={family}
					repo={params.repo}
					manufacturer={params.manufacturerSlug}
				/>
			))}

			{standalone.length > 0 && (
				<section>
					{series.length > 0 && <Subheading className="mb-4">Other products</Subheading>}
					<ProductGrid
						products={standalone}
						repo={params.repo}
						manufacturer={params.manufacturerSlug}
					/>
				</section>
			)}
		</div>
	);
}

type Family = Route.ComponentProps["loaderData"]["series"][number];

/**
 * A series, its shared description, and a row per member.
 */
function SeriesTable({
	family,
	repo,
	manufacturer,
}: {
	family: Family;
	repo: string;
	manufacturer: string;
}) {
	/*
		A family of one has nothing to compare. Every value would count as shared,
		which fills the header with the whole data sheet and leaves a table of one
		column. The member is listed on its own instead, and its specifications are
		read on its page.
	*/
	const isFamily = family.products.length > 1;
	const { shared, varying } = isFamily
		? compareSpecifications(family.products)
		: { shared: [], varying: [] };

	const valueOf = (product: CatalogProduct, name: string) =>
		product.specifications.find((specification) => specification.name === name)?.value ?? "—";

	return (
		<section className="overflow-hidden rounded-xl border border-border bg-surface">
			<div className="flex flex-col gap-5 p-5 sm:flex-row">
				{family.imagePath && (
					<img
						src={family.imagePath}
						alt=""
						className="h-20 w-20 shrink-0 self-start rounded-lg border border-border bg-surface object-contain p-1.5"
					/>
				)}

				<div className="min-w-0">
					<Subheading>{family.name}</Subheading>
					{family.subtitle && (
						<p className="mt-1 text-sm text-foreground-muted">{family.subtitle}</p>
					)}
					{family.description && (
						<p className="mt-2 max-w-3xl text-sm text-foreground-muted">{family.description}</p>
					)}

					{shared.length > 0 && (
						<dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
							{shared.map((specification) => (
								<div key={specification.name} className="flex gap-2">
									<dt className="text-foreground-muted">{specification.name}</dt>
									<dd className="font-medium text-foreground">{specification.value}</dd>
								</div>
							))}
						</dl>
					)}
				</div>
			</div>

			<div className="overflow-x-auto border-t border-border">
				<table className="w-full text-left text-sm">
					<thead className="border-b border-border text-xs font-medium text-foreground-muted">
						<tr>
							<th scope="col" className="py-2 pr-4 pl-5">
								{isFamily ? "Product number" : "Product"}
							</th>
							{varying.map((name) => (
								<th key={name} scope="col" className="py-2 pr-4">
									{name}
								</th>
							))}
						</tr>
					</thead>

					<tbody className="divide-y divide-border">
						{family.products.map((product) => (
							<tr key={product.slug}>
								<th scope="row" className="py-3 pr-4 pl-5 font-normal">
									<Link
										to={`/${repo}/catalog/${manufacturer}/${product.slug}`}
										className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
									>
										{product.productNumber}
									</Link>
								</th>
								{varying.map((name) => (
									<td key={name} className="py-3 pr-4 text-foreground-muted">
										{valueOf(product, name)}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</section>
	);
}

/**
 * Products that belong to no series, as rows rather than cards.
 */
function ProductGrid({
	products,
	repo,
	manufacturer,
}: {
	products: CatalogProduct[];
	repo: string;
	manufacturer: string;
}) {
	return (
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
					</tr>
				</thead>

				<tbody className="divide-y divide-border">
					{products.map((product) => (
						<tr key={product.slug}>
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
									to={`/${repo}/catalog/${manufacturer}/${product.slug}`}
									className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
								>
									{product.productNumber}
								</Link>
							</th>

							<td className="py-1.5 pr-4">
								<span className="text-foreground">{product.name}</span>
								<span className="ml-2 text-foreground-muted">{product.subtitle}</span>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
