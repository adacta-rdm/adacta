import { and, eq, isNull } from "drizzle-orm";

import { metadata } from "./utils/metadata";
import type { IResolvers } from "../generated/resolvers";

export const Project: IResolvers["Project"] = {
	name({ id }, _, { services: { el }, schema: { Project } }) {
		return el.one(Project, id, "name");
	},

	async contents(
		{ id },
		_,
		{
			services: { drizzle },
			schema: { ProjectToDevice, ProjectToSample, ProjectToResource, Device, Sample, Resource },
		}
	) {
		const deviceIds = await drizzle
			.select({ id: ProjectToDevice.deviceId })
			.from(ProjectToDevice)
			.innerJoin(Device, eq(ProjectToDevice.deviceId, Device.id))
			.where(and(eq(ProjectToDevice.projectId, id), isNull(Device.metadataDeletedAt)));

		const sampleIds = await drizzle
			.select({ id: ProjectToSample.sampleId })
			.from(ProjectToSample)
			.innerJoin(Sample, eq(ProjectToSample.sampleId, Sample.id))
			.where(and(eq(ProjectToSample.projectId, id), isNull(Sample.metadataDeletedAt)));

		const resourceIds = await drizzle
			.select({ id: ProjectToResource.resourceId, name: Resource.name })
			.from(ProjectToResource)
			.innerJoin(Resource, eq(ProjectToResource.resourceId, Resource.id))
			.where(and(eq(ProjectToResource.projectId, id), isNull(Resource.metadataDeletedAt)));

		return [...deviceIds, ...sampleIds, ...resourceIds];
	},

	metadata,
};
