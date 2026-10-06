import { eq } from "drizzle-orm";
import { Outlet } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";

import type { Route } from "./+types/samples.$batchSlug.ts";

export const handle = {
	breadcrumb: (loaderData) => loaderData?.name,
} satisfies BreadcrumbHandle<Route.ComponentProps["loaderData"]>;

/**
 * Loads the name of the batch for the breadcrumb trail. An archived batch is
 * found as well, because its page stays readable. An unknown slug answers 404.
 */
export async function loader({ context, params }: Route.LoaderArgs) {
	const batch = await context
		.get(services)
		.get(ApplicationDatabase)
		.select({ name: SampleBatch.name })
		.from(SampleBatch)
		.where(eq(SampleBatch.slug, params.batchSlug))
		.get();

	if (!batch) {
		throw new Response(`Sample "${params.batchSlug}" not found.`, { status: 404 });
	}

	return batch;
}

/**
 * Provides the page of one batch and the page that edits it. Both pages
 * render in place of each other.
 */
export default function SamplesBatchSlug() {
	return <Outlet />;
}
