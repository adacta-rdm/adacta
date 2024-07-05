import chokidar from "chokidar";
import { debounce } from "lodash";

import { graphQLBuilderCLI } from "./src/graphQLBuilderCLI";

/**
 * See the graphQLBuilderCLI function for documentation.
 */
async function main(args: string[]) {
	const include: string[] = [];
	let project: string | undefined;
	let bundle: string | undefined;
	let build: string | undefined;
	let buildDir: string | undefined;
	let tsSchema: string | undefined;
	let tsRequests: string | undefined;
	let watch = false;

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg === "--bundle") {
			bundle = args[++i];
			if (!bundle) {
				throw new Error("Invalid bundle path. Specify bundle path using --bundle flag.");
			}
			continue;
		}

		if (arg === "--build") {
			build = args[++i];
			if (!build) {
				throw new Error("Invalid build path. Specify build path using --build flag.");
			}
			continue;
		}

		if (arg === "--buildDir") {
			buildDir = args[++i];
			if (!buildDir) {
				throw new Error("Invalid buildDir path. Specify buildDir path using --buildDir flag.");
			}
			continue;
		}

		if (arg === "--tsSchema") {
			tsSchema = args[++i];
			if (!tsSchema) {
				throw new Error("Invalid tsSchema path. Specify tsSchema path using --tsSchema flag.");
			}
			continue;
		}

		if (arg === "--tsRequests") {
			tsRequests = args[++i];
			if (!tsRequests) {
				throw new Error(
					"Invalid tsRequests path. Specify tsRequests path using --tsRequests flag."
				);
			}
			continue;
		}

		if (arg === "--watch") {
			watch = true;
			continue;
		}

		if (arg === "--project") {
			project = args[++i];
			if (!project) {
				throw new Error("Invalid project name. Specify project name using --project flag.");
			}
			continue;
		}

		include.push(arg);
	}
	// We need to take the project option into account, which is handled by the graphQLBuilderCLI function.
	let effectiveIncludes: string[] = [];

	async function generate() {
		try {
			const report = await graphQLBuilderCLI({
				include,
				project,
				bundle,
				build,
				buildDir,
				tsSchema,
				tsRequests,
			});
			effectiveIncludes = report.include;
			for (const item of report.files) console.log(` - ${item}`);
		} catch (e: any) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/restrict-template-expressions
			console.error(`Error: ${e.message}`);
		}
	}

	await generate();

	// If watch mode is enabled, watch for changes and regenerate schema,
	// otherwise just generate schema once.
	if (watch) {
		let count = 0;
		chokidar.watch(effectiveIncludes).on(
			"all",
			debounce(() => {
				++count;
				// Skip first event which fires after initial file scan is complete
				if (count === 1) return;

				console.log("Detected file changes, regenerating GraphQL schema...");

				void generate();
			}, 500)
		);
	}
}

void main(process.argv.slice(2));
