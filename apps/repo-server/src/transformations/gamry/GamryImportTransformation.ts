import assert from "assert";

import { ok } from "neverthrow";

import { assertIGamryPreset } from "@/tsrc/lib/interface/IImportWizardPreset";
import type { TGamryMetadata } from "~/apps/repo-server/src/gamryDta/GamryFileReader";
import { GamryFileReader } from "~/apps/repo-server/src/gamryDta/GamryFileReader";
import { gamryCalculateTime } from "~/apps/repo-server/src/transformations/gamry/gamryCalculateTime";
import { updateArrayMinMax } from "~/apps/repo-server/src/utils/updateArrayMinMax";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { assertDefined, assertUnreachable } from "~/lib/assert";
import type { IDatetime } from "~/lib/createDate";
import { createDate, createIDatetime } from "~/lib/createDate";
import type { IResourceId } from "~/lib/database/Ids";
import { localDateToTimezoneDate } from "~/lib/datetime/TimezoneConversion";
import type { ITabularDataColumnDescription } from "~/lib/interface/ITabularDataColumnDescription";
import type { ITransformationContext } from "~/lib/interface/ITransformationContext";
import type { IProgressReporterFn } from "~/lib/progress/IProgressReporterFn";
import { createProgressReporter } from "~/lib/progress/createProgressReporter";
import { TabularData } from "~/lib/tabular-data";

export async function GamryImportTransformation(
	context: ITransformationContext,
	inputs: { data: DrizzleEntity<"Resource">; parameters: DrizzleEntity<"ImportPreset"> },
	progress?: IProgressReporterFn
): Promise<{ resources?: IResourceId[]; warnings?: string[]; errors?: string[] }> {
	const createProgress = progress ?? createProgressReporter(() => {});

	const logger = context.getLogger();

	const rm = context.getResourceManager();
	const { data, parameters } = inputs;
	assert(data.attachment.type === "Raw");

	const fileName = context.getAttachmentPath(data);
	const optionsObj = parameters.preset;
	assertIGamryPreset(optionsObj);

	const resourceIds: IResourceId[] = [];

	const tabularDataStream = TabularData.createTransformStream();
	const reader = new GamryFileReader(context.getStorageEngine(), fileName);
	const gamryStream = await reader.parse({
		// Calculate min/max values for each column to determine the time range
		minMaxCalculation: true,
	});

	// The following variables are set in the gamryStream.on("data") event handlers
	let headers!: string[];
	let metadata!: TGamryMetadata;
	let overallMax: (undefined | number)[] = [];
	let overallMin: (undefined | number)[] = [];

	async function getResourceInformation() {
		// Wait for the stream to finish to ensure all data is available
		await gamryStream.promise();

		assertIGamryPreset(optionsObj);

		let begin: IDatetime;
		let end: IDatetime;
		if (optionsObj.dateInfo.type === "automatic") {
			const timeIndex = headers.findIndex((column) => column === "Time" || column === "T");
			const minTime = overallMin[timeIndex];
			const maxTime = overallMax[timeIndex];
			assertDefined(minTime);
			assertDefined(maxTime);
			const parsedDateInfo = gamryCalculateTime(
				metadata,
				minTime,
				maxTime,
				optionsObj.dateInfo.timezone
			);
			begin = createIDatetime(parsedDateInfo.begin);
			end = createIDatetime(parsedDateInfo.end);
		} else if (optionsObj.dateInfo.type === "manual") {
			const tz = optionsObj.dateInfo.timezone;
			begin = createIDatetime(localDateToTimezoneDate(createDate(optionsObj.dateInfo.begin), tz));
			end = createIDatetime(localDateToTimezoneDate(createDate(optionsObj.dateInfo.end), tz));
		} else {
			assertUnreachable(optionsObj.dateInfo);
		}
		assertDefined(begin);
		assertDefined(end);

		const columns = Object.values(optionsObj.columns);
		const columnsTabularDescription: ITabularDataColumnDescription[] = columns.map((column) => {
			return {
				...column,
				independentVariables: column.independentVariablesNames.map(
					(name) => columns.findIndex((c) => c.title === name) // Convert names to indices
				),
			};
		});

		return ok({
			name: data.name,
			attachment: {
				type: "TabularData" as const,
				begin,
				end,
				columns: columnsTabularDescription,
			},
			isRootResource: false,
		});
	}

	try {
		logger.info(`Starting Import: ${fileName}`);

		let columnIndicesToImport: number[] = [];

		gamryStream.on("data", (event) => {
			if (event.type === "headers") {
				columnIndicesToImport = optionsObj.columns.map((column) => {
					headers = event.data;

					return event.data.indexOf(column.title);
				});
			}

			if (event.type === "metadata") {
				metadata = event.data.metadata;
			}

			if (event.type === "minmax") {
				if (overallMax.length === 0) {
					overallMax = event.max;
				} else {
					updateArrayMinMax(overallMax, event.max, "max");
				}

				if (overallMin.length === 0) {
					overallMin = event.min;
				} else {
					updateArrayMinMax(overallMin, event.max, "min");
				}
			}

			if (event.type === "data") {
				const numbers = event.data.filter((column, i): column is number => {
					const check = columnIndicesToImport.includes(i);

					if (check) {
						assert(typeof column === "number", `Expected number got "${column}"`);
					}

					return check;
				});

				tabularDataStream.write(numbers);
			}
		});

		gamryStream.on("error", (e) => {
			gamryStream.destroy(); // Stop the parsing on the first error
			tabularDataStream.destroy(e); // Forward the error to the
		});

		gamryStream.on("end", () => tabularDataStream.end());

		logger.info(`Create TabularData resource out of ${fileName}`);

		const rmResult = await rm.create(
			getResourceInformation,
			tabularDataStream,
			context.getUser(),
			true,
			createProgress
		);

		if (rmResult.isErr()) {
			const { warnings, errors } = rmResult.error;
			return { warnings, errors };
		}

		resourceIds.push(rmResult._unsafeUnwrap().id);
	} catch (e) {
		if (e instanceof Error) {
			logger.error(`Error in Gamry Import: ${e.message}`);
		} else {
			logger.error("Unknown Error in Gamry Import");
		}
		return { warnings: [], errors: ["Unexpected error while creating resource"] };
	}

	return { resources: resourceIds };
}
