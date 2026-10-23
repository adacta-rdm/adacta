import { and, eq, isNull, isNotNull, notExists } from "drizzle-orm";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { ArchiveButton } from "~/app/components/ArchiveButton.tsx";
import { ListPanel, ListEmpty, ListView } from "~/app/components/ListPanel.tsx";
import { ListTable, ListTableHead } from "~/app/components/ListTable.tsx";
import { formatTimestamp } from "~/app/lib/dates.ts";
import { formatLocation } from "~/app/lib/location.ts";
import { ListFilter } from "~/app/route-components/ListFilter.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";

import type { Route } from "./+types/inventory._index.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const linkClassName =
	"font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-focus";

export async function loader({ context, request }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const query = new URL(request.url).searchParams.get("q") ?? "";
	const params = new URL(request.url).searchParams;
	const showArchived = {
		rigs: params.get("rigs") === "archived",
		equipment: params.get("equipment") === "archived",
	};
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);

	// Location is optional. Both lists include entries without a building or room.
	const rigs = await db
		.select({
			id: Rig.id,
			slug: Rig.slug,
			name: Rig.name,
			archivedAt: Rig.metadataArchivedAt,
			location: { building: Rig.building, room: Rig.room, position: Rig.position },
		})
		.from(Rig);

	const equipment = await db
		.select({
			id: Equipment.id,
			slug: Equipment.slug,
			name: Product.name,
			serialNumber: Equipment.serialNumber,
			archivedAt: Equipment.metadataArchivedAt,
			location: {
				building: Equipment.building,
				room: Equipment.room,
				position: Equipment.position,
			},
			product: {
				manufacturerSlug: Manufacturer.slug,
				manufacturerName: Manufacturer.name,
				productSlug: Product.slug,
				productNumber: Product.productNumber,
				subtitle: Product.subtitle,
			},
		})
		.from(Equipment)
		.innerJoin(Product, eq(Product.id, Equipment.productId))
		.innerJoin(Manufacturer, eq(Manufacturer.id, Product.manufacturerId));

	// Each word may match a different field. For example, "B3 balance" matches
	// a balance whose recorded building is B3.
	function matches(values: (string | null)[]) {
		const text = values.filter(Boolean).join(" ").toLowerCase();

		return words.every((word) => text.includes(word));
	}

	return {
		query,
		showArchived,
		counts: {
			rigs: {
				active: rigs.filter((entry) => entry.archivedAt === null).length,
				archived: rigs.filter((entry) => entry.archivedAt !== null).length,
			},
			equipment: {
				active: equipment.filter((entry) => entry.archivedAt === null).length,
				archived: equipment.filter((entry) => entry.archivedAt !== null).length,
			},
		},
		rigs: rigs
			.filter((rig) => (rig.archivedAt !== null) === showArchived.rigs)
			.filter((rig) => matches([rig.name, formatLocation(rig.location)]))
			.sort((left, right) => collator.compare(left.name, right.name)),
		equipment: equipment
			.filter((entry) => (entry.archivedAt !== null) === showArchived.equipment)
			.filter((entry) =>
				matches([
					entry.name,
					entry.serialNumber,
					formatLocation(entry.location),
					entry.product.manufacturerName,
					entry.product.productNumber,
					entry.product.subtitle,
				]),
			)
			.sort(
				(left, right) =>
					collator.compare(left.name, right.name) ||
					collator.compare(left.serialNumber ?? "", right.serialNumber ?? ""),
			),
	};
}

type ArchiveError = {
	kind: string | null;
	slug: string | null;
	message: string;
	dependencies: { name: string; to: string }[];
};

