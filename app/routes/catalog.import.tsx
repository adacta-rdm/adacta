import { and, eq, isNull } from "drizzle-orm";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { availableSlug } from "~/app/lib/slugs.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { EquipmentSpecification } from "~/drizzle/schema/EquipmentSpecification.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";
import { id53 } from "~/lib/id53/id53.ts";
import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";

import type { Route } from "./+types/catalog.import.ts";

type SelectedProduct = {
	id: number;
	manufacturerName: string;
	name: string;
	productNumber: string | null;
	imageFileId: number | null;
	specifications: {
		id: number;
		name: string;
		required: boolean;
		description: string | null;
	}[];
};

export function meta() {
	return [{ title: "Import catalog products — Adacta" }];
}

export async function loader({ context, request }: Route.LoaderArgs) {
	const products = await selectedProducts(
		context.get(services).get(ApplicationDatabase),
		request.url,
	);
	return { products };
}

export async function action({ context, request }: Route.ActionArgs) {
	const formData = await request.formData();
	const selected = formData.getAll("productId");
	const productIds = selected.map((value) =>
		typeof value === "string" ? Number(value) : Number.NaN,
	);

	if (
		productIds.length === 0 ||
		productIds.some((id) => !Number.isSafeInteger(id) || id < 1) ||
		new Set(productIds).size !== productIds.length
	) {
		return data({ error: "Choose each catalog product only once." }, { status: 400 });
	}

	const container = context.get(services);
	const [db, security] = container.get(ApplicationDatabase, Security);
	const products = await productsById(db, productIds);

	if (products.length !== productIds.length) {
		return data(
			{ error: "One or more selected products are no longer available." },
			{ status: 400 },
		);
	}

	const errors: string[] = [];
	const entries = products.map((product) => {
		const prefix = `entry-${product.id}`;
		const serialNumber = stringValue(formData, `${prefix}-serialNumber`) || null;
		const values = product.specifications
			.map((specification) => ({
				productSpecificationId: specification.id,
				name: specification.name,
				required: specification.required,
				value: stringValue(formData, `${prefix}-specification-${specification.id}`),
			}))
			.filter((specification) => specification.value || specification.required);

		const productLabel = product.productNumber ?? product.name;
		for (const specification of values) {
			if (specification.required && !specification.value) {
				errors.push(`${productLabel} needs ${specification.name}.`);
			}
		}

		return {
			product,
			serialNumber,
			values,
		};
	});

	if (errors.length > 0) return data({ error: errors.join(" ") }, { status: 400 });

	const metadata = { metadataCreatorId: security.userId, metadataCreationTimestamp: new Date() };
	for (let attempt = 0; attempt < 5; attempt++) {
		const usedSlugs = new Set(
			(await db.select({ slug: Equipment.slug }).from(Equipment).all()).map(({ slug }) => slug),
		);
		const statements = entries.flatMap((entry) => {
			const id = id53();
			const slug = availableSlug(entry.product.name, usedSlugs);
			usedSlugs.add(slug);

			// Separate inserts avoid a large parameter list per statement.
			return [
				db.insert(Id).values({ id }),
				db.insert(Equipment).values({
					id,
					slug,
					productId: entry.product.id,
					serialNumber: entry.serialNumber,
					...metadata,
				}),
				...entry.values
					.filter((specification) => specification.value)
					.map((specification) =>
						db.insert(EquipmentSpecification).values({
							equipmentId: id,
							productSpecificationId: specification.productSpecificationId,
							value: specification.value,
							...metadata,
						}),
					),
			];
		});

		try {
			await db.batch(statements);
			return redirect("/inventory", 303);
		} catch (error) {
			if (error instanceof UniqueConstraintViolationError && error.isOn([Equipment.slug])) continue;
			if (
				error instanceof UniqueConstraintViolationError &&
				error.isOn([Equipment.productId, Equipment.serialNumber])
			) {
				return data(
					{ error: "The serial number is already in use for this product." },
					{ status: 400 },
				);
			}
			throw error;
		}
	}

	return data(
		{ error: "Could not assign unique equipment addresses. Try importing again." },
		{ status: 409 },
	);
}

