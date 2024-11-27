import type { TGamryMetadata } from "~/apps/repo-server/src/gamryDta/GamryFileReader";
import { GamryFileReader } from "~/apps/repo-server/src/gamryDta/GamryFileReader";
import { assertDefined } from "~/lib/assert";
import type { StorageEngine } from "~/lib/storage-engine";

// TODO: Move method + Remove mutation

export async function streamToGamryDtaParserEvents(
	sto: StorageEngine,
	path: string
): Promise<{
	metadata: TGamryMetadata;
	headers: string[][];
	units: string[][];
	minMax: { min: (number | undefined)[]; max: (number | undefined)[] }[];
}> {
	const x = new GamryFileReader(sto, path);
	const parser = await x.parse({ minMaxCalculation: true });

	let metadata: TGamryMetadata | undefined = undefined;
	const headers: string[][] = [];
	const units: string[][] = [];
	const minMax: { min: (number | undefined)[]; max: (number | undefined)[] }[] = [];

	return new Promise((resolve, reject) => {
		parser.on("data", (event) => {
			if (event.type === "metadata") {
				metadata = event.data.metadata;
			}

			if (event.type === "headers") {
				headers.push(event.data);
			}

			if (event.type == "units") {
				units.push(event.data);
			}

			if (event.type === "minmax") {
				minMax.push({ min: event.min, max: event.max });
			}
		});

		parser.on("end", () => {
			assertDefined(metadata);
			resolve({ metadata, headers, units, minMax });
		});

		parser.on("error", (err) => {
			reject(err);
		});
	});
}
