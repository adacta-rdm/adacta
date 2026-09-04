/**
 * One inventory entry.
 *
 * The page shows what the record itself holds: the name, the kind, the place,
 * and who entered it. Cross references to samples and data come later, once
 * those relations exist.
 */
import { and, eq, isNull } from "drizzle-orm";

import { services } from "~/app/.server/context";
import { KindIcon } from "~/app/components/KindIcon";
import { formatTimestamp } from "~/app/lib/dates";
import { formatLocation } from "~/app/lib/location";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { Heading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";

import type { Route } from "./+types/$repo.inventory.$entrySlug";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary";

/**
 * The route has an error boundary, so it can render without loader data. The
 * title then names the section rather than an entry.
 */
export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: loaderData ? `${loaderData.entry.name} — Adacta` : "Inventory — Adacta" }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
	const container = context.get(services);
	const [db, access] = container.get(RepoDB, RepoAccess);

	const row = db
		.select()
		.from(InventoryEntry)
		.where(
			and(eq(InventoryEntry.slug, params.entrySlug), isNull(InventoryEntry.metadataArchivedAt)),
		)
		.get();

	if (!row) {
		throw new Response(`Inventory entry "${params.entrySlug}" not found.`, { status: 404 });
	}

	// The list holds the users who may open the repository. A creator whose
	// grant was revoked is therefore absent from it, and the lookup returns
	// undefined.
	const creator = (await access.users()).find((user) => user.id === row.metadataCreatorId);

	return {
		entry: {
			slug: row.slug,
			name: row.name,
			kind: row.kind,
			location: {
				building: row.locationBuildingIdentifier,
				room: row.locationRoomIdentifier,
				label: row.locationLabel,
			},
			createdAt: row.metadataCreationTimestamp,
			createdBy: creator,
		},
	};
}

export default function RepoInventoryEntrySlug({ loaderData }: Route.ComponentProps) {
	const { entry } = loaderData;
	const isRig = entry.kind === "rig";
	const location = formatLocation(entry.location);

	return (
		<div className="space-y-8">
			<div>
				<Heading>{entry.name}</Heading>

				<p className="mt-2 flex items-center gap-2 text-sm text-foreground-muted">
					<KindIcon kind={entry.kind} className="size-4" />
					{isRig ? "Rig" : "Equipment"}
				</p>

				{location ? (
					<p className="mt-2 text-sm text-foreground-muted">Location: {location}</p>
				) : (
					<Text className="mt-2">No location has been recorded.</Text>
				)}

				<p className="mt-2 text-sm text-foreground-muted">
					Added by: {entry.createdBy?.name ?? "Unknown"}
				</p>

				<p className="mt-2 text-sm text-foreground-muted">
					Added to Adacta:{" "}
					<time dateTime={entry.createdAt.toISOString()}>{formatTimestamp(entry.createdAt)}</time>
				</p>
			</div>
		</div>
	);
}
