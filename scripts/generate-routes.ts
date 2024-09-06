import { readFileSync } from "node:fs";

import chokidar from "chokidar";
import { debounce } from "lodash";

import { RouteFile } from "~/lib/route-generator/RouteFile";
import { RouteGenerator } from "~/lib/route-generator/RouteGenerator";

async function main(args: string[]) {
	const watch = args[0] === "--watch";

	const path = "apps/desktop-app/src/routes";
	const outPath = "@";

	const generator = RouteGenerator.readdirSync(path, outPath);

	// If watch mode is enabled, watch for changes and regenerate files,
	// otherwise just generate schema once.
	if (!watch) {
		await generator.update();
		generator.report.entries.forEach((entry) => console.log(entry));
		return;
	}

	const delay = 2000;
	// Maintain a batch of changes to process. The boolean value indicates whether the file was removed
	let batch = new Map<string, boolean>();
	const processBatch = debounce(async () => {
		const routeFiles = [];
		for (const [path, removed] of batch) {
			if (removed) {
				generator.delete(path);
				continue;
			}

			try {
				routeFiles.push(new RouteFile(path, readFileSync(path, "utf8")));
			} catch (e) {
				console.warn(`Error: ${path}`);
			}
		}

		batch = new Map();

		generator.set(...routeFiles);

		try {
			await generator.update();
		} catch (e) {
			if (e instanceof Error) {
				console.error(`Error: ${e.message}`);
			} else {
				console.error("Unknown error");
			}
		}

		generator.report.entries.forEach((entry) => console.log(entry));
		generator.report.flush();
	}, delay);

	chokidar.watch(path).on("all", (event, path) => {
		if (!path.endsWith(".ts") && !path.endsWith(".tsx")) return;

		// Maintain a batch of changes to process
		batch.set(path, event === "unlink");

		// This is a debounced function that will process the batch after `delay` ms of inactivity
		void processBatch();
	});
}

void main(process.argv.slice(2));
