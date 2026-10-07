import { desc, eq } from "drizzle-orm";

import { addSample } from "~/app/lib/addSample.ts";
import { slugify } from "~/app/lib/slugs.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { NoteManager } from "~/app/services/NoteManager.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import type { Entity, NewEntity } from "~/drizzle/Schema.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Note } from "~/drizzle/schema/Note.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { ProductSeries } from "~/drizzle/schema/ProductSeries.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";
import { id53 } from "~/lib/id53/id53.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

const CREATION_TIME = new Date("2026-01-15T12:00:00.000Z");

/**
 * Create a catalog manufacturer with a slug taken from its name.
 */
export async function createTestManufacturer(
	scope: ServiceContainer,
	overrides: Partial<NewEntity<"Manufacturer">> = {},
): Promise<Entity<"Manufacturer">> {
	const name = overrides.name ?? "Bronkhorst";

	return await scope
		.get(ApplicationDatabase)
		.insert(Manufacturer)
		.values({
			name,
			slug: slugify(name),
			metadataCreatorId: scope.get(Security).userId,
			metadataCreationTimestamp: CREATION_TIME,
			...overrides,
		})
		.returning()
		.get();
}

/**
 * Create a product series of a manufacturer with a slug taken from its name.
 */
export async function createTestSeries(
	scope: ServiceContainer,
	manufacturer: Entity<"Manufacturer">,
	overrides: Partial<NewEntity<"ProductSeries">> = {},
): Promise<Entity<"ProductSeries">> {
	const name = overrides.name ?? "EL-FLOW Select";

	return await scope
		.get(ApplicationDatabase)
		.insert(ProductSeries)
		.values({
			manufacturerId: manufacturer.id,
			name,
			slug: slugify(name),
			metadataCreatorId: scope.get(Security).userId,
			metadataCreationTimestamp: CREATION_TIME,
			...overrides,
		})
		.returning()
		.get();
}

/**
 * Create a product of a manufacturer with a slug taken from its product
 * number. The specifications are stored in the order given.
 */
export async function createTestProduct(
	scope: ServiceContainer,
	manufacturer: Entity<"Manufacturer">,
	overrides: Partial<NewEntity<"Product">> = {},
	specifications: { name: string; value: string }[] = [],
): Promise<Entity<"Product">> {
	const db = scope.get(ApplicationDatabase);
	const metadata = {
		metadataCreatorId: scope.get(Security).userId,
		metadataCreationTimestamp: CREATION_TIME,
	};
	const productNumber = overrides.productNumber ?? "F-201CV-020";

	const product = await db
		.insert(Product)
		.values({
			manufacturerId: manufacturer.id,
			name: "Controller",
			productNumber,
			slug: slugify(productNumber),
			subtitle: "A controller",
			...metadata,
			...overrides,
		})
		.returning()
		.get();

	for (const [position, specification] of specifications.entries()) {
		await db
			.insert(ProductSpecification)
			.values({ productId: product.id, position, ...specification, ...metadata })
			.run();
	}

	return product;
}

/**
 * Create a channel of a product. The channel defaults to a flow measurement.
 */
export async function createTestChannel(
	scope: ServiceContainer,
	product: Entity<"Product">,
	overrides: Partial<NewEntity<"Channel">> = {},
): Promise<Entity<"Channel">> {
	return await scope
		.get(ApplicationDatabase)
		.insert(Channel)
		.values({
			productId: product.id,
			position: 0,
			key: "flow",
			role: "measurement",
			quantityKindId: "VolumeFlowRate",
			metadataCreatorId: scope.get(Security).userId,
			metadataCreationTimestamp: CREATION_TIME,
			...overrides,
		})
		.returning()
		.get();
}

/**
 * Create an inventory entry of any kind with its ID. The kind defaults to "rig".
 */
