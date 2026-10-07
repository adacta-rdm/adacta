import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { eq } from "drizzle-orm";

import * as productPage from "~/app/routes/catalog.$manufacturerSlug.$productSlug.tsx";
import * as manufacturerLayout from "~/app/routes/catalog.$manufacturerSlug.tsx";
import * as originalFile from "~/app/routes/files.originals.$fileId.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import {
	setupEmptyTestDatabaseEnvironment,
	setupTestRequestScope,
	storedFiles,
} from "~/app/testUtils/testUtils.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { seedPath } from "~/seed/files.ts";
import { seedDatabase } from "~/seed/seed.ts";
import { seedCatalog } from "~/seed/seedCatalog.ts";

const temporaryDirectories: string[] = [];

/**
 * A product file with the fields every product needs.
 */
const PRODUCT = { name: "Product", subtitle: "A product", productNumber: "FIRST" };

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

describe("seedCatalog", () => {
	test("stores the demo logo and photograph as original files of the seed user", async () => {
		const scope = await setupEmptyTestDatabaseEnvironment();
		await seedDatabase(scope, "demo");
		const creator = await signInAs(scope, "dev@adacta.test");
		const images = seedPath("presets", "demo", "catalog", "adacta-demo-instruments", "images");

		const logo = await originalOf(scope, await logoFileId(scope, "adacta-demo-instruments"));
		const photograph = await originalOf(
			scope,
			await imageFileId(scope, "adacta-demo-instruments", "dfc-100"),
		);

		expect(logo.mediaType).toBe("image/svg+xml");
		expect(logo.bytes).toEqual(readFileSync(join(images, "manufacturer-logo.svg")));
		expect(logo.file.originalName).toBe("manufacturer-logo.svg");
		expect(logo.file.metadataCreatorId).toBe(creator.id);
		expect(photograph.mediaType).toBe("image/webp");
		expect(photograph.bytes).toEqual(readFileSync(join(images, "dfc-100.webp")));
		expect(photograph.file.uploadId).toBe(logo.file.uploadId);
	});

	test("starts no upload for a manufacturer without images", async () => {
		const scope = await setupTestRequestScope();
		const directory = writeCatalog({
			"maker/manufacturer.json": { name: "Maker" },
			"maker/products/first.json": PRODUCT,
		});

		const counts = await seedCatalog(scope, directory);

		expect(counts.products).toBe(1);
		expect(await logoFileId(scope, "maker")).toBeNull();
		expect(storedFiles(scope)).toEqual([]);
	});

	test("stores an image that several records name once", async () => {
		const scope = await setupTestRequestScope();
		const directory = writeCatalog({
			"maker/manufacturer.json": { name: "Maker", logo: "images/logo.svg" },
			"maker/products/first.json": PRODUCT,
			"maker/products/second.json": { productNumber: "SECOND", image: "./images/shared.png" },
			"maker/series/family.json": {
				name: "Family",
				shared: { name: "Product", subtitle: "Shared", image: "images/shared.png" },
				products: ["first", "second"],
			},
			"maker/images/logo.svg": "logo bytes",
			"maker/images/shared.png": "photograph bytes",
		});

		await seedCatalog(scope, directory);

		const files = await scope.get(ApplicationDatabase).select().from(OriginalFile).all();
		expect(files).toHaveLength(2);
		expect(new Set(files.map((file) => file.uploadId)).size).toBe(1);
		expect(await imageFileId(scope, "maker", "first")).toBe(
			await imageFileId(scope, "maker", "second"),
		);
	});

	test("gives each manufacturer its own upload", async () => {
		const scope = await setupTestRequestScope();
		const directory = writeCatalog({
			"first/manufacturer.json": { name: "First maker", logo: "images/logo.svg" },
			"first/images/logo.svg": "equal bytes",
			"second/manufacturer.json": { name: "Second maker", logo: "images/logo.svg" },
			"second/images/logo.svg": "equal bytes",
		});

		await seedCatalog(scope, directory);

		const files = await scope.get(ApplicationDatabase).select().from(OriginalFile).all();
		expect(files).toHaveLength(2);
		expect(new Set(files.map((file) => file.uploadId)).size).toBe(2);
	});

	test.each([
		["png", "image/png"],
		["jpg", "image/jpeg"],
		["jpeg", "image/jpeg"],
		["webp", "image/webp"],
		["gif", "image/gif"],
		["svg", "image/svg+xml"],
		["PNG", "image/png"],
	])("serves a .%s image as %s", async (extension, mediaType) => {
		const scope = await setupTestRequestScope();
		const directory = writeCatalog({
			"maker/manufacturer.json": { name: "Maker", logo: `images/logo.${extension}` },
			[`maker/images/logo.${extension}`]: "logo bytes",
		});

		await seedCatalog(scope, directory);

		const logo = await originalOf(scope, await logoFileId(scope, "maker"));
		expect(logo.mediaType).toBe(mediaType);
	});

	test("refuses an unsupported extension before it stores a file", async () => {
		const scope = await setupTestRequestScope();
		const directory = writeCatalog({
			"maker/manufacturer.json": { name: "Maker", logo: "images/logo.svg" },
			"maker/products/first.json": { ...PRODUCT, image: "images/photo.bmp" },
			"maker/images/logo.svg": "logo bytes",
			"maker/images/photo.bmp": "photograph bytes",
		});

		const result = seedCatalog(scope, directory);

		await expect(result).rejects.toThrow(/Unsupported.*images\/photo\.bmp.*products\/first\.json/);
		expect(storedFiles(scope)).toEqual([]);
	});

	test.each([
		[
			"manufacturer.json",
			{ "maker/manufacturer.json": { name: "Maker", logo: "images/missing.png" } },
		],
		[
			"products/first.json",
			{
				"maker/manufacturer.json": { name: "Maker" },
				"maker/products/first.json": { ...PRODUCT, image: "images/missing.png" },
			},
		],
		[
			"series/family.json",
			{
				"maker/manufacturer.json": { name: "Maker" },
				"maker/products/first.json": PRODUCT,
				"maker/series/family.json": {
					name: "Family",
					shared: { image: "images/missing.png" },
					products: ["first"],
				},
			},
		],
	])("names a missing image and the record %s that refers to it", async (record, files) => {
		const scope = await setupTestRequestScope();
		const directory = writeCatalog(files);

		const result = seedCatalog(scope, directory);

		await expect(result).rejects.toThrow(`"images/missing.png" referenced by`);
		await expect(result).rejects.toThrow(record);
		expect(storedFiles(scope)).toEqual([]);
	});
});

