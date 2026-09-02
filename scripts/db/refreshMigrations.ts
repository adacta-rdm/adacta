/**
 * Rebuilds the SQL files used to create system and repository databases.
 *
 * `RepoManager` creates a repository database by asking `DatabaseManager` to
 * apply the repository migration files. Drizzle Kit cannot push a schema to a
 * database that will be created later. These SQL files therefore remain part of
 * the application.
 *
 * The refresh generates one complete system migration and one complete
 * repository migration. It gives their directories and snapshot identifiers
 * fixed values. Repeated runs therefore produce useful Git diffs.
 *
 * The existing baselines are deleted before the new ones are generated. A
 * failed refresh can be rerun or the previous files can be restored with Git.
 */
import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const BASELINE_DIRECTORY = "19861014000000_baseline";

type MigrationTarget = {
	scope: "system" | "repo";
	schema: string;
	snapshotId: string;
};

const PROJECT_ROOT = dirname(dirname(import.meta.dir));

const TARGETS = [
	{
		scope: "system",
		schema: "./drizzle/schema/system.*.ts",
		snapshotId: "00000000-0000-0000-0000-000000000001",
	},
	{
		scope: "repo",
		schema: "./drizzle/schema/repo.*.ts",
		snapshotId: "00000000-0000-0000-0000-000000000002",
	},
] as const satisfies readonly MigrationTarget[];

/**
 * Replaces both migration histories with deterministic baseline migrations.
 */
export async function refreshMigrations(): Promise<void> {
	const drizzleDirectory = join(PROJECT_ROOT, "drizzle");
	const migrationsDirectory = join(drizzleDirectory, "migrations");
	mkdirSync(migrationsDirectory, { recursive: true });

	for (const { scope } of TARGETS) {
		rmSync(join(migrationsDirectory, scope), { recursive: true, force: true });
	}

	for (const target of TARGETS) {
		const outputDirectory = join(migrationsDirectory, target.scope);
		generateMigration(target, outputDirectory);
		await prepareBaseline(target, outputDirectory);
	}

	formatSnapshots(
		TARGETS.map(({ scope }) =>
			join(migrationsDirectory, scope, BASELINE_DIRECTORY, "snapshot.json"),
		),
	);

	console.log("Refreshed migration baselines:");
	for (const { scope } of TARGETS) {
		console.log(
			`  ${relative(PROJECT_ROOT, join(migrationsDirectory, scope, BASELINE_DIRECTORY, "migration.sql"))}`,
		);
	}
}

function formatSnapshots(snapshotPaths: string[]): void {
	run(["bunx", "oxfmt", ...snapshotPaths], "Failed to format the migration snapshots.");
}

function generateMigration(target: MigrationTarget, outputDirectory: string): void {
	run(
		[
			"bunx",
			"drizzle-kit",
			"generate",
			"--dialect",
			"sqlite",
			"--schema",
			target.schema,
			"--out",
			outputDirectory,
			"--name",
			"baseline",
		],
		`Failed to generate the ${target.scope} migration.`,
	);
}

async function prepareBaseline(target: MigrationTarget, outputDirectory: string): Promise<void> {
	const generatedMigrations = [
		...new Bun.Glob("*/migration.sql").scanSync({ cwd: outputDirectory, onlyFiles: true }),
	];

	if (generatedMigrations.length !== 1) {
		throw new Error(
			`Expected one generated ${target.scope} migration, found ${generatedMigrations.length}.`,
		);
	}

	const generatedDirectory = join(outputDirectory, dirname(generatedMigrations[0]!));
	const baselineDirectory = join(outputDirectory, BASELINE_DIRECTORY);
	renameSync(generatedDirectory, baselineDirectory);

	const snapshotPath = join(baselineDirectory, "snapshot.json");
	const snapshot = (await Bun.file(snapshotPath).json()) as { id: string };
	snapshot.id = target.snapshotId;
	await Bun.write(snapshotPath, `${JSON.stringify(snapshot, null, "\t")}\n`);
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