export async function createTestRig(
	scope: ServiceContainer,
	overrides: Partial<NewEntity<"InventoryEntry">> = {},
): Promise<Entity<"InventoryEntry">> {
	const db = scope.get(ApplicationDatabase);
	const name = overrides.name ?? "Test rig";
	const values = {
		id: id53(),
		name,
		slug: slugify(name),
		kind: "rig" as const,
		metadataCreatorId: scope.get(Security).userId,
		metadataCreationTimestamp: CREATION_TIME,
		...overrides,
	};

	await db.batch([
		db.insert(Id).values({ id: values.id }),
		db.insert(InventoryEntry).values(values),
	]);

	return (await db.select().from(InventoryEntry).where(eq(InventoryEntry.id, values.id)).get())!;
}

/**
 * Create a sample batch with its ID and a slug taken from its name.
 */
export async function createTestBatch(
	scope: ServiceContainer,
	overrides: Partial<NewEntity<"SampleBatch">> = {},
): Promise<Entity<"SampleBatch">> {
	const db = scope.get(ApplicationDatabase);
	const userId = scope.get(Security).userId;
	const name = overrides.name ?? "Pt batch";
	const values = {
		id: id53(),
		name,
		slug: slugify(name),
		preparationDate: "2026-01-15",
		preparedById: userId,
		metadataCreatorId: userId,
		metadataCreationTimestamp: CREATION_TIME,
		...overrides,
	};

	await db.batch([db.insert(Id).values({ id: values.id }), db.insert(SampleBatch).values(values)]);

	return (await db.select().from(SampleBatch).where(eq(SampleBatch.id, values.id)).get())!;
}

/**
 * Add a sample through the application's label and slug rules.
 */
export async function createTestSample(
	scope: ServiceContainer,
	batch: Entity<"SampleBatch">,
	overrides: Partial<Omit<NewEntity<"Sample">, "id" | "slug">> = {},
): Promise<Entity<"Sample">> {
	return addSample(scope.get(ApplicationDatabase), {
		batchId: batch.id,
		name: "#01",
		preparedById: batch.preparedById,
		metadataCreatorId: scope.get(Security).userId,
		metadataCreationTimestamp: CREATION_TIME,
		...overrides,
	});
}

/**
 * Add a note through NoteManager and return its stored row. The supersedes
 * option creates a new version through NoteManager.edit. Metadata overrides
 * prepare authors and writing times for loader tests.
 */
export async function createTestNote(
	scope: ServiceContainer,
	subjectId: number,
	overrides: Partial<
		Pick<
			NewEntity<"Note">,
			| "body"
			| "observedAt"
			| "metadataCreatorId"
			| "metadataCreationTimestamp"
			| "metadataArchivedAt"
		>
	> = {},
	options: { supersedes?: Entity<"Note"> } = {},
): Promise<Entity<"Note">> {
	const db = scope.get(ApplicationDatabase);
	const notes = scope.get(NoteManager);
	const input = {
		body: overrides.body ?? "Test note",
		observedAt: overrides.observedAt ?? undefined,
	};

	const errors = options.supersedes
		? await notes.edit(options.supersedes.id, [subjectId], input)
		: await notes.add(subjectId, input);

	if (errors) throw new Error(JSON.stringify(errors));

	// id53() increases with time. Hence, the highest ID belongs to the new row.
	const created = (await db.select().from(Note).orderBy(desc(Note.id)).get())!;

	return await db
		.update(Note)
		.set({
			metadataCreatorId: scope.get(Security).userId,
			metadataCreationTimestamp: CREATION_TIME,
			...overrides,
		})
		.where(eq(Note.id, created.id))
		.returning()
		.get();
}

/**
 * Store a measurement file and return its upload and file identifiers.
 */
export async function createTestUpload(scope: ServiceContainer) {
	const upload = scope.get(UploadManager).beginUpload();
	const fileId = await upload.add({
		originalName: "measurement ä.csv",
		mediaType: "text/csv",
		source: new Blob(["a,b\n1,2\n3,4"]).stream(),
	});

	const uploadId = await upload.commit(scope.get(Security).userId);

	return { uploadId, fileId };
}
