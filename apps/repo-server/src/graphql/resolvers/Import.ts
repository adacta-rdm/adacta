import assert from "node:assert";

import { and, arrayContains, asc, isNotNull } from "drizzle-orm";
import probe from "probe-image-size";

import { createResourceFromUpload } from "./utils/createResourceFromUpload";
import { paginateDocuments } from "./utils/paginateDocuments";
import { executeImportAsTransformation } from "../../csvImportWizard/executeImportAsTransformation";
import type { IImportPreset, IResolvers } from "../generated/resolvers";

import { assertIImportWizardPreset } from "@/tsrc/lib/interface/IImportWizardPreset";
import { ImagePreparation } from "~/apps/repo-server/src/services/ImagePreparation/ImagePreparation";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IDeviceId } from "~/lib/database/Ids";
import { uuid } from "~/lib/uuid";

export const ImportMutations: IResolvers["RepositoryMutation"] = {
	async importRawResourceRequest(p, v, { services: { stoRemote } }) {
		const uploadId = uuid();
		const url = await stoRemote.getUploadLink(uploadId);
		return { id: uploadId, url };
	},

	async importRawResource(_, { input }, { userId, services: { rm } }) {
		return createResourceFromUpload(
			input.uploadId,
			input.name,
			{
				type: "Raw",

				uploadDevice: input.uploadDevice as IDeviceId,
			},
			rm,
			userId
		);
	},

	async importImageResource(_, { input }, { userId, services: { rm, sto } }) {
		const uploadPath = input.uploadId;

		// While sharp is used for image processing, probe-image-size is used to get the image
		// metadata. This is because sharp does not support some of the image formats we try to
		// support (e.g. HEIC, BMP).
		const fileContentsStream = sto.readFileStream(uploadPath);

		let imageMetadata: Awaited<ReturnType<typeof probe>>;
		try {
			imageMetadata = await probe(fileContentsStream as any);
		} catch (e) {
			return {
				error: { __typename: "ErrorMessage", message: "Unsupported image format" },
			};
		}
		fileContentsStream.destroy();

		if (!ImagePreparation.isSupportedMimeType(imageMetadata.mime)) {
			return { error: { __typename: "ErrorMessage", message: "Unsupported image format" } };
		}

		let height = imageMetadata.height;
		let width = imageMetadata.width;

		// Swap height and width if the image is rotated
		if ((imageMetadata.orientation ?? 0) >= 5) {
			[height, width] = [width, height];
		}

		return {
			data: {
				id: await createResourceFromUpload(
					input.uploadId,
					"Image",
					{
						type: "Image",
						mimeType: imageMetadata.mime,
						height,
						width,
					},
					rm,
					userId
				),
			},
		};
	},

	createAndRunImportTransformation(
		_,
		{ input },
		{
			userId,
			services: { el, rm, ram, uiSubscriptionPublisher, downsampling, sto, logger },
			schema,
		}
	) {
		const importTaskId = uuid();

		const progress = (progress: number) => {
			void uiSubscriptionPublisher.publish("importTask", {
				id: importTaskId,
				payload: { __typename: "ImportTransformationProgress", progress: progress },
			});
		};

		executeImportAsTransformation(
			rm,
			input,
			userId,
			el,
			schema,
			ram,
			downsampling,
			logger,
			sto,
			progress
		)
			.then((result) => {
				// NOTE: Be careful types seem to be bad for this mutation as it returns a union (?)
				if (result.warnings && result.warnings?.length > 0) {
					void uiSubscriptionPublisher.publish("importTask", {
						id: importTaskId,
						payload: {
							__typename: "ImportTransformationWarning",
							message: result.warnings,
						},
					});
					return;
				}

				// NOTE: Be careful types seem to be bad for this mutation as it returns a union (?)
				if (result.errors && result.errors?.length > 0) {
					void uiSubscriptionPublisher.publish("importTask", {
						id: importTaskId,
						payload: {
							__typename: "ImportTransformationError",
							message: result.errors,
						},
					});
					return;
				}

				void uiSubscriptionPublisher.publish("importTask", {
					id: importTaskId,
					payload: { ids: result.resources, __typename: "ImportTransformationSuccess" },
				});
			})
			.catch(() => {
				void uiSubscriptionPublisher.publish("importTask", {
					id: importTaskId,
					payload: {
						__typename: "ImportTransformationError",
						// This catch block should(!) never be reached. For this reason we collect
						// all errors as "Unknown"
						message: ["Unknown error"],
					},
				});
			});

		return { __typename: "CreateAndRunImportTransformationResponse", importTaskId };
	},

	async upsertImportPreset(
		_,
		{ insert, update },
		{ userId, services: { el }, schema: { ImportPreset } }
	) {
		let preset!: DrizzleEntity<"ImportPreset">;

		if (insert) {
			const { input } = insert;
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const presetJson = JSON.parse(input.presetJson);
			assertIImportWizardPreset(presetJson);
			assert(isEntityId(input.deviceId, "Device"));

			preset = EntityFactory.create(
				"ImportPreset",
				{
					name: input.name,
					deviceIds: input.deviceId,
					preset: presetJson,
				},
				userId
			);

			await el.insert(ImportPreset, preset);
		} else if (update) {
			const { input } = update;
			preset = await el.one(ImportPreset, update.id);

			if (input.deviceId && isEntityId(input.deviceId, "Device")) {
				preset.deviceIds = input.deviceId;
			}

			if (input.name) {
				preset.name = input.name;
			}

			if (input.presetJson) {
				throw new Error("Updating preset not implemented");
			}

			await el.update(ImportPreset, preset.id, preset);
		}

		return { node: { id: preset.id } };
	},

	async deleteImportPreset(_, { id }, { services: { el }, schema: { ImportPreset } }) {
		const affectedRows = await el.update(ImportPreset, id, { metadataDeletedAt: new Date() });

		if (affectedRows === 0) {
			throw new Error(`ImportPreset with id ${id} not found`);
		}

		return { deletedId: id };
	},
};

export const ImportResolvers: IResolvers["RepositoryQuery"] = {
	async importPresets(_, vars, { services: { el }, schema: { ImportPreset } }) {
		const deviceId = (vars.deviceId ?? undefined) as IDeviceId | undefined;

		const presets = await el.find(ImportPreset, {
			orderBy: (t) => asc(t.name),
			where: (t) => {
				// Manually created presets are those presets that have a name
				// Presets that are created to save the preset used in a specific import do not have
				// a name
				const showManuallyCreated = isNotNull(t.name);

				if (deviceId) {
					return and(showManuallyCreated, arrayContains(t.deviceIds, [deviceId]));
				} else {
					return showManuallyCreated;
				}
			},
		});

		return paginateDocuments<IImportPreset>(
			presets.map(({ id }) => ({ id })),
			vars.first,
			vars.after
		);
	},
};
