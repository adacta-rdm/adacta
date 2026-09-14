/**
 * The product catalog: manufacturers, series, products, and what they measure.
 *
 * Each repository may have a "catalog/" directory. It contains one directory
 * per manufacturer. Inside it, "manufacturer.json" describes the company,
 * "products/" holds one file per product, and "series/" holds one file per
 * family the manufacturer groups its products into.
 *
 * A series file describes the family, lists its members in the manufacturer's
 * order, and carries under "shared" what every member has in common. A product
 * file holds only what is its own. The nine EL-FLOW Select controllers
 * therefore write their photograph, their channels, and six of their nine
 * specifications once.
 *
 * A product's own value wins over the shared one. Its own specifications come
 * first, so the lines that tell two members of a family apart are read before
 * the lines they agree on.
 *
 * No file carries its own key; the file name is the key, and a series names its
 * members by it. Slugs are not written by hand either. They are generated the
 * way the application generates them.
 *
 * Images are copied into a repository-specific directory under
 * "public/catalog/" and served from there. The database stores the address
 * they are served from.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";

import { isQuantityKind } from "~/app/lib/quantities.ts";
import { availableSlug } from "~/app/lib/slugs.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { CatalogSource } from "~/drizzle/schema/repo.CatalogSource.ts";
import { Channel } from "~/drizzle/schema/repo.Channel.ts";
import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer.ts";
import { Product } from "~/drizzle/schema/repo.Product.ts";
import { ProductSeries } from "~/drizzle/schema/repo.ProductSeries.ts";
import { ProductSpecification } from "~/drizzle/schema/repo.ProductSpecification.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { jsonFiles, keyOf, readJson, seedPath, subdirs } from "~/seed/files.ts";

/**
 * Where a catalog record was read from. A manufacturer cites several; a series
 * and a product each cite one.
 */
type SeedSource = { url: string; title?: string; retrievedAt: string };

type SeedSpecification = { name: string; value: string };

type SeedChannel = {
	key: string;
	role: "measurement" | "setpoint" | "state" | "status";

	/** One of the names in app/lib/quantities.ts. */
	quantityKind?: string;
	description?: string;
};

type SeedManufacturer = {
	name: string;
	website?: string;
	description?: string;

	/**
	 * The logo file, relative to the manufacturer directory. For example
	 * "images/manufacturer-logo.png".
	 */
	logo?: string;
	sources?: SeedSource[];
};

/**
 * What a member of a series may inherit. A product that writes the field
 * itself keeps its own value.
 */
type SeedShared = {
	name?: string;
	subtitle?: string;
	description?: string;
	image?: string;
	channels?: SeedChannel[];
	specifications?: SeedSpecification[];
	source?: SeedSource;
};

type SeedSeries = {
	name: string;
	subtitle?: string;
	description?: string;
	website?: string;
	source?: SeedSource;
	shared?: SeedShared;

	/**
	 * The members, named by file name, in the order the manufacturer lists them.
	 */
	products: string[];
};

type SeedProduct = {
	name?: string;
	productNumber: string;
	subtitle?: string;
	description?: string;
	image?: string;
	channels?: SeedChannel[];
	specifications?: SeedSpecification[];
	source?: SeedSource;
};

export type CatalogCounts = {
	manufacturers: number;
	series: number;
	products: number;
	specifications: number;
	channels: number;
};

/**
 * Where images are copied to. The address they are served from is this path
 * without "public".
 */
const PUBLIC_CATALOG = join(process.cwd(), "public", "catalog");

/**
 * Replace the catalog of the bound repository with the catalog seed tree.
 *
 * The rows are deleted first, children before parents, so the foreign keys
 * hold at every step.
 */
