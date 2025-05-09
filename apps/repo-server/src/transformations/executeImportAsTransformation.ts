import assert from "assert";

import { createTransformationContext } from "./createTransformationContext";
import { CSVImportWizardTransformation } from "./csv/CSVImportWizardTransformation";
import type { ResourceAttachmentManager } from "../graphql/context/ResourceAttachmentManager";
import type { ResourceManager } from "../graphql/context/ResourceManager";
import type { ICreateAndRunImportTransformationInput } from "../graphql/generated/resolvers";
import { IImportTransformationType } from "../graphql/generated/resolvers";
import type { Downsampling } from "../services/downsampler/Downsampling";

import { isICSVPreset, isIGamryPreset } from "@/tsrc/lib/interface/IImportWizardPreset";
import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { GamryImportTransformation } from "~/apps/repo-server/src/transformations/gamry/GamryImportTransformation";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { assertDefined } from "~/lib/assert/assertDefined";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IResourceId, IUserId } from "~/lib/database/Ids";
import type { Logger } from "~/lib/logger/Logger";
import { createProgressReporter } from "~/lib/progress/createProgressReporter";
import type { StorageEngine } from "~/lib/storage-engine";

/**
 * Utility function which saves the preset as Resource and executes the transformation
 */
export async function executeImportAsTransformation(
	input: NonNullable<ICreateAndRunImportTransformationInput>,
	userId: IUserId,
	ctx: {
		el: EntityLoader;
		schema: DrizzleSchema;

		ram: ResourceAttachmentManager;
		rm: ResourceManager;
		downsampling: Downsampling;
		sto: StorageEngine;

		logger: Logger;
	},
	progress?: (progress: number) => void
): Promise<{ resources?: IResourceId[]; warnings?: string[]; errors?: string[] }> {
	const { el, schema, rm, ram, downsampling, logger, sto } = ctx;

	const progressReporter = createProgressReporter((p) => {
		if (progress) {
			progress(p.value);
		}
	});
	const rawResource = await el.one(schema.Resource, input.rawResourceId);

	assert(rawResource.attachment.type === "Raw");
	assertDefined(rawResource.attachment.uploadDevice);

	const deviceId = rawResource.attachment.uploadDevice;

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const inputPreset = JSON.parse(input.presetJson);

	if (!isICSVPreset(inputPreset) && !isIGamryPreset(inputPreset)) {
		throw new Error("Invalid preset type");
	}

	assert(isEntityId(deviceId, "Device"));

	const importPreset = EntityFactory.create(
		"ImportPreset",
		{
			preset: inputPreset,
			deviceIds: [deviceId],
			type: input.type === IImportTransformationType.Csv ? 0 : 1,
		},
		userId
	);

	const transformationInput = {
		data: rawResource,
		parameters: importPreset,
	};

	const transformationContext = createTransformationContext(
		userId,
		ram,
		rm,
		downsampling,
		logger,
		el,
		schema,
		sto
	);

	const importResult =
		input.type === IImportTransformationType.Csv
			? await CSVImportWizardTransformation(
					transformationContext,
					transformationInput,
					input.importWithWarnings ?? false,
					progressReporter
			  )
			: await GamryImportTransformation(
					transformationContext,
					transformationInput,
					progressReporter
			  );

	// If there are any errors or if there is a warning and we don't have indication from the user
	// that these warnings are acceptable we return early
	if (
		(importResult.warnings &&
			importResult.warnings?.length > 0 &&
			input.importWithWarnings !== true) ||
		(importResult.errors && importResult.errors?.length > 0)
	) {
		return importResult;
	}

	// Save the ImportWizardResource if the import was successful
	await el.insert(schema.ImportPreset, importPreset);

	const importedResources = Object.fromEntries(
		importResult.resources?.map((r, index) => [`resource${index}`, r]) ?? []
	);

	const transformationDoc = EntityFactory.create(
		"Transformation",
		{
			name: "import",
			input: {
				data: transformationInput.data.id,
			},
			presetId: importPreset.id,
			output: importedResources,
		},
		userId
	);
	await el.insert(schema.Transformation, transformationDoc);

	return importResult;
}
