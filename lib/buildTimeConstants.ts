/**
 * The constants defined in this file are embedded into the bundles at build time using the __ADACTA global.
 * During development, the __ADACTA global is not defined, so the constants are defined dynamically.
 *
 * This approach allows us to also bundle text files into the build, while maintaining compatibility with tsx which is
 * used in development (while tsx uses esbuild under the hood, it does not support esbuild loaders).
 */
import { readFileSync } from "node:fs";

// NOTE: This import should not be shortened to "~/dev/sh" because it is used in the build process.
import { shSync } from "../dev/sh";
import { version } from "../package.json";

globalThis.__ADACTA = globalThis.__ADACTA ?? {};

export const COMMIT_SHA =
	__ADACTA.COMMIT_SHA ?? shSync("git rev-parse --short HEAD").trim().slice(0, 8);
export const BUILD_DATE = __ADACTA.BUILD_DATE ?? new Date().toISOString().slice(0, 10);

/**
 * The version specified in the package.json file.
 */
export const PACKAGE_VERSION = __ADACTA.PACKAGE_VERSION ?? version;

export const TYPE_DEFS =
	__ADACTA.TYPE_DEFS ??
	readFileSync(`${__dirname}/../apps/repo-server/src/graphql/generated/schema.graphql`, "utf-8");

export const INIT_REPO_SQL =
	__ADACTA.INIT_REPO_SQL ?? readFileSync(`${__dirname}/../drizzle/init-repo.sql`, "utf-8");

export const INIT_MIGRATIONS_SQL =
	__ADACTA.INIT_MIGRATIONS_SQL ??
	readFileSync(`${__dirname}/../drizzle/init-migrations.sql`, "utf-8");

declare global {
	// The value of the Record type is typed as undefined, so the actually exported value gets the type of the
	// default value (i.e. the part after the ?? operator).
	// This needs to be declared using var...
	// eslint-disable-next-line no-var
	var __ADACTA: Record<string, undefined>;
}
