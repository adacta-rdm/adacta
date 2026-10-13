import { Env } from "~/lib/env/Env.ts";
import { createAppContainer } from "~/runtimes/bun/appContainer.ts";
import { deleteLocalData } from "~/runtimes/bun/cli/helpers/deleteLocalData.ts";
import { migrationsApply } from "~/runtimes/bun/cli/migrationsApply.ts";
import { seedDatabase } from "~/seed/seed.ts";

/**
 * Deletes the SQLite database and the stored files, applies the migrations,
 * and loads one preset through the same services as the app.
 */
export async function seedLoad(preset: string | undefined): Promise<void> {
	deleteLocalData(new Env());
	await migrationsApply();

	await seedDatabase(createAppContainer(), preset);
}
