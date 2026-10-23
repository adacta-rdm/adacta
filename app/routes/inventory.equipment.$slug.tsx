/**
 * The physical unit and its catalog model.
 */
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { Link } from "react-router";

import { services } from "~/app/.server/context.ts";
import { ArchivedNotice } from "~/app/components/ArchivedNotice.tsx";
import { KindIcon } from "~/app/components/KindIcon.tsx";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { ProductIdentity } from "~/app/components/ProductIdentity.tsx";
import { formatTimestamp } from "~/app/lib/dates.ts";
import { formatLocation } from "~/app/lib/location.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { EquipmentSpecification } from "~/drizzle/schema/EquipmentSpecification.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";

import type { Route } from "./+types/inventory.equipment.$slug.ts";

export const handle = {
	breadcrumb: (loaderData) => loaderData?.name,
} satisfies BreadcrumbHandle<Route.ComponentProps["loaderData"]>;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

/**
 * The route has an error boundary, so it can render without loader data. The
 * title then names the section rather than an entry.
 */
export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: loaderData ? `${loaderData.name} — Adacta` : "Inventory — Adacta" }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);

	const row = (
		await db
			.select({
				id: Equipment.id,
				name: Product.name,
				archivedAt: Equipment.metadataArchivedAt,
				serialNumber: Equipment.serialNumber,
				product: {
					id: Product.id,
					manufacturerSlug: Manufacturer.slug,
					manufacturerName: Manufacturer.name,
					productSlug: Product.slug,
					name: Product.name,
					productNumber: Product.productNumber,
					subtitle: Product.subtitle,
					imageFileId: Product.imageFileId,
					origin: Product.origin,
				},
				location: {
					building: Equipment.building,
					room: Equipment.room,
					position: Equipment.position,
				},
				createdAt: Equipment.metadataCreationTimestamp,
				createdBy: User.name,
			})
			.from(Equipment)
			.innerJoin(Product, eq(Product.id, Equipment.productId))
			.innerJoin(Manufacturer, eq(Manufacturer.id, Product.manufacturerId))
			.innerJoin(User, eq(User.id, Equipment.metadataCreatorId))
			.where(eq(Equipment.slug, params.slug))
			.limit(1)
	).at(0);

	if (!row) {
		throw new Response(`Equipment "${params.slug}" not found.`, { status: 404 });
	}

	const specifications = await db
		.select({
			name: ProductSpecification.name,
			// A line without a value asks for the value of each unit.
			value: sql<
				string | null
			>`coalesce(${ProductSpecification.value}, ${EquipmentSpecification.value})`,
		})
		.from(ProductSpecification)
		.leftJoin(
			EquipmentSpecification,
			and(
				eq(EquipmentSpecification.productSpecificationId, ProductSpecification.id),
				eq(EquipmentSpecification.equipmentId, row.id),
				isNull(EquipmentSpecification.metadataArchivedAt),
			),
		)
		.where(
			and(
				eq(ProductSpecification.productId, row.product.id),
				isNull(ProductSpecification.metadataArchivedAt),
			),
		)
		.orderBy(asc(ProductSpecification.position))
		.all();

	return { ...row, specifications };
}

export default function InventoryEquipmentSlug({ loaderData }: Route.ComponentProps) {
	const entry = loaderData;
	const location = formatLocation(entry.location);

	return (
		<div className="space-y-6">
			<div>
				<Heading>{entry.name}</Heading>
				{entry.archivedAt && <ArchivedNotice at={entry.archivedAt} kind="equipment" />}

				<p className="mt-2 flex items-center gap-2 text-sm text-foreground-muted">
					<KindIcon kind="equipment" className="size-4" />
					Equipment
				</p>

				{location ? (
					<p className="mt-2 text-sm text-foreground-muted">Location: {location}</p>
				) : (
					<Text className="mt-2">No location has been recorded.</Text>
				)}
			</div>

			{entry.serialNumber && (
				<p className="text-sm text-foreground-muted">Serial number: {entry.serialNumber}</p>
			)}

			<section>
				<Subheading>Catalog model</Subheading>
				<div className="mt-4">
					<ProductIdentity
						title={
							<Link
								to={`/catalog/${entry.product.manufacturerSlug}/${entry.product.productSlug}`}
								className="font-semibold text-link hover:text-link-hover"
							>
								{entry.product.name}
							</Link>
						}
						{...entry.product}
					/>
				</div>
				{entry.specifications.length > 0 && (
					<dl className="mt-6 divide-y divide-border text-sm">
						{entry.specifications.map((specification) => (
							<div key={specification.name} className="flex gap-4 py-3">
								<dt className="w-1/3 text-foreground-muted">{specification.name}</dt>
								<dd>{specification.value ?? "Not recorded"}</dd>
							</div>
						))}
					</dl>
				)}
			</section>

			<div className="space-y-2 text-sm text-foreground-muted">
				<p>Added by: {entry.createdBy}</p>
				<p>
					Added to Adacta:{" "}
					<time dateTime={entry.createdAt.toISOString()}>{formatTimestamp(entry.createdAt)}</time>
				</p>
			</div>
		</div>
	);
}
