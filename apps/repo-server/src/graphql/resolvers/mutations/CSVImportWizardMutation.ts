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

		const response = await importWizard.toCellArray(path, importOptions);
		if (response.isErr()) {
			return { __typename: "ImportWizardError", errors: response.error.errors };
		}

		return {
			__typename: "ToCellArrayPayloadSuccess",
			data: JSON.stringify(response.value),
		};
	},

	async toGenericTable(_, vars, { services: { el, importWizard }, schema: { Resource } }) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const { options } = vars;

		const resourceId = vars.resourceId as IResourceId;
		const path = ResourceAttachmentManager.getPath(await el.one(Resource, resourceId));

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const importOptions: any = JSON.parse(options);
		assertIToGenericTableInput(importOptions);

		const response = await importWizard.toGenericTable(path, importOptions);
		if (response.isErr()) {
			return { __typename: "ImportWizardError", errors: [response.error.error] };
		}

		return {
			__typename: "ToGenericTablePayloadSuccess",
			data: JSON.stringify(response.value),
		};
	},

	async toTabularData(_, vars, { services: { el, importWizard, logger }, schema }) {
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
			const [_result, _rows] = await Promise.allSettled([
				importWizard.toTabularData(path, stream, importOptions, {
					deviceId: deviceId as IDeviceId,
					el,
					schema,
				}),
				stream.collect(),
			]);

			if (_result.status === "fulfilled") {
				// Check parser result for errors
				const result = _result.value;
				if (result.isErr()) {
					return {
						__typename: "ImportWizardError",
						errors: [result.error.error],
					};
				}

				// Check if the rows are available. This should always succeed as long as `result` is not an error
				if (_rows.status === "rejected") {
					return {
						__typename: "ImportWizardError",
						errors: ["Unexpected parser error"],
					};
				}

				const { begin, end, metadata } = result.value.props;
				return {
					__typename: "ToTabularDataPayloadSuccess",
					warnings: result.value.warnings,
					data: {
						begin: createIDatetime(begin),
						end: createIDatetime(end),
						metadata: JSON.stringify(metadata),
						tabularData: _rows.value.map((r) => r.map(String)),
					},
				};
			}
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

		return {
			__typename: "ImportWizardError",
			errors: ["Unexpected error"],
		};
	},
};
