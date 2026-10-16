/**
 * One product in the catalog.
 *
 * A product belonging to a series shows which of its specifications separate it
 * from the other members. The rest are shared with the family, and they are
 * marked so a reader can tell the two apart.
 */
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import { Link } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { ProductIdentity } from "~/app/components/ProductIdentity.tsx";
import { formatTimestamp } from "~/app/lib/dates.ts";
import { quantityKindName } from "~/app/lib/quantities.ts";
import { compareSpecifications } from "~/app/lib/specificationComparison.ts";
import { useCatalogSelection } from "~/app/route-components/CatalogSelection.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Badge } from "~/catalyst-ui/badge.tsx";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { CatalogSource } from "~/drizzle/schema/CatalogSource.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { ProductSeries } from "~/drizzle/schema/ProductSeries.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";

import type { Route } from "./+types/catalog.$manufacturerSlug.$productSlug.ts";

export const handle = {
	breadcrumb: (loaderData) => loaderData?.product.name,
} satisfies BreadcrumbHandle<Route.ComponentProps["loaderData"]>;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: loaderData ? `${loaderData.product.name} — Adacta` : "Catalog — Adacta" }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);

	const row = await db
		.select({
			productId: Product.id,
			seriesId: ProductSeries.id,
			manufacturerName: Manufacturer.name,
			product: {
				name: Product.name,
				productNumber: Product.productNumber,
				subtitle: Product.subtitle,
				description: Product.description,
				imageFileId: Product.imageFileId,
				origin: Product.origin,
			},
			series: { name: ProductSeries.name },
		})
		.from(Product)
		.innerJoin(Manufacturer, eq(Manufacturer.id, Product.manufacturerId))
		.leftJoin(ProductSeries, eq(ProductSeries.id, Product.seriesId))
		.where(
			and(
				eq(Manufacturer.slug, params.manufacturerSlug),
				eq(Product.slug, params.productSlug),
				isNull(Product.metadataArchivedAt),
			),
		)
		.get();

	if (!row) {
		throw new Response(`Product "${params.productSlug}" not found.`, { status: 404 });
	}

	const { productId, seriesId, ...details } = row;

	const specificationsOf = async (id: number) => {
		const rows = await db
			.select({ name: ProductSpecification.name, value: ProductSpecification.value })
			.from(ProductSpecification)
			.where(
				and(
					eq(ProductSpecification.productId, id),
					isNotNull(ProductSpecification.value),
					isNull(ProductSpecification.metadataArchivedAt),
				),
			)
			.orderBy(asc(ProductSpecification.position))
			.all();
		return rows.map((row) => ({ ...row, value: row.value! }));
	};

	const specifications = await specificationsOf(productId);

	// The database stores every specification on every product. Which of them
	// the family shares is therefore read back from the other members.
	let sharedNames = new Set<string>();
	if (seriesId !== null) {
		const members = await db
			.select({ id: Product.id })
			.from(Product)
			.where(and(eq(Product.seriesId, seriesId), isNull(Product.metadataArchivedAt)))
			.all();

		const comparison = compareSpecifications(
			await Promise.all(
				members.map(async (member) => ({ specifications: await specificationsOf(member.id) })),
			),
		);

		sharedNames = new Set(comparison.shared.map((specification) => specification.name));
	}

	const channels = await db
		.select({
			key: Channel.key,
			role: Channel.role,
			description: Channel.description,
			quantityKindId: Channel.quantityKindId,
		})
		.from(Channel)
		.where(eq(Channel.productId, productId))
		.orderBy(asc(Channel.position))
		.all();

	const source = await db
		.select({
			url: CatalogSource.url,
			title: CatalogSource.title,
			retrievedAt: CatalogSource.retrievedAt,
		})
		.from(CatalogSource)
		.where(eq(CatalogSource.productId, productId))
		.get();

	return {
		...details,
		specifications: specifications.map((specification) => ({
			...specification,
			shared: sharedNames.has(specification.name),
		})),
		channels,
		source,
	};
}

