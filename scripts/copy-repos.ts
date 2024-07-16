import { readFileSync } from "node:fs";
import { stdin, stdout } from "node:process";
import readline from "node:readline/promises";

import { sql } from "drizzle-orm";

import { PostgresConfig } from "~/apps/repo-server/src/config/PostgresConfig";
import { S3Config } from "~/apps/repo-server/src/config/S3Config";
import { RepositoryManagerPostgres } from "~/apps/repo-server/src/services/RepositoryManagerPostgres";
import { sh } from "~/dev/sh";
import { DrizzleGlobalSchema } from "~/drizzle/DrizzleSchema";
import { MIGRATION_SCHEMA_NAME } from "~/drizzle/schema/migrations";
import { parseEnvFile } from "~/lib/utils/parseEnvFile";

const rmp: RepositoryManagerPostgres[] = [];

async function main(args: string[]) {
	let sourceEnvFile: string | undefined = undefined;
	let targetEnvFile: string | undefined = undefined;
	const repos: string[] = [];

	for (let i = 0; i < args.length; ++i) {
		const arg = args[i];

		if (arg === "--source") {
			sourceEnvFile = args[++i];
		} else if (arg.startsWith("--source=")) {
			sourceEnvFile = arg.slice("--source=".length);
		} else if (arg === "--target") {
			targetEnvFile = args[++i];
		} else if (arg.startsWith("--target=")) {
			targetEnvFile = arg.slice("--target=".length);
		} else {
			repos.push(arg);
		}
	}

	if (!sourceEnvFile) {
		return error("--source argument not provided");
	}

	if (!targetEnvFile) {
		return error("--target argument not provided");
	}

	// Read the environment variables from the source and target env files.
	// Each env file defines the same set of environment variables, but with different values, so we need to pass
	// each set to the corresponding PostgresConfig object in isolation.
	// This is done by temporarily replacing process.env with the env variables from the env file.
	const env = process.env;
	process.env = parseEnvFile(readFileSync(sourceEnvFile, "utf-8"));
	const source = new PostgresConfig();
	const s3Source = new S3Config();
	process.env = parseEnvFile(readFileSync(targetEnvFile, "utf-8"));
	const target = new PostgresConfig();
	const s3Target = new S3Config();
	process.env = env;

	if (targetEnvFile.startsWith("prod")) {
		return error("Refusing to use production environment as target.");
	}

	if (target.dbName.includes("prod")) {
		return error("Refusing to use production database as target.");
	}

	print("Using the following postgres config for source:");
	print(source.toString());
	print("");
	print("Using the following postgres config for target:");
	print(target.toString());
	print("");

	const rmpSource = new RepositoryManagerPostgres(source);
	rmp.push(rmpSource);
	const repositories = await rmpSource.repositories();
	if (repositories.length === 0) return error("No repositories found in source database");

	if (repos.length === 0) {
		repos.push(...repositories);
		print("No repositories specified. Copying all repositories:");
	} else {
		for (const repo of repos) {
			if (!repositories.includes(repo)) {
				return error(`Repository "${repo}" not found in source database`);
			}
		}
		print("Copying the following repositories:");
	}
	print(...repos, "");

	const rl = readline.createInterface({
		input: stdin,
		output: stdout,
	});
	let answer: string;
	print(`This operation will destroy the target database "${target.dbName}".`);
	do {
		answer = (await rl.question("Do you want to continue? [y/n] ")).toLowerCase();
	} while (answer !== "n" && answer !== "y");
	print("");

	rl.close();

	if (answer === "n") {
		print("Aborted.");
		return;
	}

	print("Destroying target database...");
	const rmpTarget = new RepositoryManagerPostgres(target);
	rmp.push(rmpTarget);

	await Promise.all(
		(await rmpTarget.repositories()).map((repoName) => rmpTarget.deleteRepository(repoName))
	);
	const globalSchemaName = new DrizzleGlobalSchema().global.schemaName;
	await rmpTarget.db().execute(sql.raw(`drop schema if exists "${globalSchemaName}" cascade;`));
	await rmpTarget
		.db()
		.execute(sql.raw(`drop schema if exists "${MIGRATION_SCHEMA_NAME}" cascade;`));

	const schemaArgs = [
		MIGRATION_SCHEMA_NAME,
		globalSchemaName,
		...repos.map((repo) => rmpSource.schemaName(repo)),
	]
		.map((n) => `--schema="${n}"`)
		.join(" ");

	print("Copying repositories...", "");

	const db = rmpSource.db();
	const maxConcurrency = 100;
	const promises = new Set<Promise<unknown>>();

	function addPromise(promise: Promise<unknown>) {
		const p: Promise<unknown> = promise
			.catch((err: unknown) => {
				if (err instanceof Error) {
					error(err.message);
				} else {
					error(String(err));
				}
			})
			.finally(() => promises.delete(p));
		promises.add(p);
	}

	addPromise(
		sh(
			`pg_dump --dbname="${source.toString()}" -Fc --no-owner ${schemaArgs} | pg_restore --dbname="${target.toString()}" --no-owner`
		)
	);

	print("Copying resources...", "");

	for (const repo of repos) {
		const { Resource } = rmpSource.schema(repo);

		const resources = await db.select().from(Resource);

		for (const resource of resources) {
			if (promises.size >= maxConcurrency) {
				await Promise.race(promises);
			}

			print(
				`${s3Source.endpoint}:${s3Source.bucket}/${repo}/${resource.id} -> ${s3Target.endpoint}:${s3Target.bucket}/${repo}/${resource.id}`
			);
			const sourceRemoteDefinition = `endpoint="${s3Source.endpoint}",access_key_id="${s3Source.accessKeyId}",secret_access_key="${s3Source.secretAccessKey}":${s3Source.bucket}/${repo}/${resource.id}`;
			const targetRemoteDefinition = `endpoint="${s3Target.endpoint}",access_key_id="${s3Target.accessKeyId}",secret_access_key="${s3Target.secretAccessKey}":${s3Target.bucket}/${repo}/${resource.id}`;
			const cmd = `rclone copyto ':s3,provider="Other",${sourceRemoteDefinition}' ':s3,provider="Other",${targetRemoteDefinition}'`;

			addPromise(sh(cmd));
		}
	}
}

main(process.argv.slice(2))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	})
	.finally(() => {
		for (const rm of rmp) void rm.closeAll();
	});

function print(...args: string[]) {
	for (const arg of args) console.log(arg);
}

function error(message: string) {
	console.error(message);
	process.exit(1);
}
