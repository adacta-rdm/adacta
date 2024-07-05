/**
 * This is a one-time script to copy all resources from one repo-server to another, while simultaneously converting
 * to the new format, where resources are grouped by repository.
 *
 * When this has run on production, this script can be merged into the copy-repos.ts script.
 */

import { readFileSync } from "node:fs";

import { PostgresConfig } from "~/apps/repo-server/src/config/PostgresConfig";
import { S3Config } from "~/apps/repo-server/src/config/S3Config";
import { RepositoryManagerPostgres } from "~/apps/repo-server/src/services/RepositoryManagerPostgres";
import { sh } from "~/dev/sh";
import type { IResourceId } from "~/lib/database/Ids";
import { parseEnvFile } from "~/lib/utils/parseEnvFile";

let rmp: RepositoryManagerPostgres;

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
	const postgresConfig = new PostgresConfig();
	const s3Source = new S3Config();
	process.env = parseEnvFile(readFileSync(targetEnvFile, "utf-8"));
	const s3Target = new S3Config();
	process.env = env;

	rmp = new RepositoryManagerPostgres(postgresConfig);

	const db = rmp.db();

	const repositories = await rmp.repositories();
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

	for (const repo of repos) {
		const { Resource } = rmp.schema(repo);

		const resources = await db.select().from(Resource);

		let promises: Promise<unknown>[] = [];
		for (const resource of resources) {
			// Copied from the original implementation in ResourceAttachmentManager.getPath():
			const oldPath = `${(resource.couchId as IResourceId | null) ?? resource.id}_${
				resource.attachment.hash.type
			}_${resource.attachment.hash.value}`;

			print(
				`${s3Source.endpoint}:${s3Source.bucket}/${s3Source.prefix}/${oldPath} -> ${s3Target.endpoint}:${s3Target.bucket}/${repo}/${resource.id}`
			);
			const cmd = `rclone copyto ':s3,provider="Other",endpoint="${s3Source.endpoint}",access_key_id="${s3Source.accessKeyId}",secret_access_key="${s3Source.secretAccessKey}":${s3Source.bucket}/${s3Source.prefix}/${oldPath}' ':s3,provider="Other",endpoint="${s3Target.endpoint}",access_key_id="${s3Target.accessKeyId}",secret_access_key="${s3Target.secretAccessKey}":${s3Target.bucket}/${repo}/${resource.id}'`;

			promises.push(sh(cmd));

			if (promises.length >= 100) {
				await Promise.all(promises);
				promises = [];
			}
		}

		await Promise.all(promises);
	}
}

void main(process.argv.slice(2))
	.catch(console.error)
	.finally(() => {
		void rmp?.closeAll();
	});

function print(...args: string[]) {
	for (const arg of args) console.log(arg);
}

function error(message: string) {
	console.error(message);
	process.exit(1);
}
