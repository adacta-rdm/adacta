import { defineConfig } from "drizzle-kit";

/**
 * One repository database. Every repository is a separate SQLite file built
 * from this same set of migrations.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./drizzle/schema/repo.*.ts",
	out: "./drizzle/migrations/repo",
});
