import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { loader as productLoader } from "~/app/routes/catalog.$manufacturerSlug.$productSlug.tsx";
import { loader as manufacturerLoader } from "~/app/routes/catalog.$manufacturerSlug._index.tsx";
import { loader as indexLoader } from "~/app/routes/catalog._index.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { ProductSeries } from "~/drizzle/schema/ProductSeries.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

describe("catalog index loader", () => {
	test("lists every product with the family it belongs to", async () => {
		const scope = await setupCatalog();
		const [args] = createMiddlewareArgs(scope, { params: {} });

		const { products } = await indexLoader(args);

		// Ordered by manufacturer, then by order code.
		expect(products).toEqual([
			expect.objectContaining({
				productNumber: "F-201CV-020",
				manufacturerName: "Bronkhorst",
				seriesName: "EL-FLOW Select",
			}),
			expect.objectContaining({
				productNumber: "F-201CV-100",
				seriesName: "EL-FLOW Select",
			}),
			// A product in no series still appears, with nothing in that column.
			expect.objectContaining({ productNumber: "N86", seriesName: null }),
		]);
	});
});

describe("manufacturer product loader", () => {
	test("puts the lines that differ in the table and the rest above it", async () => {
		const scope = await setupCatalog();
		const { series, standalone } = await loadManufacturer(scope, "bronkhorst");

		expect(series).toHaveLength(1);
		expect(series[0]?.products.map((product) => product.productNumber)).toEqual([
			"F-201CV-020",
			"F-201CV-100",
		]);

		// Accuracy is stated the same way by both, so it belongs above the table.
		// The calibration gas separates them, so it becomes a column.
		expect(series[0]?.products[0]?.specifications).toEqual([
			{ name: "Calibration gas", value: "N₂" },
			{ name: "Accuracy", value: "±0.5%" },
		]);

		expect(standalone.map((product) => product.productNumber)).toEqual(["N86"]);
	});

	test("answers 404 for a manufacturer that is not there", async () => {
		const scope = await setupCatalog();

		// The loader is synchronous, so it throws instead of rejecting.
		let thrown: unknown;
		try {
			await loadManufacturer(scope, "no-such-maker");
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(Response);
		expect((thrown as Response).status).toBe(404);
	});
});

describe("product loader", () => {
	test("marks the specifications the family shares", async () => {
		const scope = await setupCatalog();
		const [args] = createMiddlewareArgs(scope, {
			params: { manufacturerSlug: "bronkhorst", productSlug: "f-201cv-020" },
		});

		const { product, series, specifications, channels } = await productLoader(args);

		expect(product.productNumber).toBe("F-201CV-020");
		expect(series?.name).toBe("EL-FLOW Select");

		// Both members state the same accuracy, so it is shared. The calibration
		// gas differs, so it belongs to this product alone.
		expect(specifications).toEqual([
			{ name: "Calibration gas", value: "N₂", shared: false },
			{ name: "Accuracy", value: "±0.5%", shared: true },
		]);

		expect(channels).toEqual([
			expect.objectContaining({
				key: "flow",
				role: "measurement",
				quantityKindId: "VolumeFlowRate",
			}),
		]);
	});

	test("answers 404 for a product that is not there", async () => {
		const scope = await setupCatalog();
		const [args] = createMiddlewareArgs(scope, {
			params: { manufacturerSlug: "bronkhorst", productSlug: "no-such-product" },
		});

		let thrown: unknown;
		try {
			await productLoader(args);
		} catch (error) {
			thrown = error;
		}

		expect((thrown as Response).status).toBe(404);
	});
});

function loadManufacturer(scope: ServiceContainer, manufacturerSlug: string) {
	const [args] = createMiddlewareArgs(scope, {
		params: { manufacturerSlug },
	});

	return manufacturerLoader(args);
}

/**
 * One manufacturer with a series of two controllers and one product that
 * belongs to no series.
 */
async function setupCatalog(): Promise<ServiceContainer> {
	const scope = await setupTestRequestScope();
	const db = scope.get(ApplicationDatabase);
	const metadata = {
		metadataCreatorId: scope.get(Security).userId,
		metadataCreationTimestamp: new Date("2026-01-15T12:00:00.000Z"),
	};

	const { id: manufacturerId } = await db
		.insert(Manufacturer)
		.values({ slug: "bronkhorst", name: "Bronkhorst", ...metadata })
		.returning({ id: Manufacturer.id })
		.get();

	const { id: seriesId } = await db
		.insert(ProductSeries)
		.values({ manufacturerId, slug: "el-flow-select", name: "EL-FLOW Select", ...metadata })
		.returning({ id: ProductSeries.id })
		.get();

	const addProduct = async (
		values: { slug: string; productNumber: string; seriesId?: number; seriesPosition?: number },
		specifications: { name: string; value: string }[],
	) => {
		const { id } = await db
			.insert(Product)
			.values({
				manufacturerId,
				seriesId: values.seriesId ?? null,
				seriesPosition: values.seriesPosition ?? null,
				slug: values.slug,
				name: "Controller",
				productNumber: values.productNumber,
				subtitle: "A controller",
				...metadata,
			})
			.returning({ id: Product.id })
			.get();

		for (const [position, specification] of specifications.entries()) {
			await db
				.insert(ProductSpecification)
				.values({ productId: id, position, ...specification, ...metadata })
				.run();
		}
	};

	const addChannel = async (productSlug: string) => {
		const product = await db.select().from(Product).where(eq(Product.slug, productSlug)).get();

		await db
			.insert(Channel)
			.values({
				productId: product!.id,
				position: 0,
				key: "flow",
				role: "measurement",
				quantityKindId: "VolumeFlowRate",
				description: "The flow the controller measures through itself.",
				...metadata,
			})
			.run();
	};

	// The seeder stores a product's own lines first, then the shared ones.
	await addProduct(
		{ slug: "f-201cv-020", productNumber: "F-201CV-020", seriesId, seriesPosition: 0 },
		[
			{ name: "Calibration gas", value: "N₂" },
			{ name: "Accuracy", value: "±0.5%" },
		],
	);
	await addProduct(
		{ slug: "f-201cv-100", productNumber: "F-201CV-100", seriesId, seriesPosition: 1 },
		[
			{ name: "Calibration gas", value: "H₂" },
			{ name: "Accuracy", value: "±0.5%" },
		],
	);
	await addProduct({ slug: "n86", productNumber: "N86" }, [{ name: "Flow", value: "6 l/min" }]);

	await addChannel("f-201cv-020");

	return scope;
}
