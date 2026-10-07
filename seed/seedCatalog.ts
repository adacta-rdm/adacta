/**
 * The product catalog: manufacturers, series, products, and what they measure.
 *
 * Each preset may have a "catalog/" directory. It contains one directory
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
 * Referenced images enter storage through UploadManager. The catalog stores
 * their original-file IDs. Images from one manufacturer share one upload.
 */
import { basename, extname, join, normalize } from "node:path";

import { isQuantityKind } from "~/app/lib/quantities.ts";
import { availableSlug } from "~/app/lib/slugs.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { CatalogSource } from "~/drizzle/schema/CatalogSource.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { ProductSeries } from "~/drizzle/schema/ProductSeries.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { jsonFiles, keyOf, readJson, subdirs } from "~/seed/files.ts";

/**
 * Where a catalog record was read from. A manufacturer cites several; a series
 * and a product each cite one.
 */
type SeedSource = { url: string; title?: string; retrievedAt: string };

type SeedSpecification = { name: string; value: string };

type SeedChannel = {
	key: string;
	role: "measurement" | "setpoint" | "state" | "status";

	/**

	 * One of the names in app/lib/quantities.ts.

	 */
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
	productIds: Map<string, number>;
};

/**
 * Add the catalog in a directory to the database. For example, the catalog of
 * the demo preset is in "presets/demo/catalog/". A missing directory adds
 * nothing.
 */
export async function seedCatalog(
	scope: ServiceContainer,
	catalogDirectory: string,
): Promise<CatalogCounts> {
	const db = scope.get(ApplicationDatabase);
	const metadata = {
		metadataCreatorId: scope.get(Security).userId,
		metadataCreationTimestamp: new Date(),
	};

	const counts: CatalogCounts = {
		manufacturers: 0,
		series: 0,
		products: 0,
		specifications: 0,
		channels: 0,
		productIds: new Map(),
	};

	const manufacturerSlugs: string[] = [];

	for (const manufacturerKey of subdirs(catalogDirectory)) {
		const directory = join(catalogDirectory, manufacturerKey);
		const manufacturerFile = join(directory, "manufacturer.json");
		const seed = readJson<SeedManufacturer>(manufacturerFile);

		// Read image references before inserting records with file foreign keys.
		const products = new Map<string, SeedProduct>();
		const images = new Map<string, string>();
		if (seed.logo) images.set(normalize(seed.logo), manufacturerFile);

		for (const file of jsonFiles(join(directory, "products"))) {
			const product = readJson<SeedProduct>(file);
			products.set(keyOf(file), product);
			if (product.image) images.set(normalize(product.image), file);
		}

		const seriesSeeds = new Map<string, SeedSeries>();
		for (const file of jsonFiles(join(directory, "series"))) {
			const series = readJson<SeedSeries>(file);
			seriesSeeds.set(file, series);
			if (series.shared?.image) images.set(normalize(series.shared.image), file);
		}

		const imageIds = await storeImages(scope, directory, images);
		const imageId = (image: string | undefined) => (image ? imageIds.get(normalize(image))! : null);

		const slug = availableSlug(seed.name, manufacturerSlugs);
		manufacturerSlugs.push(slug);

		const { id: manufacturerId } = await db
			.insert(Manufacturer)
			.values({
				slug,
				name: seed.name,
				website: seed.website ?? null,
				description: seed.description ?? null,
				logoFileId: imageId(seed.logo),
				...metadata,
			})
			.returning({ id: Manufacturer.id })
			.get();

		counts.manufacturers += 1;

		for (const source of seed.sources ?? []) {
			await insertSource(db, { manufacturerId }, source, metadata);
		}

		// A series claims its members, so a product learns its family from the
		// series rather than naming one that may not exist.
		const familyOf = new Map<string, { id: number; seed: SeedSeries; position: number }>();
		const seriesSlugs: string[] = [];

		for (const [file, series] of seriesSeeds) {
			const seriesSlug = availableSlug(series.name, seriesSlugs);
			seriesSlugs.push(seriesSlug);

			const { id } = await db
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

			if (series.source) await insertSource(db, { seriesId: id }, series.source, metadata);

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

			const { id: productId } = await db
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
					imageFileId: imageId(own.image ?? shared.image),
					...metadata,
				})
				.returning({ id: Product.id })
				.get();

			counts.products += 1;
			counts.productIds.set(`${manufacturerKey}/${key}`, productId);

			// What the product says itself comes first. A reader of a family then
			// meets the lines that differ before the lines that agree.
			const specifications = [...(own.specifications ?? []), ...(shared.specifications ?? [])];

			for (const [position, specification] of specifications.entries()) {
				await db
					.insert(ProductSpecification)
					.values({ productId, position, ...specification, ...metadata })
					.run();

				counts.specifications += 1;
			}

			for (const [position, channel] of (own.channels ?? shared.channels ?? []).entries()) {
				/*
					The catalog file is written by hand. Checking the name here says
					which channel is wrong, which the foreign key alone would not.
				*/
				if (channel.quantityKind !== undefined && !isQuantityKind(channel.quantityKind)) {
					throw new Error(
						`Channel "${channel.key}" names the quantity kind "${channel.quantityKind}", ` +
							"which is not one this system knows. Add it to app/lib/quantities.ts.",
					);
				}

				await db
					.insert(Channel)
					.values({
						productId,
						position,
						key: channel.key,
						role: channel.role,
						quantityKindId: channel.quantityKind ?? null,
						description: channel.description ?? null,
						...metadata,
					})
					.run();

				counts.channels += 1;
			}

			// A member that cites no document of its own cites its family's.
			const source = own.source ?? shared.source ?? family?.seed.source;
			if (source) await insertSource(db, { productId }, source, metadata);
		}
	}

	return counts;
}

