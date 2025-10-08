import { eq } from "drizzle-orm";
import moment from "moment";

import type { IGraphQLContext } from "~/apps/repo-server/src/graphql/IGraphQLContext";
import { PlainTextTable } from "~/apps/repo-server/src/graphql/resolvers/utils/TablePrinter";
import { collectSamples } from "~/apps/repo-server/src/graphql/traversal/collectSamples";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { createDate } from "~/lib/createDate";

export async function generateReadme(
	resource: DrizzleEntity<"Resource">,
	{ services: { el }, schema }: IGraphQLContext
) {
	const { Device } = schema;
	if (resource.attachment.type !== "TabularData") {
		throw new Error("Only tabular data resources are supported");
	}
	const begin = createDate(resource.attachment.begin);
	const end = createDate(resource.attachment.end);

	const deviceIds = resource.attachment.columns
		.map((column) => column.deviceId)
		.filter((id) => id !== undefined);

	const relevantSampleIds = [
		...new Set(
			(
				await Promise.all(
					deviceIds.flatMap(async (id) => {
						if (id === undefined) {
							return [];
						}
						const samples = await collectSamples(id, el, schema);

						return samples
							.filter((s) => {
								const validTimeFrames = s.timeframes.filter((t) => {
									return t.begin <= end && begin <= (t.end ?? Infinity);
								});
								return validTimeFrames.length > 0;
							})
							.map((s) => s.sample.id);
					})
				)
			).flat()
		),
	];
	const relevantSamples = await Promise.all(
		relevantSampleIds.map((id) => el.one(schema.Sample, id))
	);
	const relevantSamplesText = (
		await Promise.all(
			relevantSamples.map((s) => generateSampleReport(s, { services: { el }, schema }))
		)
	).join("\n");

	// Table with information about the columns
	const columnTable = new PlainTextTable({ columnDelimiter: "\t" });
	columnTable.addRow(["Column", "Unit", "Measured by"]);
	for (const column of resource.attachment.columns) {
		const device = column.deviceId ? await el.one(Device, column.deviceId) : undefined;
		const measuredByString = device ? device.name : "";
		const unitString = column.unit !== "" ? `${column.unit}` : "";
		columnTable.addRow([column.title, unitString, measuredByString]);
	}

	const metadataTable = new PlainTextTable();
	metadataTable.addRow(["Start of recording:", toDataverseDate(begin)]);
	metadataTable.addRow(["End of recording:", toDataverseDate(end)]);

	return `
----------------------------------------
Metadata 
----------------------------------------
${metadataTable.getTable()}

----------------------------------------
Relevant samples
----------------------------------------
${relevantSamplesText}

----------------------------------------
Description of the measured data
----------------------------------------
${columnTable.getTable()}



README automatically generated using Adacta (https://github.com/adacta-rdm/adacta/)`;
}

/**
Dataverse expects dates in the format "yyyy-MM-dd HH:mm:ss z"
https://guides.dataverse.org/en/6.6/user/tabulardataingest/csv-tsv.html#recognized-data-types-and-formatting
*/
export const toDataverseDate = (d: Date) => {
	// The tokens used by moment.js slightly differ from the ones used in the
	// DataVerse documentation
	return moment(d).utc().format("YYYY-MM-DD HH:mm:ss UTC");
};

async function generateSampleReport(
	sample: DrizzleEntity<"Sample">,
	ctx: Pick<IGraphQLContext, "schema"> & { services: Pick<IGraphQLContext["services"], "el"> }
): Promise<string> {
	const {
		services: { el },
		schema,
	} = ctx;
	const parentSampleId = (await el.find(schema.SampleToSample, (t) => eq(t.sample2, sample.id)))[0];
	const parentSample =
		parentSampleId != null ? await el.one(schema.Sample, parentSampleId.sample1) : undefined;

	const notes = await el.find(schema.Note, (t) => eq(t.itemId, sample.id));

	const notesTable = new PlainTextTable({
		columnDelimiter: "\t", // Use bigger delimiter to make columns more obvious
		maxWidth: 50,
	});
	for (const n of notes) {
		const timeString =
			"begin" in n.note
				? "end" in n.note
					? `${toDataverseDate(n.note.begin)} - ${n.note.end ? toDataverseDate(n.note.end) : "now"}`
					: `${toDataverseDate(n.note.begin)}`
				: "";

		notesTable.addRow([timeString, n.note.caption, n.note.text]);
	}

	const referenceToParent = parentSample ? ` (created out of ${parentSample.name})` : "";
	const parentText = parentSample ? await generateSampleReport(parentSample, ctx) : "";
	return `Sample: ${sample.name}${referenceToParent}\n${notesTable.getTable()}\n${parentText}`;
}
