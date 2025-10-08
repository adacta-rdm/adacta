import { eq } from "drizzle-orm";

import { CONSTANT_NODE_IDS } from "./ConstantNodeIds";
import type { IUserDataverseConnection } from "../generated/resolvers";
import type { IResolvers } from "../generated/resolvers";

import { maskToken } from "~/apps/repo-server/src/graphql/resolvers/utils/maskToken";
import { paginateDocuments } from "~/apps/repo-server/src/graphql/resolvers/utils/paginateDocuments";

export const CurrentUser: IResolvers["CurrentUser"] = {
	id() {
		return CONSTANT_NODE_IDS["CURRENT_USER_ID"].id;
	},

	async payload(_, __, { userId, services: { el }, schema: { User, UserDataverseConnection } }) {
		const user = await el.findOne(User, userId);

		const dataverses = (
			await el.find(UserDataverseConnection, (t) => eq(t.metadataCreatorId, userId))
		).map((d) => ({ id: d.id, name: d.name, url: d.url, tokenPreview: maskToken(d.token) }));

		if (!user) return {};

		return {
			user: { id: userId },
			timeSetting: {
				timeStyle: user.timeStyle,
				dateStyle: user.dateStyle,
				locale: user.locale,
			},
			dataverses: await paginateDocuments<IUserDataverseConnection>(dataverses),
		};
	},
};
