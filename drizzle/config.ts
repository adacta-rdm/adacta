import { defineConfig } from "drizzle-kit";

/**
 * Authentication and laboratory records share one schema and migration history.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./drizzle/schema/*.ts",
	out: "./drizzle/migrations",
});
