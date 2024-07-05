import assert from "assert";

import { and, eq, gt, isNull, lte, or, sql } from "drizzle-orm";

import { metadata } from "./utils/metadata";
import { notes } from "./utils/notes";
import { usagesAsProperty } from "./utils/usagesAsProperty";
import { findRootDevicesWithinTimeframe } from "../../utils/findRootDevicesWithinTimeframe";
import type { IProject, IResolvers } from "../generated/resolvers";
import { collectDevices } from "../traversal/collectSamples";

import type { IResourceDocumentAttachmentTabularData } from "~/apps/repo-server/interface/IResourceDocumentAttachment";
import { paginateDocuments } from "~/apps/repo-server/src/graphql/resolvers/utils/paginateDocuments";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { assertIsoDate, createDate, createMaybeDate } from "~/lib/createDate";
import { collectRelatedSamples } from "~/lib/inheritance/resolver/collectRelatedSamples";

export const Sample: IResolvers["Sample"] = {
	name({ id }, _, { services: { el }, schema: { Sample } }) {
		return el.one(Sample, id, "name");
	},

	displayName({ id }, _, { services: { nameComposition } }) {
		return nameComposition.getName({ type: "Sample", id });
	},

	// TODO: Rename to properties/usagesAsProperties
	async devices({ id }, _, { services: { el }, schema: { Property } }) {
		return (await el.find(Property, (t) => eq(t.sampleId, id))).map(({ id }) => ({ id }));
	},

	async device({ id }, { timestamp }, { services: { drizzle }, schema: { Property } }) {
		let time: Date;
		//
		if (timestamp !== null && timestamp !== undefined) {
			assertIsoDate(timestamp);
			time = createDate(timestamp);
		} else {
			time = new Date();
		}

		const [deviceId] = await drizzle
			.select({ id: Property.ownerDeviceId })
			.from(Property)
			.where(
				and(
					eq(Property.sampleId, id), // Select the property with the sample as value
					or(gt(Property.end, time), isNull(Property.end)), // End of the property must be: after the given time OR not set (to ensure the usage is not over)
					lte(Property.begin, time) // Begin of the property must be before the given time (to ensure the usage has already started)
				)
			)
			.limit(1);

		return deviceId;
	},

	async relatedSamples({ id }, _, { services: { el }, schema: { SampleToSample } }) {
		const relations = await el.find(SampleToSample, (t) => eq(t.sample1, id));

		return relations.map((r) => ({
			id: r.id,
			type: r.relationType,
			sample: { id: r.sample2 },
		}));
	},

	async relatedSamplesReverse({ id }, _, { services: { el }, schema: { SampleToSample } }) {
		const relations = await el.find(SampleToSample, (t) => eq(t.sample2, id));

		return relations.map((r) => ({
			id: r.id,
			type: r.relationType,
			sample: { id: r.sample1 },
		}));
	},

	async resources({ id }, _, { services: { el }, schema }) {
		const resources: DrizzleEntity<"Resource">[] = [];
		const devices = await collectDevices(id, el, schema);
		for (const { device, timeframes } of devices) {
			const r = await el.find(
				schema.Resource,
				// https://dba.stackexchange.com/a/130863
				(t) =>
					and(
						isNull(t.metadataDeletedAt),
						sql`${t.attachment} @? '$.columns[*].deviceId ? (@ == "${sql.raw(device.id)}")'`
					)
			);

			for (const resource of r) {
				// Safe to cast here because the query above ensures that the attachment is of type TabularData
				const { begin, end } = resource.attachment as IResourceDocumentAttachmentTabularData;

				// Check if the found resource was linked to the device while the sample was used together
				// with the device
				if (
					timeframes.find(
						(t) =>
							t.begin <= (new Date(end) ?? Infinity) &&
							(new Date(begin) ?? -Infinity) <= (t.end ?? Infinity)
					)
				) {
					resources.push(resource);
				}
			}
		}

		const sorted = resources.sort((a, b) => {
			assert(a.attachment.type == "TabularData");
			assert(b.attachment.type == "TabularData");

			return createDate(a.attachment.begin).getTime() - createDate(b.attachment.end).getTime();
		});

		return [...new Set(sorted.map((r) => r.id))].map((id) => ({ id }));
	},

	async topLevelDevice({ id }, { timestamp }, { services: { el }, schema: { Property } }) {
		const time = createMaybeDate(timestamp) ?? new Date();

		const topLevelDeviceId = (
			await findRootDevicesWithinTimeframe(id, el, Property, time, time)
		).at(0);

		if (topLevelDeviceId) return { id: topLevelDeviceId };

		return null;
	},

	async specifications({ id }, _, { services: { el }, schema: { SampleSpecification } }) {
		assert(isEntityId(id, "Sample"));
		return el.drizzle.select().from(SampleSpecification).where(eq(SampleSpecification.ownerId, id));
	},

	async specificationsCollected({ id }, _, { services: { el }, schema }) {
		return (await collectRelatedSamples(id, el, schema)).map((d) => ({
			sample: { id: d.sample },
			level: d.level,
		}));
	},

	async projects({ id }, _, { services: { drizzle }, schema: { ProjectToSample } }) {
		const projects = await drizzle
			.select({ id: ProjectToSample.projectId })
			.from(ProjectToSample)
			.where(eq(ProjectToSample.sampleId, id));

		return paginateDocuments<IProject>(projects);
	},

	usagesAsProperty,
	notes,
	metadata,
};
