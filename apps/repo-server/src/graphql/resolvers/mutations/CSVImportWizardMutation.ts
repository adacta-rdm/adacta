import { ResourceAttachmentManager } from "../../context/ResourceAttachmentManager";
import type { IResolvers } from "../../generated/resolvers";

import { assertIToCellArrayInput } from "@/tsrc/lib/interface/CSVImportWizzard/IToCellArrayInput";
import { assertIToGenericTableInput } from "@/tsrc/lib/interface/CSVImportWizzard/IToGenericTableInput";
import { assertIToTabularDataArrayBufferInput } from "@/tsrc/lib/interface/CSVImportWizzard/IToTabularDataArrayBufferInput";
import { createIDatetime } from "~/lib/createDate";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";
import { createDuplex } from "~/lib/streams";
import type { Duplex } from "~/lib/streams";

export const CSVImportWizardMutations: IResolvers["RepositoryMutation"] = {
	async toCellArray(_, vars, { services: { el, importWizard }, schema: { Resource } }) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { options } = vars;

		const resourceId = vars.resourceId as IResourceId;
		const path = ResourceAttachmentManager.getPath(await el.one(Resource, resourceId));

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const importOptions: any = JSON.parse(options);
		assertIToCellArrayInput(importOptions);

		return JSON.stringify(await importWizard.toCellArray(path, importOptions));
	},

	async toGenericTable(_, vars, { services: { el, importWizard }, schema: { Resource } }) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { options } = vars;

		const resourceId = vars.resourceId as IResourceId;
		const path = ResourceAttachmentManager.getPath(await el.one(Resource, resourceId));

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const importOptions: any = JSON.parse(options);
		assertIToGenericTableInput(importOptions);

		// TODO: The errors returned by toGenericTable shouldn't be reachable by the current UI
		//  To avoid additional boilerplate/GraphQL types they are left unhandled here
		return JSON.stringify((await importWizard.toGenericTable(path, importOptions))._unsafeUnwrap());
	},

	async toTabularDataArrayBuffer(_, vars, { services: { el, importWizard, logger }, schema }) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { options, deviceId } = vars;

		const resourceId = vars.resourceId as IResourceId;
		const path = ResourceAttachmentManager.getPath(await el.one(schema.Resource, resourceId));

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const importOptions: any = JSON.parse(options);
		assertIToTabularDataArrayBufferInput(importOptions);

		// Create a stream which pushes all rows onto the row array
		const stream: Duplex<number[], number[]> = createDuplex();

		try {
			const [result, rows] = await Promise.all([
				importWizard.toTabularData(path, stream, importOptions, {
					deviceId: deviceId as IDeviceId,
					el,
					schema,
				}),
				stream.collect(),
			]);

			if (result.isErr()) {
				return {
					__typename: "ImportWizardError",
					errors: [result.error.error],
				};
			}

			const { begin, end, metadata } = result.value.props;

			return {
				__typename: "ImportWizardStep3PayloadSuccess",
				warnings: result.value.warnings,
				data: {
					begin: createIDatetime(begin),
					end: createIDatetime(end),
					metadata: JSON.stringify(metadata),
					tabularData: rows.map((r) => r.map(String)),
				},
			};
		} catch (e) {
			logger.error(
				`Unexpected error: ${JSON.stringify(
					e,
					e instanceof Error ? Object.getOwnPropertyNames(e) : undefined
				)}`
			);
			return {
				__typename: "ImportWizardError",
				errors: ["Unexpected error"],
			};
		}
	},
};
