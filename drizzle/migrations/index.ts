import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { __dirnameFromImportMetaURL } from "~/lib/__dirnameFromImportMetaURL";
import { GeneratedFilesReporter } from "~/scripts/utils/fileGenerator/GeneratedFilesReporter";
import { GENERATED_HEADER_TS } from "~/scripts/utils/fileGenerator/generatorConsts";
import { safeWriteGeneratedFile } from "~/scripts/utils/fileGenerator/safeWriteGeneratedFile";

const __dirname = /* @__PURE__ */ (() => __dirnameFromImportMetaURL(import.meta.url))();

export default async function () {
	// Ensures that this code is not bundled, as it runs at build time
	// NOTE: NODE_ENV is set to "production" within the bundle. In the execution context of the build
	// script, it is not equal to "production" and the migration files are generated at build time.
	if (process.env.NODE_ENV !== "production") {
		const projectRoot = join(__dirname, "../..");

		const out = join(projectRoot, "@/drizzle");
		mkdirSync(out, { recursive: true });

		interface IMigrationInfo {
			filename: string;
			fileContents: string;
			moduleName?: string;
			hash: string;
			type: string;
		}

		const o: Record<string, IMigrationInfo[]> = {};

		// Loop over all files in the directory where this file is
		for (const filename of readdirSync(__dirname)) {
			// Skip this file
			if (filename === "index.ts") continue;

			const parts = filename.split("_");
			const last = parts.pop();
			const tag = parts.join("_");

			let moduleName;
			let type;

			if (last === "global.sql") {
				type = "global";
			} else if (last === "global.ts") {
				type = "global";
				moduleName = filename.slice(0, -3);
			} else if (last === "repo.sql") {
				type = "repo";
			} else if (last === "repo.ts") {
				type = "repo";
				moduleName = filename.slice(0, -3);
			} else {
				// ???
				continue;
			}
			const fileContents = readFileSync(join(__dirname, filename), "utf-8");
			(o[tag] = o[tag] ?? []).push({
				filename,
				fileContents,
				moduleName,
				hash: createHash("sha256").update(fileContents).digest().toString("hex"),
				type,
			});
		}

		const renderFile = (input: Record<string, IMigrationInfo[]>) => {
			const imports = ['import type {Migration} from "~/drizzle/Migration";'];

			const lines: string[] = [];

			for (const [tag, arr] of Object.entries(input)) {
				lines.push(`"${tag}": [`);
				for (const o of arr) {
					lines.push(`
					{
						filename: "${o.filename}",
						hash: "${o.hash}",
						type: "${o.type}",
						migration: ${o.moduleName ? `migrate${o.moduleName}` : JSON.stringify(o.fileContents)},
					},`);
					if (o.moduleName) {
						imports.push(
							`import {migrate as migrate${o.moduleName}} from "~/drizzle/migrations/${o.moduleName}";`
						);
					}
				}
				lines.push("],");
			}

			return `${GENERATED_HEADER_TS}
				${imports.join("\n")}\n\nexport default {\n${lines.join(
				"\n"
			)}\n} as Record<string, Migration[] | undefined>`;
		};

		await safeWriteGeneratedFile(
			join(out, "migrations.ts"),
			renderFile(o),
			new GeneratedFilesReporter()
		);
		// writeFileSync(join(out, "migrations.ts"), renderFile(o), "utf-8");
	}

	return import("@/drizzle/migrations").then((m) => m.default);
}