export default function CatalogImport({ actionData, loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const submitting = navigation.formData !== undefined;

	if (loaderData.products.length === 0) {
		return (
			<>
				<Heading>Import catalog products</Heading>
				<Text className="mt-3">Select one or more products from the catalog before importing.</Text>
				<Link to={`/catalog`} className="mt-6 inline-block text-sm text-link hover:text-link-hover">
					Open catalog
				</Link>
			</>
		);
	}

	return (
		<>
			<Heading>Import catalog products</Heading>
			<Text className="mt-2">
				Each selected product is added to the inventory as one piece of equipment. Enter a serial
				number and the values the product asks for.
			</Text>

			<Form method="post" className="mt-8 space-y-8">
				{loaderData.products.map((product) => (
					<fieldset key={product.id} className="rounded-xl border border-border bg-surface p-5">
						<input type="hidden" name="productId" value={product.id} />
						<legend className="px-1 font-semibold text-foreground">
							{product.manufacturerName} {product.productNumber ?? product.name}
						</legend>
						<div className="mt-1 flex items-center gap-3">
							<div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
								{product.imageFileId && (
									<img
										src={`/files/originals/${product.imageFileId}`}
										alt=""
										className="max-h-full max-w-full object-contain p-1"
									/>
								)}
							</div>
							<p className="text-sm text-foreground-muted">{product.name}</p>
						</div>

						<div className="mt-5 grid gap-4 sm:grid-cols-2">
							<Field label="Serial number" name={`entry-${product.id}-serialNumber`} />
						</div>

						{product.specifications.length > 0 && (
							<div className="mt-6 border-t border-border pt-5">
								<Subheading>Equipment details</Subheading>
								<div className="mt-4 grid gap-4 sm:grid-cols-2">
									{product.specifications.map((specification) => (
										<Field
											key={specification.id}
											label={specification.name}
											name={`entry-${product.id}-specification-${specification.id}`}
											required={specification.required}
											description={specification.description}
										/>
									))}
								</div>
							</div>
						)}
					</fieldset>
				))}

				{actionData?.error ? (
					<p role="alert" className="text-sm text-danger">
						{actionData.error}
					</p>
				) : null}

				<div className="flex items-center gap-3">
					<button
						type="submit"
						disabled={submitting}
						className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
					>
						{submitting ? "Adding…" : "Add equipment"}
					</button>
					<Link to={`/catalog`} className="text-sm text-foreground-muted hover:text-foreground">
						Cancel
					</Link>
				</div>
			</Form>
		</>
	);
}

function Field({
	label,
	name,
	required,
	description,
}: {
	label: string;
	name: string;
	required?: boolean;
	description?: string | null;
}) {
	return (
		<label className="block text-sm font-medium text-foreground">
			{label}
			{required ? " *" : ""}
			<input
				name={name}
				required={required}
				className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-focus focus:outline-none"
			/>
			{description ? (
				<span className="mt-1 block text-sm font-normal text-foreground-muted">{description}</span>
			) : null}
		</label>
	);
}

function stringValue(formData: FormData, name: string): string {
	const value = formData.get(name);
	return typeof value === "string" ? value.trim() : "";
}

async function selectedProducts(db: ApplicationDatabase, url: string) {
	const productIds = new URL(url).searchParams.getAll("selected").map(Number);
	if (
		productIds.some((id) => !Number.isSafeInteger(id) || id < 1) ||
		new Set(productIds).size !== productIds.length
	) {
		throw new Response("The selected catalog products are invalid.", { status: 400 });
	}
	return productsById(db, productIds);
}

async function productsById(
	db: ApplicationDatabase,
	productIds: number[],
): Promise<SelectedProduct[]> {
	const products: SelectedProduct[] = [];
	for (const id of productIds) {
		const product = await db
			.select({
				id: Product.id,
				manufacturerName: Manufacturer.name,
				name: Product.name,
				productNumber: Product.productNumber,
				imageFileId: Product.imageFileId,
			})
			.from(Product)
			.innerJoin(Manufacturer, eq(Manufacturer.id, Product.manufacturerId))
			.where(
				and(
					eq(Product.id, id),
					isNull(Product.metadataArchivedAt),
					isNull(Manufacturer.metadataArchivedAt),
				),
			)
			.get();
		if (!product) continue;
		const specifications = await db
			.select({
				id: ProductSpecification.id,
				name: ProductSpecification.name,
				required: ProductSpecification.required,
				description: ProductSpecification.description,
			})
			.from(ProductSpecification)
			.where(
				and(
					eq(ProductSpecification.productId, id),
					isNull(ProductSpecification.value),
					isNull(ProductSpecification.metadataArchivedAt),
				),
			)
			.orderBy(ProductSpecification.position)
			.all();
		products.push({ ...product, specifications });
	}
	return products;
}
