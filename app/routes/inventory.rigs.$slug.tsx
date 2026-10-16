/**
 * The rig keeps its selected view in the path. Its views share one heading.
 */
import clsx from "clsx";
import { and, eq, isNull } from "drizzle-orm";
import { NavLink, Outlet } from "react-router";

import { services } from "~/app/.server/context.ts";
import { KindIcon } from "~/app/components/KindIcon.tsx";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { formatLocation } from "~/app/lib/location.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";

import type { Route } from "./+types/inventory.rigs.$slug.ts";

export const handle = {
	breadcrumb: (loaderData) => loaderData?.name,
} satisfies BreadcrumbHandle<Route.ComponentProps["loaderData"]>;

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary.tsx";

/**
 * The route has an error boundary, so it can render without loader data. The
 * title then names the section rather than an entry.
 */
export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: loaderData ? `${loaderData.name} — Adacta` : "Inventory — Adacta" }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);

	const row = (
		await db
			.select({
				slug: Rig.slug,
				name: Rig.name,
				location: {
					building: Rig.building,
					room: Rig.room,
					position: Rig.position,
				},
				createdAt: Rig.metadataCreationTimestamp,
				createdBy: User.name,
			})
			.from(Rig)
			// A record may refer to a deleted user. Its name is then unavailable.
			.leftJoin(User, eq(User.id, Rig.metadataCreatorId))
			.where(and(isNull(Rig.metadataArchivedAt), eq(Rig.slug, params.slug)))
	).at(0);

	if (!row) {
		throw new Response(`Rig "${params.slug}" not found.`, { status: 404 });
	}

	return row;
}

export default function InventoryRigsSlug({ loaderData }: Route.ComponentProps) {
	const entry = loaderData;
	const location = formatLocation(entry.location);

	return (
		<div className="space-y-6">
			<div>
				<Heading>{entry.name}</Heading>

				<p className="mt-2 flex items-center gap-2 text-sm text-foreground-muted">
					<KindIcon kind="rig" className="size-4" />
					Rig
				</p>

				{location ? (
					<p className="mt-2 text-sm text-foreground-muted">Location: {location}</p>
				) : (
					<Text className="mt-2">No location has been recorded.</Text>
				)}
			</div>

			<RigTabs />

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
				<RigTab to="notes">Notes</RigTab>
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