export async function action({ context, request }: Route.ActionArgs) {
	const form = await request.formData();
	const kind = form.get("kind");
	const slug = form.get("slug");
	const operation = form.get("operation");
	const reject = (
		status: number,
		message: string,
		dependencies: ArchiveError["dependencies"] = [],
	) =>
		data(
			{
				archiveError: {
					kind: typeof kind === "string" ? kind : null,
					slug: typeof slug === "string" ? slug : null,
					message,
					dependencies,
				},
			},
			{ status },
		);

	if (
		(kind !== "rig" && kind !== "equipment") ||
		typeof slug !== "string" ||
		!slug ||
		(operation !== "archive" && operation !== "restore") ||
		["kind", "slug", "operation"].some((field) => form.getAll(field).length !== 1)
	)
		return reject(400, "The inventory action is not recognized.");

	const db = context.get(services).get(ApplicationDatabase);
	const table = kind === "rig" ? Rig : Equipment;
	const archiving = operation === "archive";
	const expectedState = archiving
		? isNull(table.metadataArchivedAt)
		: isNotNull(table.metadataArchivedAt);
	const entry = await db
		.select({ id: table.id })
		.from(table)
		.where(and(eq(table.slug, slug), expectedState))
		.get();
	if (!entry)
		throw new Response("Inventory item not found in the expected archive state.", { status: 404 });

	// The dependency condition belongs to the update. A diagram saved after
	// the page was opened therefore still prevents an incompatible change.
	const activeRigs = db
		.select({ id: PIDNode.id })
		.from(PIDNode)
		.innerJoin(Rig, eq(Rig.id, PIDNode.rigId))
		.where(
			and(
				eq(PIDNode.equipmentId, Equipment.id),
				isNull(Rig.metadataArchivedAt),
				isNull(PIDNode.metadataArchivedAt),
			),
		);
	const archivedEquipment = db
		.select({ id: PIDNode.id })
		.from(PIDNode)
		.innerJoin(Equipment, eq(Equipment.id, PIDNode.equipmentId))
		.where(
			and(
				eq(PIDNode.rigId, Rig.id),
				isNotNull(Equipment.metadataArchivedAt),
				isNull(PIDNode.metadataArchivedAt),
			),
		);
	const dependencyCondition =
		kind === "equipment" && archiving
			? notExists(activeRigs)
			: kind === "rig" && !archiving
				? notExists(archivedEquipment)
				: undefined;

	const [changed] = await db.batch([
		db
			.update(table)
			.set({ metadataArchivedAt: archiving ? new Date() : null })
			.where(and(eq(table.id, entry.id), expectedState, dependencyCondition)),
	]);

	if (changed!.changes === 0) {
		const current = await db
			.select({ id: table.id })
			.from(table)
			.where(and(eq(table.id, entry.id), expectedState))
			.get();
		if (!current)
			throw new Response("Inventory item not found in the expected archive state.", {
				status: 404,
			});

		if (kind === "equipment") {
			const rigs = await db
				.selectDistinct({ name: Rig.name, slug: Rig.slug })
				.from(PIDNode)
				.innerJoin(Rig, eq(Rig.id, PIDNode.rigId))
				.where(
					and(
						eq(PIDNode.equipmentId, entry.id),
						isNull(Rig.metadataArchivedAt),
						isNull(PIDNode.metadataArchivedAt),
					),
				)
				.orderBy(Rig.name);
			return reject(
				409,
				"Remove this equipment from the listed active rigs, or archive those rigs first.",
				rigs.map((rig) => ({ name: rig.name, to: `/inventory/rigs/${rig.slug}/pid` })),
			);
		}

		const equipment = await db
			.selectDistinct({ name: Product.name, slug: Equipment.slug })
			.from(PIDNode)
			.innerJoin(Equipment, eq(Equipment.id, PIDNode.equipmentId))
			.innerJoin(Product, eq(Product.id, Equipment.productId))
			.where(
				and(
					eq(PIDNode.rigId, entry.id),
					isNotNull(Equipment.metadataArchivedAt),
					isNull(PIDNode.metadataArchivedAt),
				),
			)
			.orderBy(Product.name);
		return reject(
			409,
			"Restore the listed equipment before restoring this rig.",
			equipment.map((item) => ({ name: item.name, to: `/inventory/equipment/${item.slug}` })),
		);
	}

	// Preserve only the list's own parameters. Redirects always stay in Inventory.
	const search = new URL(request.url).searchParams;
	const retained = new URLSearchParams();
	for (const key of ["q", "rigs", "equipment"]) {
		const value = search.get(key);
		if (value !== null) retained.set(key, value);
	}

	return redirect(`/inventory${retained.size ? `?${retained}` : ""}`, 303);
}

