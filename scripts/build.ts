import { writeFile, cp } from "fs/promises";
import { join } from "node:path";

import bmpJsPackage from "@vingle/bmp-js/package.json";
import type { BuildOptions } from "esbuild";
import { build as esbuild } from "esbuild";
import heicDecodePackage from "heic-decode/package.json";
import sharpPackage from "sharp/package.json";

import { buildTimeConstantsObject } from "~/dev/build-utils";
import buildMigrations from "~/drizzle/migrations";

const availableTargets = ["repo-server", "downsampling-service", "image-service"] as const;
type Target = (typeof availableTargets)[number];

function isTarget(target: string): target is Target {
	return availableTargets.includes(target as Target);
}

async function main(args: string[]) {
	const targets = new Set<Target>();

	// eslint-disable-next-line @typescript-eslint/prefer-for-of
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (!isTarget(arg)) {
			console.error(`Unknown target: "${arg}". Available targets: ${availableTargets.join(", ")}`);
			process.exit(1);
		}
		targets.add(arg);
	}

	// Default to building all targets if none are specified
	if (targets.size === 0) {
		for (const target of availableTargets) targets.add(target);
	}

	const promises: Promise<unknown>[] = [];

	const microservicesDir = "dist/microservices";

	if (targets.has("downsampling-service") || targets.has("image-service")) {
		promises.push(cp("project.yml", join(microservicesDir, "project.yml")));
	}

	for (const target of targets) {
		if (target === "repo-server") {
			await buildMigrations();

			const config = configure({
				entryPoints: ["apps/repo-server/src/main.ts"],
				outdir: "dist/repo-server",
			});
			promises.push(esbuild(config));
		} else if (target === "downsampling-service") {
			const config = configure({
				entryPoints: ["apps/repo-server/src/digitalocean/downsample.ts"],
				outdir: join(microservicesDir, "packages/resources"),
			});
			promises.push(esbuild(config));
		} else if (target === "image-service") {
			const outdir = join(microservicesDir, "packages/images/prepare");
			const config = configure({
				entryPoints: ["apps/repo-server/src/digitalocean/prepare.ts"],
				outdir,
				external: ["sharp"],
			});
			promises.push(
				esbuild(config).then(() =>
					// Create a minimal package.json that lists the sharp dependency. Because the runtime
					// container uses npm v8, we need to also include sharp's optional dependencies for the
					// linux-x64 platform. This is because these prebuilt packages specify a minimum npm
					// version greater than v8 in the engines field, so npm v8 will not install them without
					// this workaround.
					writeFile(
						join(outdir, "package.json"),
						JSON.stringify({
							main: "prepare.js",
							dependencies: {
								sharp: sharpPackage.version,
								"heic-decode": heicDecodePackage.version,
								"@vingle/bmp-js": bmpJsPackage.version,
								...Object.fromEntries(
									Object.entries(sharpPackage.optionalDependencies).filter(([key]) =>
										key.includes("linux-x64")
									)
								),
							},
						})
					)
				)
			);
		}
	}

	await Promise.all(promises).catch((e) => {
		if (e instanceof Error) {
			console.error(e.message);
		}
		process.exit(1);
	});
}

function configure({
	entryPoints,
	outdir,
	external,
}: Required<Pick<BuildOptions, "entryPoints" | "outdir">> & Pick<BuildOptions, "external">) {
	// Shared between dev + production
	return {
		entryPoints,
		bundle: true,
		platform: "node",
		target: "node20",
		define: {
			"process.env.NODE_ENV": JSON.stringify("production"),
			...buildTimeConstantsObject,
		},
		outdir,
		external,
		// Only opt in to syntax minification (to get dead code elimination). Other minification
		// features are not enabled to make the output more readable.
		minifySyntax: true,
		keepNames: true,
	} satisfies BuildOptions;
}

void main(process.argv.slice(2));
