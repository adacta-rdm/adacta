import { and, asc, eq, isNull } from "drizzle-orm";
import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { slugify } from "~/app/lib/slugs.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { Combobox, ComboboxOption } from "~/catalyst-ui/combobox.tsx";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { Id } from "~/drizzle/schema/Id.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { InventoryEntryProduct } from "~/drizzle/schema/InventoryEntryProduct.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { id53 } from "~/lib/id53/id53.ts";
import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";

import type { Route } from "./+types/inventory.new.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

const NEW_MANUFACTURER = "new";

type ManufacturerOption = { id: string; name: string; isNew: boolean };
const EMPTY_MANUFACTURER: ManufacturerOption = { id: "", name: "", isNew: false };

export function meta() {
	return [{ title: "Add equipment — Adacta" }];
}

export async function loader({ context }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const manufacturers = await db
		.select({ id: Manufacturer.id, name: Manufacturer.name })
		.from(Manufacturer)
		.where(isNull(Manufacturer.metadataArchivedAt))
		.orderBy(asc(Manufacturer.name))
		.all();

	return { manufacturers };
}

export async function action({ context, request }: Route.ActionArgs) {
	const formData = await request.formData();
	const entryName = stringValue(formData, "entryName");
	const productName = stringValue(formData, "productName");
	const productNumber = stringValue(formData, "productNumber") || null;
	const description = stringValue(formData, "description") || null;
	const serialNumber = stringValue(formData, "serialNumber") || null;
	const manufacturerChoice = stringValue(formData, "manufacturerId");
	const manufacturerName = stringValue(formData, "manufacturerName");
	const errors: string[] = [];

	if (!entryName) errors.push("Equipment name is required.");
	if (!productName) errors.push("Product name is required.");
	const sluggedValues = [
		["Equipment name", entryName],
		["Product name", productName],
		...(manufacturerChoice === NEW_MANUFACTURER
			? [["Manufacturer name", manufacturerName] as const]
			: []),
	] as const;
	for (const [label, value] of sluggedValues) {
		if (value && !slugify(value)) errors.push(`${label} needs at least one letter or number.`);
	}
	if (!manufacturerChoice) errors.push("Choose or add a manufacturer.");
	if (manufacturerChoice === NEW_MANUFACTURER && !manufacturerName) {
		errors.push("Manufacturer name is required when adding a manufacturer.");
	}

	const container = context.get(services);
	const [db, security] = container.get(ApplicationDatabase, Security);
	let manufacturer: { id: number; name: string } | undefined;
	if (manufacturerChoice && manufacturerChoice !== NEW_MANUFACTURER) {
		const id = Number(manufacturerChoice);
		if (!Number.isSafeInteger(id) || id < 1) {
			errors.push("Choose a valid manufacturer.");
		} else {
			manufacturer = await db
				.select({ id: Manufacturer.id, name: Manufacturer.name })
				.from(Manufacturer)
				.where(and(eq(Manufacturer.id, id), isNull(Manufacturer.metadataArchivedAt)))
				.get();
			if (!manufacturer) errors.push("The selected manufacturer is no longer available.");
		}
	}

	if (errors.length > 0) return data({ error: errors.join(" ") }, { status: 400 });

	const metadata = { metadataCreatorId: security.userId, metadataCreationTimestamp: new Date() };
	const manufacturerId = manufacturer?.id ?? id53();
	const productId = id53();
	const entryId = id53();
	const productBase = slugify(productNumber ?? productName);
	const entryBase = slugify(entryName);
	let productSlug = productBase;
	let entrySlug = entryBase;
	let productSuffix = 2;
	let entrySuffix = 2;

	for (let attempt = 0; attempt < 10; attempt++) {
		// Separate inserts avoid a large parameter list per statement.
		const statements = [
			...(manufacturerChoice === NEW_MANUFACTURER
				? [
						db.insert(Manufacturer).values({
							id: manufacturerId,
							name: manufacturerName,
							slug: slugify(manufacturerName),
							...metadata,
						}),
					]
				: []),
			db.insert(Product).values({
				id: productId,
				manufacturerId,
				slug: productSlug,
				name: productName,
				productNumber,
				description,
				origin: "user",
				...metadata,
			}),
			db.insert(Id).values({ id: entryId }),
			db.insert(InventoryEntry).values({
				id: entryId,
				slug: entrySlug,
				name: entryName,
				kind: "equipment",
				productId,
				serialNumber,
				...metadata,
			}),
			db
				.insert(InventoryEntryProduct)
				.values({ inventoryEntryId: entryId, productId, ...metadata }),
		];

		try {
			await db.batch(statements);
			return redirect(`/inventory/${entrySlug}`, 303);
		} catch (error) {
			if (!(error instanceof UniqueConstraintViolationError)) throw error;
			if (error.isOn([Product.slug])) {
				productSlug = `${productBase}-${productSuffix++}`;
				continue;
			}
			if (error.isOn([InventoryEntry.slug])) {
				entrySlug = `${entryBase}-${entrySuffix++}`;
				continue;
			}
			if (error.isOn([Manufacturer.slug]))
				return data(
					{ error: "This manufacturer already exists. Choose it instead." },
					{ status: 400 },
				);
			if (error.isOn([InventoryEntry.serialNumber]))
				return data({ error: "The serial number is already in use." }, { status: 400 });
			throw error;
		}
	}

	return data(
		{ error: "Could not assign unique product and equipment addresses. Choose different names." },
		{ status: 409 },
	);
}