export default function CatalogManufacturerSlugProductSlug({
	loaderData,
	params,
}: Route.ComponentProps) {
	const { manufacturerName, product, series, specifications, channels, source } = loaderData;
	const { selectionSearch } = useCatalogSelection();

	// A value the whole family states the same way is listed apart, so what is
	// particular to this model is read first.
	const particular = specifications.filter((specification) => !specification.shared);
	const shared = specifications.filter((specification) => specification.shared);

	return (
		<div className="space-y-8">
			<div>
				<Link
					to={`/catalog/${params.manufacturerSlug}?${selectionSearch}`}
					className="text-sm text-link hover:text-link-hover"
				>
					← All products from {manufacturerName}
				</Link>

				<div className="mt-4">
					<ProductIdentity
						title={<Heading>{product.name}</Heading>}
						{...product}
						seriesName={series?.name}
					/>
				</div>
			</div>

			{product.description && (
				<section>
					<Subheading>Description</Subheading>
					<Text className="mt-2 max-w-3xl">{product.description}</Text>
				</section>
			)}

			{specifications.length > 0 && (
				<section className="overflow-hidden rounded-xl border border-border bg-surface">
					<div className="px-5 pt-5">
						<Subheading>Specifications</Subheading>
					</div>

					<table className="mt-4 w-full text-left text-sm">
						<tbody className="divide-y divide-border">
							{shared.length > 0 && series && particular.length > 0 && (
								<tr className="bg-surface-muted">
									<th colSpan={2} scope="colgroup" className="px-5 py-2 text-left text-foreground">
										Particular to this model
									</th>
								</tr>
							)}
							<SpecificationRows specifications={particular} />

							{shared.length > 0 && series && (
								<>
									<tr className="bg-surface-muted">
										<th
											colSpan={2}
											scope="colgroup"
											className="px-5 py-2 text-left text-foreground"
										>
											Same for every model in {series.name}
										</th>
									</tr>
									<SpecificationRows specifications={shared} />
								</>
							)}
						</tbody>
					</table>
				</section>
			)}

			{channels.length > 0 && (
				<section className="overflow-hidden rounded-xl border border-border bg-surface">
					<div className="px-5 pt-5">
						<Subheading>Channels</Subheading>
						<Text className="mt-1 text-sm">
							A channel represents a quantity this product reports or records.
						</Text>
					</div>

					<ul className="mt-4 divide-y divide-border">
						{channels.map((channel) => (
							<li key={`${channel.key}-${channel.role}`} className="px-5 py-3">
								<div className="flex flex-wrap items-center gap-2">
									<span className="font-medium text-foreground">{channel.key}</span>
									<Badge color="zinc">{channel.role}</Badge>
									{channel.quantityKindId && (
										<span className="text-sm text-foreground-muted">
											{quantityKindName(channel.quantityKindId)}
										</span>
									)}
								</div>
								{channel.description && (
									<p className="mt-1 text-sm text-foreground-muted">{channel.description}</p>
								)}
							</li>
						))}
					</ul>
				</section>
			)}

			{source && (
				<Text className="text-sm">
					Read from{" "}
					<a
						href={source.url}
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-1 font-medium text-link hover:text-link-hover"
					>
						{source.title ?? source.url}
						<ArrowTopRightOnSquareIcon className="size-4" />
					</a>{" "}
					on {formatTimestamp(source.retrievedAt)}.
				</Text>
			)}
		</div>
	);
}

/**
 * The name and value of each specification, as rows of the table above.
 */
function SpecificationRows({
	specifications,
}: {
	specifications: { name: string; value: string }[];
}) {
	return (
		<>
			{specifications.map((specification) => (
				<tr key={specification.name}>
					<th scope="row" className="w-1/3 py-3 pr-4 pl-5 font-normal text-foreground-muted">
						{specification.name}
					</th>
					<td className="py-3 pr-5 text-foreground">{specification.value}</td>
				</tr>
			))}
		</>
	);
}