function ArchiveControl({
	kind,
	slug,
	name,
	archivedAt,
	busy,
	pending,
	error,
}: {
	kind: "rig" | "equipment";
	slug: string;
	name: string;
	archivedAt: Date | null;
	busy: boolean;
	pending: boolean;
	error?: ArchiveError | undefined;
}) {
	const operation = archivedAt ? "restore" : "archive";
	const failure = error?.kind === kind && error.slug === slug ? error : undefined;

	return (
		<div>
			<Form method="post">
				<input type="hidden" name="kind" value={kind} />
				<input type="hidden" name="slug" value={slug} />
				<ArchiveButton
					operation={operation}
					recordName={name}
					name="operation"
					value={operation}
					disabled={busy}
					pending={pending}
				/>
			</Form>
			{failure && (
				<div role="alert" className="mt-2 max-w-72 text-sm text-danger">
					<p>{failure.message}</p>
					<ul className="mt-1 space-y-1">
						{failure.dependencies.map((item) => (
							<li key={item.to}>
								<Link to={item.to} className={linkClassName}>
									{item.name}
								</Link>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

export default function InventoryIndex({ loaderData, actionData }: Route.ComponentProps) {
	const { rigs, equipment, query, showArchived, counts } = loaderData;
	const navigation = useNavigation();
	const searching = navigation.state !== "idle";

	// Each tab link retains the other panel's selection and the shared query.
	const archiveFor = (kind: "rigs" | "equipment") => {
		const address = (archived: boolean) => {
			const params = new URLSearchParams();
			if (query) params.set("q", query);

			for (const panel of ["rigs", "equipment"] as const) {
				if (panel === kind ? archived : showArchived[panel]) params.set(panel, "archived");
			}

			return `/inventory${params.size ? `?${params}` : ""}`;
		};

		return {
			active: { to: address(false), count: counts[kind].active },
			archived: { to: address(true), count: counts[kind].archived },
			showArchived: showArchived[kind],
		};
	};

	return (
		<div className="space-y-6">
			<div>
				<Heading>Inventory</Heading>
				<Subheading className="mt-1">Custom rigs and standalone equipment.</Subheading>
			</div>

			<div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
				<Link to="/inventory/new" className={linkClassName}>
					Add inventory item
				</Link>
				<Link to="/catalog" className={linkClassName}>
					Import from catalog
				</Link>
			</div>

			{actionData?.archiveError &&
				!(
					actionData.archiveError.kind === "rig"
						? rigs
						: actionData.archiveError.kind === "equipment"
							? equipment
							: []
				).some((entry) => entry.slug === actionData.archiveError.slug) && (
					<p role="alert" className="text-sm text-danger">
						{actionData.archiveError.message}
					</p>
				)}

			<ListView
				filter={
					<ListFilter
						id="inventory-filter"
						label="Filter inventory"
						placeholder="Name, serial number, model, or location"
						query={query}
						hiddenFields={{
							...(showArchived.rigs ? { rigs: "archived" } : {}),
							...(showArchived.equipment ? { equipment: "archived" } : {}),
						}}
					/>
				}
			>
				<div className="space-y-3">
					<Subheading>Rigs</Subheading>
					<ListPanel label="Rigs" busy={searching} archive={archiveFor("rigs")}>
						{rigs.length === 0 ? (
							<ListEmpty>
								{query.trim()
									? "No rigs match the filter."
									: showArchived.rigs
										? "No rigs have been archived."
										: "No rigs have been recorded yet."}
							</ListEmpty>
						) : (
							<ListTable label="Rigs">
								<ListTableHead>
									<tr>
										<th scope="col">Name</th>
										<th scope="col">Location</th>
										<th scope="col">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</ListTableHead>
								<tbody className="divide-y divide-border">
									{rigs.map((rig) => (
										<tr key={rig.id} className="hover:bg-surface-muted">
											<th scope="row" className="py-3 pr-4 pl-5 text-left font-normal">
												<Link to={`/inventory/rigs/${rig.slug}`} className={linkClassName}>
													{rig.name}
												</Link>
												{rig.archivedAt && (
													<p className="mt-1 text-xs text-foreground-muted">
														Archived{" "}
														<time dateTime={rig.archivedAt.toISOString()}>
															{formatTimestamp(rig.archivedAt)}
														</time>
													</p>
												)}
											</th>
											<td className="py-3 pr-4 text-foreground-muted">
												{formatLocation(rig.location) || "No location recorded"}
											</td>
											<td className="py-3 pr-5 align-top">
												<ArchiveControl
													kind="rig"
													slug={rig.slug}
													name={rig.name}
													archivedAt={rig.archivedAt}
													busy={navigation.state !== "idle"}
													pending={
														navigation.formData?.get("kind") === "rig" &&
														navigation.formData?.get("slug") === rig.slug
													}
													error={actionData?.archiveError}
												/>
											</td>
										</tr>
									))}
								</tbody>
							</ListTable>
						)}
					</ListPanel>
				</div>
				<div className="space-y-3">
					<Subheading>Equipment</Subheading>
					<ListPanel label="Equipment" busy={searching} archive={archiveFor("equipment")}>
						{equipment.length === 0 ? (
							<ListEmpty>
								{query.trim()
									? "No equipment matches the filter."
									: showArchived.equipment
										? "No equipment has been archived."
										: "No equipment has been recorded yet."}
							</ListEmpty>
						) : (
							<ListTable label="Equipment">
								<ListTableHead>
									<tr>
										<th scope="col">Equipment</th>
										<th scope="col">Catalog model</th>
										<th scope="col">Location</th>
										<th scope="col">
											<span className="sr-only">Actions</span>
										</th>
									</tr>
								</ListTableHead>
								<tbody className="divide-y divide-border">
									{equipment.map((entry) => (
										<tr key={entry.id} className="hover:bg-surface-muted">
											<th scope="row" className="py-3 pr-4 pl-5 text-left font-normal">
												<Link to={`/inventory/equipment/${entry.slug}`} className={linkClassName}>
													{entry.name}
												</Link>
												{entry.archivedAt && (
													<p className="mt-1 text-xs text-foreground-muted">
														Archived{" "}
														<time dateTime={entry.archivedAt.toISOString()}>
															{formatTimestamp(entry.archivedAt)}
														</time>
													</p>
												)}
											</th>
											<td className="py-3 pr-4">
												<Link
													to={`/catalog/${entry.product.manufacturerSlug}/${entry.product.productSlug}`}
													className={linkClassName}
												>
													{entry.product.productNumber ?? entry.name}
												</Link>
												<p className="text-foreground-muted">{entry.product.manufacturerName}</p>
											</td>
											<td className="py-3 pr-4 text-foreground-muted">
												{formatLocation(entry.location) || "No location recorded"}
											</td>
											<td className="py-3 pr-5 align-top">
												<ArchiveControl
													kind="equipment"
													slug={entry.slug}
													name={entry.name}
													archivedAt={entry.archivedAt}
													busy={navigation.state !== "idle"}
													pending={
														navigation.formData?.get("kind") === "equipment" &&
														navigation.formData?.get("slug") === entry.slug
													}
													error={actionData?.archiveError}
												/>
											</td>
										</tr>
									))}
								</tbody>
							</ListTable>
						)}
					</ListPanel>
				</div>
			</ListView>
		</div>
	);
}
