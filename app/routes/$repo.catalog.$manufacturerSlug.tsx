/**
 * One manufacturer.
 *
 * The header is shown for every page below this route, so a product keeps the
 * company it comes from in view.
 */
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/20/solid";
import { and, count, countDistinct, eq, isNull } from "drizzle-orm";
import { Link, Outlet } from "react-router";

import { services } from "~/app/.server/context";
import { ManufacturerLogo } from "~/app/components/ManufacturerLogo";
import { RepoDB } from "~/app/services/RepoDB";
import { Heading } from "~/catalyst-ui/heading";
import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer";
import { Product } from "~/drizzle/schema/repo.Product";

import type { Route } from "./+types/$repo.catalog.$manufacturerSlug";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary";

export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: loaderData ? `${loaderData.manufacturer.name} — Adacta` : "Catalog — Adacta" }];
}

export function loader({ context, params }: Route.LoaderArgs) {
	const db = context.get(services).get(RepoDB);

	const manufacturer = db
		.select()
		.from(Manufacturer)
		.where(
			and(eq(Manufacturer.slug, params.manufacturerSlug), isNull(Manufacturer.metadataArchivedAt)),
		)
		.get();

	if (!manufacturer) {
		throw new Response(`Manufacturer "${params.manufacturerSlug}" not found.`, { status: 404 });
	}

	const totals = db
		.select({ products: count(Product.id), series: countDistinct(Product.seriesId) })
		.from(Product)
		.where(eq(Product.manufacturerId, manufacturer.id))
		.get();

	return {
		manufacturer: {
			slug: manufacturer.slug,
			name: manufacturer.name,
			website: manufacturer.website,
			logoPath: manufacturer.logoPath,
		},
		totals: totals ?? { products: 0, series: 0 },
	};
}

export default function RepoCatalogManufacturerSlug({ loaderData, params }: Route.ComponentProps) {
	const { manufacturer, totals } = loaderData;

	return (
		<div className="space-y-8">
			<div>
				<Link
					to={`/${params.repo}/catalog`}
					className="text-sm text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
				>
					← Catalog
				</Link>

				<header className="mt-4 flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start">
					<ManufacturerLogo
						name={manufacturer.name}
						logoPath={manufacturer.logoPath}
						className="size-24"
					/>

					<div className="min-w-0">
						<Heading>{manufacturer.name}</Heading>

						<div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-foreground-muted">
							<span>{totals.products === 1 ? "1 product" : `${totals.products} products`}</span>
							{totals.series > 0 && (
								<span>{totals.series === 1 ? "1 series" : `${totals.series} series`}</span>
							)}
							{manufacturer.website && (
								<a
									href={manufacturer.website}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center gap-1 font-medium text-link hover:text-link-hover"
								>
									Official website
									<ArrowTopRightOnSquareIcon className="size-4" />
								</a>
							)}
						</div>
					</div>
				</header>
			</div>

			<Outlet />
		</div>
	);
}
