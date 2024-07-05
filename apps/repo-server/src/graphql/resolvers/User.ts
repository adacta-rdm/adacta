import { eq } from "drizzle-orm";

import { paginateDocuments } from "./utils/paginateDocuments";
import type { IDevice, IProject, IResolvers, IResource, ISample } from "../generated/resolvers";

export const User: IResolvers["User"] = {
	async name({ id }, __, { services: { el }, schema: { User } }) {
		const user = await el.findOne(User, id);

		if (!user) {
			throw new Error("UserEntity not found");
		}

		return `${user.firstName} ${user.lastName}`;
	},

	async repositories(_, __, { services: { el }, schema: { UserRepository }, userId }) {
		const rows = await el.drizzle
			.select({ repo: UserRepository.repositoryName })
			.from(UserRepository)
			.where(eq(UserRepository.userId, userId));

		return rows.map((r) => r.repo);
	},

	async createdDevices({ id }, _, { services: { el }, schema: { Device } }) {
		const devices = await el.find(Device, (t) => eq(t.metadataCreatorId, id));
		return paginateDocuments<IDevice>(devices.map((d) => ({ id: d.id })));
	},

	async createdResources({ id }, _, { services: { el }, schema: { Resource } }) {
		const resources = await el.find(Resource, (t) => eq(t.metadataCreatorId, id));
		return paginateDocuments<IResource>(resources.map((d) => ({ id: d.id })));
	},

	async createdSamples({ id }, _, { services: { el }, schema: { Sample } }) {
		const samples = await el.find(Sample, (t) => eq(t.metadataCreatorId, id));
		return paginateDocuments<ISample>(samples.map((d) => ({ id: d.id })));
	},

	async createdProjects({ id }, _, { services: { el }, schema: { Project } }) {
		const projects = await el.find(Project, (t) => eq(t.metadataCreatorId, id));
		return paginateDocuments<IProject>(projects.map((d) => ({ id: d.id })));
	},
};