type SourceParent = { manufacturerId?: number; seriesId?: number; productId?: number };
type Metadata = { metadataCreatorId: string; metadataCreationTimestamp: Date };

async function insertSource(
	db: ApplicationDatabase,
	parent: SourceParent,
	source: SeedSource,
	metadata: Metadata,
): Promise<void> {
	await db
		.insert(CatalogSource)
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
 * The media type of a catalog image, by file extension. The seed refuses any
 * other extension rather than guess. For example, "photo.bmp" stops the seed.
 */
const IMAGE_MEDIA_TYPES: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif",
	".svg": "image/svg+xml",
};

/**
 * Store the images of one manufacturer as one upload and return their file
 * IDs by path. The references map each path to the seed file that names it.
 *
 * Every path is checked before the first file is staged. A missing file or an
 * unsupported extension therefore leaves no upload behind.
 */
async function storeImages(
	scope: ServiceContainer,
	directory: string,
	references: ReadonlyMap<string, string>,
): Promise<Map<string, number>> {
	const images = [];

	for (const [path, record] of references) {
		const mediaType = IMAGE_MEDIA_TYPES[extname(path).toLowerCase()];
		if (!mediaType) {
			throw new Error(`Unsupported catalog image extension: "${path}" referenced by ${record}.`);
		}

		const file = Bun.file(join(directory, path));
		if (!(await file.exists())) {
			throw new Error(`Catalog image "${path}" referenced by ${record} does not exist.`);
		}

		images.push({ path, file, mediaType });
	}

	const ids = new Map<string, number>();

	// An upload must contain a file. A manufacturer without images gets none.
	if (images.length === 0) return ids;

	const upload = scope.get(UploadManager).beginUpload();
	for (const { path, file, mediaType } of images) {
		const id = await upload.add({ originalName: basename(path), mediaType, source: file.stream() });
		ids.set(path, id);
	}

	await upload.commit(scope.get(Security).userId);

	return ids;
}
