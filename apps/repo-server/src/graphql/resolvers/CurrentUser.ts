import { CONSTANT_NODE_IDS } from "./ConstantNodeIds";
import type { IResolvers } from "../generated/resolvers";

export const CurrentUser: IResolvers["CurrentUser"] = {
	id() {
		return CONSTANT_NODE_IDS["CURRENT_USER_ID"].id;
	},

	async payload(_, __, { userId, services: { el }, schema: { User } }) {
		const user = await el.findOne(User, userId);

		if (!user) return {};

		return {
			user: { id: userId },
			timeSetting: {
				timeStyle: user.timeStyle,
				dateStyle: user.dateStyle,
				locale: user.locale,
			},
		};
	},
};
