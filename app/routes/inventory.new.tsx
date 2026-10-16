import { and, asc, eq, isNull } from "drizzle-orm";
import { useState } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { inventoryEntryPath } from "~/app/lib/inventory.ts";
import { availableSlug, slugify } from "~/app/lib/slugs.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { Combobox, ComboboxOption } from "~/catalyst-ui/combobox.tsx";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";
import { id53 } from "~/lib/id53/id53.ts";
import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";

import type { Route } from "./+types/inventory.new.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

const NEW_MANUFACTURER = "new";

type ManufacturerOption = { id: string; name: string; isNew: boolean };
const EMPTY_MANUFACTURER: ManufacturerOption = { id: "", name: "", isNew: false };

export function meta() {
	return [{ title: "Add inventory item — Adacta" }];
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
	const kind = stringValue(formData, "kind") || "equipment";
	const container = context.get(services);
	const [db, security] = container.get(ApplicationDatabase, Security);
	if (kind === "rig") return addRig(db, security, stringValue(formData, "entryName"));
	if (kind !== "equipment") {
		return data({ error: "Choose a valid inventory type." }, { status: 400 });
	}

	const productName = stringValue(formData, "productName");
	const productNumber = stringValue(formData, "productNumber") || null;
	const description = stringValue(formData, "description") || null;
	const serialNumber = stringValue(formData, "serialNumber") || null;
	const manufacturerChoice = stringValue(formData, "manufacturerId");
	const manufacturerName = stringValue(formData, "manufacturerName");
	const errors: string[] = [];

	if (!productName) errors.push("Product name is required.");
	const sluggedValues = [
		["Product name", productName],
		["Model number", productNumber ?? ""],
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

	let manufacturer: { id: number } | undefined;
	if (manufacturerChoice && manufacturerChoice !== NEW_MANUFACTURER) {
		const id = Number(manufacturerChoice);
		if (!Number.isSafeInteger(id) || id < 1) {
			errors.push("Choose a valid manufacturer.");
		} else {
			manufacturer = await db
				.select({ id: Manufacturer.id })
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
	for (let attempt = 0; attempt < 5; attempt++) {
		// These candidates may be taken by another write. The unique constraints
		// decide whether the complete batch can be stored.
		const productSlugs = await db
			.select({ slug: Product.slug })
			.from(Product)
			.where(eq(Product.manufacturerId, manufacturerId))
			.all();
		const equipmentSlugs = await db.select({ slug: Equipment.slug }).from(Equipment).all();
		const productSlug = availableSlug(
			productNumber ?? productName,
			productSlugs.map(({ slug }) => slug),
		);
		const entrySlug = availableSlug(
			productName,
			equipmentSlugs.map(({ slug }) => slug),
		);

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
			db.insert(Equipment).values({
				id: entryId,
				slug: entrySlug,
				productId,
				serialNumber,
				...metadata,
			}),
		];

		try {
			await db.batch(statements);
			return redirect(inventoryEntryPath("equipment", entrySlug), 303);
		} catch (error) {
			if (!(error instanceof UniqueConstraintViolationError)) throw error;
			if (error.isOn([Product.slug]) || error.isOn([Equipment.slug])) continue;

			if (error.isOn([Manufacturer.slug]))
				return data(
					{ error: "This manufacturer already exists. Choose it instead." },
					{ status: 400 },
				);
			throw error;
		}
	}

	return data(
		{
			error:
				"Could not assign unique product and equipment addresses. Try adding the equipment again.",
		},
		{ status: 409 },
	);
}

export default function InventoryNew({ actionData, loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const submitting = navigation.formData !== undefined;
	const [manufacturer, setManufacturer] = useState<ManufacturerOption>(EMPTY_MANUFACTURER);
	const [kind, setKind] = useState<"rig" | "equipment">("equipment");
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
			<Heading className="mt-4">Add inventory item</Heading>
			<Text className="mt-2">Add a rig or record a physical equipment unit.</Text>

			<Form method="post" className="mt-8 space-y-8">
				<fieldset>
					<legend className="text-sm font-semibold">Type</legend>
					<div className="mt-3 flex gap-5 text-sm">
						<label className="flex items-center gap-2">
							<input
								type="radio"
								name="kind"
								value="equipment"
								checked={kind === "equipment"}
								onChange={() => setKind("equipment")}
							/>
							Equipment
						</label>
						<label className="flex items-center gap-2">
							<input
								type="radio"
								name="kind"
								value="rig"
								checked={kind === "rig"}
								onChange={() => setKind("rig")}
							/>
							Rig
						</label>
					</div>
				</fieldset>

				{kind === "rig" ? (
					<Field label="Rig name" name="entryName" required />
				) : (
					<>
						<section>
							<Subheading>Physical unit</Subheading>
							<div className="mt-4 grid gap-4 sm:grid-cols-2">
								<Field label="Serial number" name="serialNumber" />
							</div>
						</section>

						<section className="border-t border-border pt-6">
							<Subheading>Product</Subheading>
							<Text className="mt-1 text-sm">
								This product is marked as user entered. It can be reused when another unit is added.
							</Text>
							<div className="mt-4 grid gap-4 sm:grid-cols-2">
								<Field
									label="Product name"
									name="productName"
									required
									description="This name is shown for every physical unit of the product."
								/>
								<Field label="Model number" name="productNumber" />
								<div>
									<label
										htmlFor="manufacturer"
										className="block text-sm font-medium text-foreground"
									>
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
					</>
				)}

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
						{submitting ? "Adding…" : kind === "rig" ? "Add rig" : "Add equipment"}
					</button>
					<Link to={`/inventory`} className="text-sm text-foreground-muted hover:text-foreground">
						Cancel
					</Link>
				</div>
			</Form>
		</div>
	);
}

async function addRig(db: ApplicationDatabase, security: Security, name: string) {
	if (!name || !slugify(name)) {
		return data({ error: "Rig name needs at least one letter or number." }, { status: 400 });
	}

	for (let attempt = 0; attempt < 5; attempt++) {
		const rigSlugs = await db.select({ slug: Rig.slug }).from(Rig).all();
		const slug = availableSlug(
			name,
			rigSlugs.map(({ slug }) => slug),
		);
		const id = id53();

		try {
			await db.batch([
				db.insert(Id).values({ id }),
				db.insert(Rig).values({
					id,
					slug,
					name,
					metadataCreatorId: security.userId,
					metadataCreationTimestamp: new Date(),
				}),
			]);
			return redirect(inventoryEntryPath("rig", slug), 303);
		} catch (error) {
			if (error instanceof UniqueConstraintViolationError && error.isOn([Rig.slug])) continue;
			throw error;
		}
	}

	return data(
		{ error: "Could not assign a unique rig address. Try adding the rig again." },
		{ status: 409 },
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
