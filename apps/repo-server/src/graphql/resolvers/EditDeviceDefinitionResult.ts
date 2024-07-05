import type { IResolvers } from "../generated/resolvers";

export const EditDeviceDefinitionResult: IResolvers["EditDeviceDefinitionResult"] = {
	__resolveType(a) {
		if ("message" in a) {
			return "Error";
		}
		return "DeviceDefinition";
	},
};
