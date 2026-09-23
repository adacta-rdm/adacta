import clsx from "clsx";
/**
 * One inventory entry.
 *
 * The page shows the selected inventory entry. A rig keeps its selected view
 * in the path and renders that view below the shared heading.
 */
import { and, eq, isNull } from "drizzle-orm";
import { NavLink, Outlet } from "react-router";

import { services } from "~/app/.server/context.ts";
import { KindIcon } from "~/app/components/KindIcon.tsx";
import { formatLocation } from "~/app/lib/location.ts";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";

import type { Route } from "./+types/$repo.inventory.$entrySlug.ts";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

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

	const row = await db
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
		<div className="space-y-6">
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
			</div>

			{isRig ? <RigTabs /> : null}

			<Outlet />
		</div>
	);
}

function RigTabs() {
	return (
		<nav aria-label="Rig views" className="border-b border-border">
			<div className="-mb-px flex gap-6 overflow-x-auto">
				<RigTab end to=".">
					Overview
				</RigTab>
				<RigTab to="pid">P&amp;ID</RigTab>
				<RigTab to="data">Data</RigTab>
			</div>
		</nav>
	);
}

function RigTab({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
	return (
		<NavLink
			to={to}
			end={end}
			className={({ isActive }) =>
				clsx(
					"border-b-2 px-1 pb-3 text-sm font-semibold whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
					isActive
						? "border-accent text-foreground"
						: "border-transparent text-foreground-muted hover:border-border-strong hover:text-foreground",
				)
			}
		>
			{children}
		</NavLink>
	);
}