/**
 * Write a catalog to a temporary directory and return its path. A value that
 * is not text is written as JSON. For example, "maker/manufacturer.json" maps
 * to the contents of that file.
 */
function writeCatalog(files: Record<string, unknown>): string {
	const directory = mkdtempSync(join(tmpdir(), "adacta-catalog-"));
	temporaryDirectories.push(directory);

	for (const [path, contents] of Object.entries(files)) {
		const file = join(directory, path);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, typeof contents === "string" ? contents : JSON.stringify(contents));
	}

	return directory;
}

async function signInAs(scope: ServiceContainer, email: string) {
	const user = await scope
		.get(ApplicationDatabase)
		.select()
		.from(User)
		.where(eq(User.email, email))
		.get();
	scope.get(Security).setCurrentUserId(user!.id);

	return user!;
}

async function logoFileId(scope: ServiceContainer, manufacturerSlug: string) {
	const result = await testRoute(scope, manufacturerLayout, { manufacturerSlug }).loader();

	return result.data!.manufacturer.logoFileId;
}

async function imageFileId(scope: ServiceContainer, manufacturerSlug: string, productSlug: string) {
	const result = await testRoute(scope, productPage, { manufacturerSlug, productSlug }).loader();

	return result.data!.product.imageFileId;
}

/**
 * Download an original file through its route and read its record.
 */
async function originalOf(scope: ServiceContainer, fileId: number | null) {
	const result = await testRoute(scope, originalFile, { fileId: String(fileId) }).loader();
	const response = result.response!;

	return {
		mediaType: response.headers.get("Content-Type"),
		bytes: Buffer.from(await response.arrayBuffer()),
		file: await scope.get(UploadManager).getFile(fileId!),
	};
}
