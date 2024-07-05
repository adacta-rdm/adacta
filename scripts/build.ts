import type { BuildOptions } from "esbuild";
import { build as esbuild } from "esbuild";

import { buildTimeConstantsObject } from "~/dev/build-utils";
import buildMigrations from "~/drizzle/migrations";

const availableTargets = ["repo-server", "downsampling-service"] as const;
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
				outdir: "packages/resources",
			});
			promises.push(esbuild(config));
		}
	}

	await Promise.all(promises).catch(() => {
		process.exit(1);
	});
}

function configure({
	entryPoints,
	outdir,
}: Required<Pick<BuildOptions, "entryPoints" | "outdir">>) {
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
		// Only opt in to syntax minification (to get dead code elimination). Other minification
		// features are not enabled to make the output more readable.
		minifySyntax: true,
		keepNames: true,
	} satisfies BuildOptions;
}

void main(process.argv.slice(2));
