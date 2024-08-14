import assert from "assert";

import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";

import { CSVImportWizard } from "./CSVImportWizard";
import type { IResourceProps } from "../graphql/context/ResourceManager";
import { DownsamplingConfigForCacheOnImport } from "../services/downsampler/DownsamplingConfigForCacheOnImport";

import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";
import type { ITransformationContext } from "~/lib/interface/ITransformationContext";
import type { IProgressReporterFn } from "~/lib/progress/IProgressReporterFn";
import { createProgressReporter } from "~/lib/progress/createProgressReporter";
import { TabularData } from "~/lib/tabular-data";

export async function CSVImportWizardTransformation(
	context: ITransformationContext,
	inputs: { data: DrizzleEntity<"Resource">; parameters: DrizzleEntity<"ImportPreset"> },
	importWithWarnings?: boolean,
	progress?: IProgressReporterFn
): Promise<{ resources?: IResourceId[]; warnings?: string[]; errors?: string[] }> {
	const logger = context.getLogger();
	const [parseProgress, createProgress] = (progress ?? createProgressReporter(() => {})).fork(80);

	const rm = context.getResourceManager();
	const { data, parameters } = inputs;
	assert(data.attachment.type === "Raw");

	const fileName = context.getAttachmentPath(data);
	const optionsObj = parameters.preset;

	// Ignore "preview" option
	optionsObj.preview = undefined;

	const resourceIds: IResourceId[] = [];

	try {
		const transform = TabularData.createTransformStream();

		logger.info(`Starting Import: ${fileName}`);
		const importPromise = new CSVImportWizard(context.getStorageEngine()).toTabularData(
			fileName,
			transform,
			optionsObj,
			{
				deviceId: data.attachment.uploadDevice as IDeviceId,
				el: context.getEntityLoader(),
				schema: context.getSchema(),
			},
			parseProgress
		);

		/**
		 * This function is used to create the resource props for the new resource. It is called
		 * after the import has finished and the data is available.
		 *
		 * Since the import can fail with errors or soft-fail with warnings, this function returns a
		 * Result type to forward the errors or warnings
		 */
		const getResourceProps = async (): Promise<
			Result<
				IResourceProps,
				{
					errors: string[];
					warnings: string[];
				}
			>
		> => {
			const result = await importPromise;
			if (result.isErr()) {
				return err({ errors: [result.error.error], warnings: [] });
			}

			// If the import process resulted in warnings, but the user does not want to import with
			// warnings we return the warnings as errors. This skips the creation of the resource
			// in the database
			if (result.value.warnings.length > 0 && !importWithWarnings) {
				return err({ errors: [], warnings: result.value.warnings });
			}

			const { props } = result.value;

			return ok({
				name: data.name,
				attachment: {
					type: "TabularData" as const,
					begin: props.begin,
					end: props.end,
					columns: props.metadata,
				},
				isRootResource: false,
			});
		};

		logger.info(`Create TabularData resource out of ${fileName}`);
		const rmResult = await rm.create(
			getResourceProps,
			transform,
			context.getUser(),
			true,
			createProgress
		);

		// The control flow is a bit confusing here. The `rm.create()` call actually forwards errors
		// and warnings caused by the import process. This is necessary because the creation of the
		// resource actually depends on the result of the import process (see `getResourceProps`).
		if (rmResult.isErr()) {
			logger
				.bind({ errors: [rmResult.error.errors] })
				.info(`CSVImportWizardTransformation: ${fileName} resulted in errors`);

			const { error } = rmResult;

			// If the resource creation returned only warnings, we return them (the use will then
			// have to decide if the warnings are acceptable or not)
			if (error.warnings.length > 0 && error.errors.length == 0) {
				return { warnings: rmResult.error.warnings };
			}

			return { errors: rmResult.error.errors };
		}

		const resource = rmResult.value;
		resourceIds.push(resource.id);

		const response = await importPromise;
		if (response.isErr()) {
			logger
				.bind({ errors: [response.error.error] })
				.info(`CSVImportWizardTransformation: ${fileName} resulted in errors`);
			return { errors: [response.error.error] };
		}

		const { warnings } = response.value;

		if (warnings.length > 0 && !importWithWarnings) {
			logger.info(`CSVImportWizardTransformation: ${fileName} resulted in warnings`);
			return { warnings };
		}

		// Create downsampled data to populate the sparkline cache
		// This is only done for the sparkline config as there are a lot of sparkline graphs on the
		// resource list. Whereas the detail view of a resource always needs only one graph, so it
		// is less "bad" if it has to be calculated "on-the-fly".

		logger.info(`Request downsampling of: ${fileName}`);
		await context
			.getDownsampler()
			.requestGraph({ resourceId: resource.id, ...DownsamplingConfigForCacheOnImport });
	} catch (e) {
		if (typeof e === "string") {
			logger
				.bind({ errors: [e] })
				.info(`CSVImportWizardTransformation: ${fileName} resulted in errors`);

			return { errors: [e] };
		} else if (e instanceof Error) {
			logger.info(
				`CSVImportWizardTransformationResult: ${fileName} resulted in errors: (${e.message})`
			);
			return { errors: [e.message] };
		}

		// Fallback
		return { errors: ["Unknown error: Importing failed without a error message"] };
	}

	logger.info(`CSVImportWizardTransformation: ${fileName} success`);
	return { resources: resourceIds };
}
