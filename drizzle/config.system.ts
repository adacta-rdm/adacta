import { defineConfig } from "drizzle-kit";

/**
 * The system database: users, sessions, and which repositories exist.
 */
export default defineConfig({
	dialect: "sqlite",
	schema: "./drizzle/schema/system.*.ts",
	out: "./drizzle/migrations/system",
});
