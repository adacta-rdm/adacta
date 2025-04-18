import assert from "assert";

import { CSVImportWizardTransformation } from "./CSVImportWizardTransformation";
import type { ResourceAttachmentManager } from "../graphql/context/ResourceAttachmentManager";
import type { ResourceManager } from "../graphql/context/ResourceManager";
import type { ICreateAndRunImportTransformationInput } from "../graphql/generated/resolvers";
import type { Downsampling } from "../services/downsampler/Downsampling";
import { createTransformationContext } from "../transformations/createTransformationContext";

import { assertIImportWizardPreset } from "@/tsrc/lib/interface/IImportWizardPreset";
import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { assertDefined } from "~/lib/assert/assertDefined";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IResourceId, IUserId } from "~/lib/database/Ids";
import type { Logger } from "~/lib/logger/Logger";
import { createProgressReporter } from "~/lib/progress/createProgressReporter";
import type { StorageEngine } from "~/lib/storage-engine";

/**
 * Utility function which saves the preset as Resource and executes the ImportWizard-Transformation
 */
export async function executeImportAsTransformation(
	rm: ResourceManager,
	input: NonNullable<ICreateAndRunImportTransformationInput>,
	userId: IUserId,
	el: EntityLoader,
	schema: DrizzleSchema,
	ram: ResourceAttachmentManager,
	downsampling: Downsampling,
	logger: Logger,
	sto: StorageEngine,

	progress?: (progress: number) => void
): Promise<{ resources?: IResourceId[]; warnings?: string[]; errors?: string[] }> {
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
	assertIImportWizardPreset(inputPreset);
	assert(isEntityId(deviceId, "Device"));

	const importPreset = EntityFactory.create(
		"ImportPreset",
		{
			preset: inputPreset,
			deviceIds: [deviceId],
		},
		userId
	);

	const transformationInput = {
		data: rawResource,
		parameters: importPreset,
	};

	const importResult = await CSVImportWizardTransformation(
		createTransformationContext(userId, ram, rm, downsampling, logger, el, schema, sto),
		transformationInput,
		input.importWithWarnings ?? false,
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
