import assert from "assert";

import type { IResolvers } from "../../generated/resolvers";

import { createIDatetime, createMaybeIDatetime } from "~/lib/createDate";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";

export const SetupDescriptionMutations: IResolvers["RepositoryMutation"] = {
	async addSetupLabel(_, { input }, { services: { el }, schema: { Device } }) {
		const device = await el.one(Device, input.deviceId as IDeviceId);

		device.setupDescription = device.setupDescription.map((s) => {
			if (input.imageId == s.imageResource) {
				s.setupLabels.push({
					xPos: input.xPos,
					yPos: input.yPos,
					propertyPath: input.propertyPath,
				});
			}

			return s;
		});

		await el.update(Device, device.id, device);
		return { id: device.id };
	},

	async deleteSetupLabel(_, { input }, { services: { el }, schema: { Device } }) {
		const device = await el.one(Device, input.deviceId as IDeviceId);

		device.setupDescription = device.setupDescription.map((s) => {
			if (input.imageId == s.imageResource) {
				const oldLength = s.setupLabels.length;
				s.setupLabels = s.setupLabels.filter(
					(label) => label.xPos !== input.xPos || label.yPos !== input.yPos
				);
				assert(s.setupLabels.length === oldLength - 1);
			}

			return s;
		});

		await el.update(Device, device.id, device);

		return { id: device.id };
	},

	async linkImageWithSetupDescription(_, { input }, { services: { el }, schema: { Device } }) {
		const deviceId = input.deviceId as IDeviceId;

		const resourceId = input.resourceId as IResourceId;

		const device = await el.one(Device, deviceId);
		device.setupDescription.push({
			setupLabels: [],
			imageResource: resourceId,
			begin: createIDatetime(new Date(input.begin)),
			end: createMaybeIDatetime(input.end ? new Date(input.end) : undefined),
		});

		await el.update(Device, device.id, device);
		return { id: device.id };
	},

	async deleteSetupDescription(_, { input }, { services: { el }, schema: { Device } }) {
		const deviceId = input.deviceId as IDeviceId;
		const device = await el.one(Device, deviceId);

		device.setupDescription = device.setupDescription.filter(
			(s) => s.imageResource !== input.imageId
		);

		await el.update(Device, device.id, device);
		return { id: device.id };
	},

	async updateSetupDescriptionTime(_, { input }, { services: { el }, schema: { Device } }) {
		const deviceId = input.deviceId as IDeviceId;
		const device = await el.one(Device, deviceId);

		device.setupDescription = device.setupDescription.map((s) => {
			if (s.imageResource === input.resourceId) {
				s.begin = createIDatetime(new Date(input.begin));
				s.end = createMaybeIDatetime(input.end ? new Date(input.end) : undefined);
				return s;
			}
			return s;
		});

		await el.update(Device, device.id, device);
		return { id: device.id };
	},
};
