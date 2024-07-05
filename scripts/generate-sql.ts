/**
 * This script generates migration SQL files for the project and writes them to the `drizzle/migrations` directory.
 * In addition, it generates the init SQL files that are used to initialize the database or create new repositories.
 *
 * The SQL is generated using `drizzle-kit` and subsequently processed to separate the global schema from the repo
 * schema.The script calls `drizzle-kit` through the shell because there is presently no programmatic API.
 *
 * Because our schema is defined in the form of functions that return `PgSchema` objects, which `drizzle-kit` does not
 * understand, we generate a temporary schema file that exports the schema objects as constants. In the generated file,
 * we use a special placeholder string to represent the schema name, which is then replaced with the actual schema name
 * at runtime.
 */

import { mkdirSync } from "fs";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, basename } from "node:path";

import type { Config } from "drizzle-kit";

import { shSync as sh } from "~/dev/sh";
import { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { SQL_SCHEMA_PLACEHOLDER } from "~/drizzle/migrationConst";

// The root directory of the project.
const projectRoot = join(__dirname, "..");

// The path of the init SQL files to be generated.
const initSQLRepoPath = join(projectRoot, "drizzle/init-repo.sql");

// The path where the migrations are stored.
const migrationsPath = join(projectRoot, "drizzle/migrations");

const init = generateSQL();
if (!init?.repo) throw new Error("No SQL generated for init statements.");
writeFile(initSQLRepoPath, init.repo);

const migrations = generateSQL(migrationsPath);
if (migrations) {
	if (migrations.global) {
		writeFile(join(migrationsPath, `${migrations.name}_global.sql`), migrations.global);
	}
	if (migrations.repo) {
		writeFile(join(migrationsPath, `${migrations.name}_repo.sql`), migrations.repo);
	}
} else {
	console.log("no migrations");
}

function generateSQL(out?: string) {
	// Create a temporary directory to work in.
	const wd = mkdtempSync(join(tmpdir(), "generate-sql_"));
	const schemaPath = join(wd, "schema.ts");
	const configPath = join(wd, "drizzle.config.ts");
	if (!out) out = join(wd, "out");

	// The drizzle configuration.
	const drizzleConfig: Config = {
		dialect: "postgresql",
		schema: schemaPath,
		// The output directory is where the generated SQL file will be written, but also where drizzle reads any
		// existing migrations from.
		// There seems to be a bug in drizzle-kit where the snapshot files contained within the "meta" directory are
		// read using a hardcoded "./" prefix. This means we must use a relative path here.
		out: relative(process.cwd(), out),
	};

	const schema = DrizzleSchema.fromSchemaName(SQL_SCHEMA_PLACEHOLDER);

	// Write the schema and drizzle configuration files needed for the drizzle-kit command.
	writeFileSync(schemaPath, generateDrizzleSchemaFile(schema));
	writeFileSync(configPath, generateDrizzleConfigFile(drizzleConfig));

	// Get the paths of the SQL files before running the command, so that we can see which files were generated.
	mkdirSync(out, { recursive: true });
	const sqlPathsBefore = new Set(readdirSync(out).filter((file) => file.endsWith(".sql")));

	// Run the command to generate the SQL.
	sh(`yarn drizzle-kit generate --config ${configPath}`);

	// Get the path of the generated SQL file.
	const sqlPathsAfter = new Set(readdirSync(out).filter((file) => file.endsWith(".sql")));
	let sqlPath: string | undefined;
	for (const file of sqlPathsAfter) {
		if (!sqlPathsBefore.has(file)) {
			if (sqlPath) throw new Error("Multiple new SQL files found.");
			sqlPath = join(out, file);
		}
	}
	if (!sqlPath) return;

	// The generated file contains SQL commands pertinent to the full database schema, including the global schema and
	// the repo schema.
	// The next step is to separate the commands that are for the global schema and the repo schema, because we need to
	// be able to run them separately.
	const fileContents = readFileSync(sqlPath, "utf-8");

	const repo: string[] = [];
	const global: string[] = [];
	const statementBreakpoint = "--> statement-breakpoint";

	for (let statement of fileContents.split(statementBreakpoint)) {
		statement = patchPostgresGeneratedTypes(statement);

		// In this part, we separate the statements by which schema they apply to: global or repo.
		// This is done by checking if the statement contains the placeholder for the repo schema. We can't just check
		// if the statement contains the placeholder for the global schema, because the repo schema can reference the
		// global schema in foreign key constraints, but not the other way around.
		// Therefore, if a statement contains the placeholder for the repo schema, we can safely add it to the list of
		// statements that apply to the repo schema.
		if (statement.includes(schema.repo.schemaName)) {
			repo.push(statement);
		} else if (statement.includes(schema.global.schemaName)) {
			global.push(statement);
		} else {
			throw new Error(`Could not determine schema for statement: ${statement}`);
		}
	}

	// Delete the generated SQL file.
	rmSync(sqlPath);

	// Clean up the temporary directory.
	rmSync(wd, { recursive: true, force: true });

	const stringifyStatements = (statements: string[]) =>
		statements.map((statement) => statement.trim()).join(`\n${statementBreakpoint}\n`);

	return {
		name: basename(sqlPath, ".sql"),
		repo: stringifyStatements(repo),
		global: stringifyStatements(global),
	};
}

function writeFile(path: string, content: string) {
	writeFileSync(path, content);
	console.log(`Wrote ${path}`);
}

function patchPostgresGeneratedTypes(statement: string) {
	// drizzle-kit generates a string for the tsvector column type
	// This replace call removes the quotes around that string
	return statement.replaceAll(
		/"(tsvector generated always as \(to_tsvector\('simple', (.+)\)\) stored)"/g,

		"$1"
	);
}

//
//
//
//
// Code generation functions placed below for better readability

function generateDrizzleConfigFile(drizzleConfig: Config) {
	return `
export default ${JSON.stringify(drizzleConfig, null, 2)};
`;
}

function generateDrizzleSchemaFile(schema: DrizzleSchema) {
	const { global, repo, ...entities } = schema;

	return `
import { DrizzleSchema } from "~/drizzle/DrizzleSchema";

const schema = DrizzleSchema.fromSchemaName(${JSON.stringify(SQL_SCHEMA_PLACEHOLDER)});

// Exporting the pgSchema objects lets drizzle generate the CREATE SCHEMA statement for this schema.
export const globalSchema = schema.global;
export const repoSchema = schema.repo;

${Object.keys(entities)
	.map((v) => `export const ${v} = schema.${v}`)
	.join("\n")}
`;
}
