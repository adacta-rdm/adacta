/**
 * Rebuilds the SQL baseline used to initialize the application database.
 * The directory and snapshot identifier have fixed values. Repeated runs
 * therefore show only schema changes in Git.
 *
 * The existing history is deleted before generation. A failed refresh can be
 * rerun or the previous files can be restored with Git.
 */
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";

import { getTableName } from "drizzle-orm";

import { PID_EDGE_KINDS } from "~/app/lib/PID.ts";
import { QUANTITY_KINDS } from "~/app/lib/quantities.ts";
import { PIDEdgeKind } from "~/drizzle/schema/PIDEdgeKind.ts";
import { QuantityKind } from "~/drizzle/schema/QuantityKind.ts";

const BASELINE_DIRECTORY = "19861014000000_baseline";
const SNAPSHOT_ID = "00000000-0000-0000-0000-000000000001";
const PROJECT_ROOT = dirname(dirname(import.meta.dir));

/**
 * Replaces the migration history with one baseline from an empty database.
 */
export async function refreshMigrations(): Promise<void> {
	const outputDirectory = join(PROJECT_ROOT, "drizzle", "migrations");
	rmSync(outputDirectory, { recursive: true, force: true });
	mkdirSync(outputDirectory, { recursive: true });

	run(
		["bunx", "drizzle-kit", "generate", "--config", "drizzle/config.ts", "--name", "baseline"],
		"Failed to generate the migration.",
	);

	const migrations = [
		...new Bun.Glob("*/migration.sql").scanSync({ cwd: outputDirectory, onlyFiles: true }),
	];
	if (migrations.length !== 1) {
		throw new Error(`Expected one generated migration, found ${migrations.length}.`);
	}

	const baselineDirectory = join(outputDirectory, BASELINE_DIRECTORY);
	renameSync(join(outputDirectory, dirname(migrations[0]!)), baselineDirectory);

	// Foreign keys refer to these fixed names. The SQL baseline therefore
	// inserts them before the application writes channels or diagram edges.
	const migrationPath = join(baselineDirectory, "migration.sql");
	const sql = await Bun.file(migrationPath).text();
	const rows = [
		insertNames(getTableName(QuantityKind), QuantityKind.id.name, Object.keys(QUANTITY_KINDS)),
		insertNames(getTableName(PIDEdgeKind), PIDEdgeKind.id.name, Object.keys(PID_EDGE_KINDS)),
	];
	await Bun.write(
		migrationPath,
		`${sql.trimEnd()}\n--> statement-breakpoint\n${rows.join("\n--> statement-breakpoint\n")}\n`,
	);

	const snapshotPath = join(baselineDirectory, "snapshot.json");
	const snapshot = (await Bun.file(snapshotPath).json()) as { id: string };
	snapshot.id = SNAPSHOT_ID;
	await Bun.write(snapshotPath, `${JSON.stringify(snapshot, null, "\t")}\n`);

	run(["bunx", "oxfmt", snapshotPath], "Failed to format the migration snapshot.");
	console.log(`Refreshed migration baseline: ${relative(PROJECT_ROOT, baselineDirectory)}`);
}

function run(command: string[], errorMessage: string): void {
	const result = Bun.spawnSync({
		cmd: command,
		cwd: PROJECT_ROOT,
		stdout: "pipe",
		stderr: "inherit",
	});

	if (result.success) return;

	const output = result.stdout.toString().trimEnd();
	if (output) console.error(output);
	throw new Error(errorMessage);
}

function insertNames(table: string, column: string, names: string[]): string {
	const values = names.map((name) => `('${name.replaceAll("'", "''")}')`);
	return `INSERT INTO \`${table}\` (\`${column}\`) VALUES\n${values.join(",\n")};`;
}