export function seedCatalog(scope: ServiceContainer, repository: string): CatalogCounts {
	const db = scope.get(RepoDB);
	const metadata = {
		metadataCreatorId: scope.get(Security).userId,
		metadataCreationTimestamp: new Date(),
	};

	db.delete(CatalogSource).run();
	db.delete(Channel).run();
	db.delete(ProductSpecification).run();
	db.delete(Product).run();
	db.delete(ProductSeries).run();
	db.delete(Manufacturer).run();

	const counts: CatalogCounts = {
		manufacturers: 0,
		series: 0,
		products: 0,
		specifications: 0,
		channels: 0,
	};

	const manufacturerSlugs: string[] = [];

	for (const manufacturerKey of subdirs("repo", repository, "catalog")) {
		const directory = seedPath("repo", repository, "catalog", manufacturerKey);
		const seed = readJson<SeedManufacturer>(join(directory, "manufacturer.json"));

		publishImages(repository, manufacturerKey, directory);

		const slug = availableSlug(seed.name, manufacturerSlugs);
		manufacturerSlugs.push(slug);

		const { id: manufacturerId } = db
			.insert(Manufacturer)
			.values({
				slug,
				name: seed.name,
				website: seed.website ?? null,
				description: seed.description ?? null,
				logoPath: servedPath(repository, manufacturerKey, seed.logo),
				...metadata,
			})
			.returning({ id: Manufacturer.id })
			.get();

		counts.manufacturers += 1;

		for (const source of seed.sources ?? []) {
			insertSource(db, { manufacturerId }, source, metadata);
		}

		const products = new Map<string, SeedProduct>();
		for (const file of jsonFiles("repo", repository, "catalog", manufacturerKey, "products")) {
			products.set(keyOf(file), readJson<SeedProduct>(file));
		}

		// A series claims its members, so a product learns its family from the
		// series rather than naming one that may not exist.
		const familyOf = new Map<string, { id: number; seed: SeedSeries; position: number }>();
		const seriesSlugs: string[] = [];

		for (const file of jsonFiles("repo", repository, "catalog", manufacturerKey, "series")) {
			const series = readJson<SeedSeries>(file);
			const seriesSlug = availableSlug(series.name, seriesSlugs);
			seriesSlugs.push(seriesSlug);

			const { id } = db
				.insert(ProductSeries)
				.values({
					manufacturerId,
					slug: seriesSlug,
					name: series.name,
					subtitle: series.subtitle ?? null,
					description: series.description ?? null,
					website: series.website ?? null,
					...metadata,
				})
				.returning({ id: ProductSeries.id })
				.get();

			counts.series += 1;

			if (series.source) insertSource(db, { seriesId: id }, series.source, metadata);

			series.products.forEach((member, position) => {
				if (!products.has(member)) {
					throw new Error(`Series ${file} names a product "${member}" that has no file.`);
				}

				const claimed = familyOf.get(member);
				if (claimed) {
					throw new Error(`Product "${member}" is claimed by two series in ${manufacturerKey}.`);
				}

				familyOf.set(member, { id, seed: series, position });
			});
		}

		const productSlugs: string[] = [];

		for (const [key, own] of products) {
			const family = familyOf.get(key);
			const shared: SeedShared = family?.seed.shared ?? {};

			// The product number tells the members of a family apart. Their names do
			// not, so the slug is built from the number.
			const productSlug = availableSlug(own.productNumber, productSlugs);
			productSlugs.push(productSlug);

			const name = own.name ?? shared.name;
			const subtitle = own.subtitle ?? shared.subtitle;
			if (name === undefined || subtitle === undefined) {
				throw new Error(`Product "${key}" in ${manufacturerKey} has no name or no subtitle.`);
			}

			const { id: productId } = db
				.insert(Product)
				.values({
					manufacturerId,
					seriesId: family?.id ?? null,
					seriesPosition: family?.position ?? null,
					slug: productSlug,
					name,
					productNumber: own.productNumber,
					subtitle,
					description: own.description ?? shared.description ?? null,
					imagePath: servedPath(repository, manufacturerKey, own.image ?? shared.image),
					...metadata,
				})
				.returning({ id: Product.id })
				.get();

			counts.products += 1;

			// What the product says itself comes first. A reader of a family then
			// meets the lines that differ before the lines that agree.
			const specifications = [...(own.specifications ?? []), ...(shared.specifications ?? [])];

			specifications.forEach((specification, position) => {
				db.insert(ProductSpecification)
					.values({ productId, position, ...specification, ...metadata })
					.run();

				counts.specifications += 1;
			});

			(own.channels ?? shared.channels ?? []).forEach((channel, position) => {
				/*
					The database column is plain text, so nothing there refuses a
					name this system cannot act on. The seed is one of the two
					places a value enters, so it refuses one here.
				*/
				if (channel.quantityKind !== undefined && !isQuantityKind(channel.quantityKind)) {
					throw new Error(
						`Channel "${channel.key}" names the quantity kind "${channel.quantityKind}", ` +
							"which is not one this system knows. Add it to app/lib/quantities.ts.",
					);
				}

				db.insert(Channel)
					.values({
						productId,
						position,
						key: channel.key,
						role: channel.role,
						quantityKind: channel.quantityKind ?? null,
						description: channel.description ?? null,
						...metadata,
					})
					.run();

				counts.channels += 1;
			});

			// A member that cites no document of its own cites its family's.
			const source = own.source ?? shared.source ?? family?.seed.source;
			if (source) insertSource(db, { productId }, source, metadata);
		}
	}

	return counts;
}

type SourceParent = { manufacturerId?: number; seriesId?: number; productId?: number };
type Metadata = { metadataCreatorId: string; metadataCreationTimestamp: Date };

function insertSource(
	db: RepoDB,
	parent: SourceParent,
	source: SeedSource,
	metadata: Metadata,
): void {
	db.insert(CatalogSource)
		.values({
			manufacturerId: parent.manufacturerId ?? null,
			seriesId: parent.seriesId ?? null,
			productId: parent.productId ?? null,
			url: source.url,
			title: source.title ?? null,
			retrievedAt: new Date(source.retrievedAt),
			...metadata,
		})
		.run();
}

/**
 * Copy the images of one manufacturer into "public/catalog/". The directory is
 * replaced, so an image whose file was removed disappears on the next run.
 */
function publishImages(repository: string, manufacturerKey: string, directory: string): void {
	const target = join(PUBLIC_CATALOG, repository, manufacturerKey);

	rmSync(target, { recursive: true, force: true });

	const images = join(directory, "images");
	if (!existsSync(images)) return;

	mkdirSync(target, { recursive: true });

	for (const image of readdirSync(images)) {
		cpSync(join(images, image), join(target, image));
	}
}

/**
 * The address an image is served from, for example
 * "/catalog/demo/bronkhorst/manufacturer-logo.png". A record without an image
 * stores nothing.
 */
function servedPath(
	repository: string,
	manufacturerKey: string,
	image: string | undefined,
): string | null {
	return image ? `/catalog/${repository}/${manufacturerKey}/${basename(image)}` : null;
}
