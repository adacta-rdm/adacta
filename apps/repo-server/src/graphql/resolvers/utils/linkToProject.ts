import { assertEntitySupportsProject } from "~/apps/repo-server/src/graphql/resolvers/utils/assertEntitySupportsProject";
import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDeviceId, IProjectId, IResourceId, ISampleId } from "~/lib/database/Ids";

export async function linkToProject(
	args: { id: string; projectId: string },
	el: EntityLoader,
	{ ProjectToResource, ProjectToDevice, ProjectToSample }: DrizzleSchema
) {
	assertEntitySupportsProject(args.id);

	const projectId = args.projectId as IProjectId;
	const type = decodeEntityId(args.id);

	if (type === "Resource") {
		await el.insert(ProjectToResource, {
			resourceId: args.id as IResourceId,
			projectId: projectId,
		});
	} else if (type === "Device") {
		await el.insert(ProjectToDevice, {
			deviceId: args.id as IDeviceId,
			projectId: projectId,
		});
	} else if (type === "Sample") {
		await el.insert(ProjectToSample, {
			sampleId: args.id as ISampleId,
			projectId: projectId,
		});
	}
}
