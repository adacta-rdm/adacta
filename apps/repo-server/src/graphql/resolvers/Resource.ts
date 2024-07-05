import { assertDefined, assertUnreachable } from "@omegadot/assert";
import { eq, inArray } from "drizzle-orm";

import { metadata } from "./utils/metadata";
import type { IProject, IResolvers, IResource } from "../generated/resolvers";

import { paginateDocuments } from "~/apps/repo-server/src/graphql/resolvers/utils/paginateDocuments";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";

export const Resource: IResolvers["Resource"] = {
	async __resolveType({ id }: { id: IResourceId }, { services: { el }, schema: { Resource } }) {
		assertDefined(id);
		const attachment = await el.one(Resource, id, "attachment");
		const kind = attachment.type;

		switch (kind) {
			case "Raw":
				return "ResourceGeneric";
			case "TabularData":
				return "ResourceTabularData";
			case "Image":
				return "ResourceImage";
			default:
				assertUnreachable(kind);
		}
	},

	async name({ id }, _, { services: { el }, schema: { Resource } }) {
		return el.one(Resource, id, "name");
	},

	async type({ id }, _, { services: { el }, schema: { Resource } }) {
		return (await el.one(Resource, id, "attachment")).type;
	},

	async parent({ id }, _, { services: { el }, schema: { Transformation } }) {
		const transformations = await el.find(Transformation);
		const creatorTransformation = transformations.find((d) => Object.values(d.output).includes(id));

		if (creatorTransformation) {
			const inputId = Object.values(creatorTransformation.input)[0];
			return { id: inputId };
		}
	},

	async children({ id }, _, { services: { el }, schema: { Transformation, Resource } }) {
		const transformations = await el.find(Transformation);

		const childTransformation = transformations.filter((d) =>
			Object.entries(d.input)
				// Ignore entries where this transformation is the target (only required for the
				// manual transformation as it requires the input/output resources as arguments)
				.filter(([key]) => key !== "transformationTarget")
				.map(([, value]) => value)
				.includes(id)
		);

		const resourceIds = childTransformation.flatMap((t) => Object.values(t.output));

		if (resourceIds.length === 0) {
			return paginateDocuments<IResource>([]);
		}
		const resources = await el.find(Resource, (t) => inArray(t.id, resourceIds));
		return paginateDocuments<IResource>(resources.map((r) => ({ id: r.id })));
	},

	async devices({ id }, _, { services: { el }, schema: { Resource } }) {
		assertDefined(id);

		const attachment = await el.one(Resource, id, "attachment");
		if (attachment.type !== "TabularData") return [];
		return attachment.columns
			.map((m) => ({ id: m.deviceId }))
			.filter((m): m is { id: IDeviceId } => !!m.id);
	},

	async projects({ id }, _, { services: { drizzle }, schema: { ProjectToResource } }) {
		const projects = await drizzle
			.select({ id: ProjectToResource.projectId })
			.from(ProjectToResource)
			.where(eq(ProjectToResource.resourceId, id));

		return paginateDocuments<IProject>(projects);
	},

	metadata,
};
