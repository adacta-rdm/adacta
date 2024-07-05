import assert from "assert";

import { assertDefined } from "@omegadot/assert";
import type { StorageEngine } from "@omegadot/storage-engine";

import { CSVImportWizardTransformation } from "./CSVImportWizardTransformation";
import type { ResourceAttachmentManager } from "../graphql/context/ResourceAttachmentManager";
import type { ResourceManager } from "../graphql/context/ResourceManager";
import type { ICreateAndRunImportTransformationInput } from "../graphql/generated/resolvers";
import type { Downsampling } from "../services/downsampler/Downsampling";
import { createTransformationContext } from "../transformations/createTransformationContext";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IResourceId, IUserId } from "~/lib/database/Ids";
import { assertIImportWizardPreset } from "~/lib/interface/type_checks/assertIImportWizardPreset";
import type { Logger } from "~/lib/logger/Logger";
import { createProgressReporter } from "~/lib/progress/createProgressReporter";

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

	const importWizardResource = EntityFactory.create(
		"ImportPreset",
		{
			preset: inputPreset,
			deviceIds: [deviceId],
		},
		userId
	);

	const transformationInput = {
		data: rawResource,
		parameters: importWizardResource,
	};

	const importResult = await CSVImportWizardTransformation(
		createTransformationContext(userId, ram, rm, downsampling, logger, el, schema, sto),
		transformationInput,
		input.importWithWarnings ?? false,
		progressReporter
	);

	if (
		!(
			(importResult.warnings && importResult.warnings?.length > 0) ||
			(importResult.errors && importResult.errors?.length > 0)
		)
	) {
		// Save the ImportWizardResource if the import was successful
		await el.insert(schema.ImportPreset, importWizardResource);
	}

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
			presetId: importWizardResource.id,
			output: importedResources,
		},
		userId
	);
	await el.insert(schema.Transformation, transformationDoc);

	return importResult;
}
