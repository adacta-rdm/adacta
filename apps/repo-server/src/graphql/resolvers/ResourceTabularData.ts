import assert from "assert";

import { assertDefined } from "@omegadot/assert";

import type { IResolvers, IRowEdge } from "../generated/resolvers";

import { UnitlessMarker } from "~/lib/importWizard/ImportWizardUnit";

export const ResourceTabularData: IResolvers["ResourceTabularData"] = {
	async subName({ id }, _, { services: { el }, schema: { Resource } }) {
		const resource = await el.one(Resource, id);
		assert(resource.attachment.type === "TabularData");
		const columns = resource.attachment.columns;
		const numIndependentCols = columns.filter((c) => c.independentVariables.length === 0).length;
		const firstYColumnIndex = columns.findIndex((c) => c.independentVariables.length > 0);
		if (firstYColumnIndex === -1) {
			return null;
		}

		assert(columns.length >= 1);

		const yColumnUnit = columns[firstYColumnIndex].unit;
		const unit: string = yColumnUnit == UnitlessMarker ? "Unitless" : yColumnUnit;

		let subName = `${columns[firstYColumnIndex].title} [${unit}]`;
		if (columns.length - numIndependentCols > 1) {
			subName += ` and ${columns.length - 1 - numIndependentCols} more`;
		}
		return subName;
	},

	async columns({ id }, _, { services: { el }, schema: { Resource } }) {
		const resource = await el.one(Resource, id);

		assert(resource.attachment.type === "TabularData");
		return resource.attachment.columns.map(({ title, type }) => ({ label: title, type }));
	},

	async rows({ id }, vars, { services: { el, ram }, schema: { Resource } }) {
		assertDefined(id);
		const resource = await el.one(Resource, id);
		const tabularDataStream = await ram.getTabularData(resource);

		const length = tabularDataStream.numRows();

		// Show the `first` number of elements after `after`.
		const first: number = vars.first ?? 10;
		const after: number = vars.after ? +vars.after : 0;
		const numberOfPages = Math.ceil(length / first);

		if (first < 0) {
			throw new Error("Invalid argument for `first` arg: must be greater than 0");
		}
		// let data: number[][] = d.slice(0);

		const edges: IRowEdge[] = [];
		// Iterate over `first` elements, but at most until the end of the data
		const end = Math.min(after + first, length);
		for (let i = after; i < end; ++i) {
			edges.push({
				node: { values: [...(await tabularDataStream.row(i))] },
				cursor: String(i + after),
			});
		}

		const around: { pageNumber: number; cursor: string }[] = [];
		for (let i = -3; around.length <= 7; ++i) {
			const cursor = after + i * first;
			const pageNumber = cursor / first;
			if (pageNumber < 0) continue;
			if (pageNumber > numberOfPages) break;
			around.push({ pageNumber, cursor: cursor.toString() });
		}

		return {
			count: length,
			edges,
			pageInfo: {
				hasPreviousPage: false,
				hasNextPage: length > after + first,
				startCursor: after.toString(),
				endCursor: Math.min(after + first, length).toString(),
				cursors: {
					first: {
						pageNumber: 0,
						cursor: "0",
					},
					last: {
						pageNumber: numberOfPages - 1,
						cursor: (Math.floor(length / first) * first).toString(),
					},
					around,
				},
			},
		};
	},

	async downSampled({ id }, { dataPoints, singleColumn }, { services: { downsampling, logger } }) {
		assertDefined(id);

		if (!(dataPoints === 18 || dataPoints === 100)) {
			logger.error(`Invalid dataPoints argument: ${dataPoints}. Must be 18 or 100.`);
			return undefined;
		}
		const datapoints: 18 | 100 = dataPoints;

		const request = {
			resourceId: id,
			datapoints,
			keyIndicatorMode: singleColumn ?? false,
		};

		try {
			const downsampled = await downsampling.requestGraph(request);

			if (!downsampled) return undefined;

			return {
				x: {
					...downsampled.x,
					device: downsampled.x.deviceId ? { id: downsampled.x.deviceId } : undefined,
				},
				y: downsampled.y.map((y) => ({
					...y,
					device: y.deviceId ? { id: y.deviceId } : undefined,
				})),
			};
		} catch (e) {
			logger.error(`Error while downsampling data ${id}: ${JSON.stringify(e)}`);
		}

		return undefined;
	},
};
