import { eq } from "drizzle-orm";

import type { Repository } from "~/app/data/types";
import { getGlobalDb } from "~/app/db/connect.server";
import { Repository as RepositoryTable } from "~/drizzle/schema/global.Repository";

export function listRepositories(): Repository[] {
	return getGlobalDb()
		.select({
			id: RepositoryTable.id,
			slug: RepositoryTable.slug,
			name: RepositoryTable.name,
		})
		.from(RepositoryTable)
		.all();
}

export function findRepository(slug: string): Repository | undefined {
	return getGlobalDb()
		.select({
			id: RepositoryTable.id,
			slug: RepositoryTable.slug,
			name: RepositoryTable.name,
		})
		.from(RepositoryTable)
		.where(eq(RepositoryTable.slug, slug))
		.get();
}
