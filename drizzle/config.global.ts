import { defineConfig } from "drizzle-kit";

/**
 * The global database: which repositories exist, and later, users.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./drizzle/schema/global.*.ts",
	out: "./drizzle/migrations/global",
});