export default function InventoryNew({ actionData, loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const submitting = navigation.formData !== undefined;
	const [manufacturer, setManufacturer] = useState<ManufacturerOption>(EMPTY_MANUFACTURER);
	const manufacturerOptions: ManufacturerOption[] = [
		{ id: NEW_MANUFACTURER, name: "Add a manufacturer", isNew: true },
		...loaderData.manufacturers.map((candidate) => ({
			id: String(candidate.id),
			name: candidate.name,
			isNew: false,
		})),
	];

	return (
		<div className="max-w-3xl">
			<Link
				to={`/inventory`}
				className="text-sm text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus"
			>
				← Inventory
			</Link>
			<Heading className="mt-4">Add equipment</Heading>
			<Text className="mt-2">
				Record a physical unit and the reusable product information known about it.
			</Text>

			<Form method="post" className="mt-8 space-y-8">
				<section>
					<Subheading>Physical unit</Subheading>
					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						<Field label="Equipment name" name="entryName" required />
						<Field label="Serial number" name="serialNumber" />
					</div>
				</section>

				<section className="border-t border-border pt-6">
					<Subheading>Product</Subheading>
					<Text className="mt-1 text-sm">
						This product is marked as user entered. It can be reused when another unit is added.
					</Text>
					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						<Field label="Product name" name="productName" required />
						<Field label="Model number" name="productNumber" />
						<div>
							<label htmlFor="manufacturer" className="block text-sm font-medium text-foreground">
								Manufacturer *
							</label>
							<input type="hidden" name="manufacturerId" value={manufacturer.id} />
							<Combobox
								value={manufacturer}
								onChange={(option) => setManufacturer(option ?? EMPTY_MANUFACTURER)}
								options={manufacturerOptions}
								displayValue={(option) => (option?.id ? option.name : undefined)}
								filter={(option, query) =>
									option.isNew || option.name.toLowerCase().includes(query.toLowerCase())
								}
								placeholder="Search manufacturers"
								aria-label="Manufacturer"
								className="mt-1"
							>
								{(option) => <ComboboxOption value={option}>{option.name}</ComboboxOption>}
							</Combobox>
						</div>
						{manufacturer.isNew ? (
							<Field
								label="New manufacturer name"
								name="manufacturerName"
								required
								description="Use Unknown manufacturer when the maker cannot be identified."
							/>
						) : null}
					</div>
					<label className="mt-4 block text-sm font-medium text-foreground">
						Description
						<textarea
							name="description"
							rows={4}
							className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-focus focus:outline-none"
						/>
					</label>
				</section>

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
					<Link to={`/inventory`} className="text-sm text-foreground-muted hover:text-foreground">
						Cancel
					</Link>
				</div>
			</Form>
		</div>
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
	description?: string;
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
