import assert from "node:assert";

import { assertDefined, assertUnreachable } from "@omegadot/assert";
import { and, eq, isNull, or } from "drizzle-orm";

import { CONSTANT_NODE_IDS } from "./ConstantNodeIds";
import { ImportMutations } from "./Import";
import { CSVImportWizardMutations } from "./mutations/CSVImportWizardMutation";
import { SetupDescriptionMutations } from "./mutations/SetupDescriptionMutations";
import { assertEntitySupportsProject } from "./utils/assertEntitySupportsProject";
import { deviceDefinitionUsages } from "./utils/deviceDefinitionUsages";
import { requestShortId } from "./utils/requestShortId";
import { usageInResource } from "./utils/usageInResource";
import { usagesAsProperty } from "./utils/usagesAsProperty";
import { createTransformationContext } from "../../transformations/createTransformationContext";
import { manualTransformation } from "../../transformations/manual/ManualTransformation";
import type { IResolvers } from "../generated/resolvers";

import { RepositoryInfo } from "~/apps/repo-server/src/graphql/RepositoryInfo";
import { createPropertyValue } from "~/apps/repo-server/src/graphql/resolvers/utils/createPropertyValue";
import { linkToProject } from "~/apps/repo-server/src/graphql/resolvers/utils/linkToProject";
import { loadDeviceOrDeviceDefinition } from "~/apps/repo-server/src/graphql/resolvers/utils/loadDeviceOrDeviceDefinition";
import {
	closureTableInsert,
	closureTableSetParent,
} from "~/apps/repo-server/src/utils/closureTable/closureTableTree";
import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import { setSpecifications } from "~/apps/repo-server/src/utils/setSpecifications";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { assertUnitKinds } from "~/lib/assertUnitKind";
import { createDate, createMaybeDate } from "~/lib/createDate";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type {
	IDeviceDefinitionId,
	IDeviceId,
	INameCompositionId,
	INameCompositionVariableId,
	INoteId,
	IProjectId,
	IPropertyId,
	IResourceId,
	ISampleId,
	IUserId,
} from "~/lib/database/Ids";

export const RepositoryMutation: IResolvers["RepositoryMutation"] = {
	...ImportMutations,
	...CSVImportWizardMutations,
	...SetupDescriptionMutations,

	async repository(_, { id }, { setRepositoryInfo, repositoryName }) {
		if (repositoryName !== id) await setRepositoryInfo(new RepositoryInfo(id));
		return RepositoryMutation;
	},

	async upsertDevice(
		_,
		{ insert, update },
		{ userId, services: { drizzle, el, ipm }, schema: { IdPool, Device, DeviceSpecification } }
	) {
		let deviceId!: IDeviceId;
		assertDefined(insert ?? update);
		const o = insert ?? update;
		assertDefined(o);
		const { input } = o;

		const definitionId = input.deviceDefinition;
		assert(isEntityId(definitionId, "DeviceDefinition"));

		let shortId: string | undefined;

		if (input.assignShortId) {
			shortId = await requestShortId({ drizzle, ipm, IdPool });
		}

		if (insert) {
			// Re-assign since we know what properties are defined and want the proper type for
			// insertions
			const { input } = insert;
			const device = EntityFactory.create(
				"Device",
				{
					name: input.name,
					definitionId,
					shortId,
					imageResourceIds: [],
					setupDescription: [],
					couchId: null, // TODO
				},
				userId
			);

			await drizzle.insert(Device).values(device);
			await setSpecifications(device.id, input.specifications, DeviceSpecification, el);
			deviceId = device.id;
		} else if (update) {
			const { input } = update;

			const device = await el.one(Device, update.id);
			device.definitionId = definitionId;
			device.name = input.name ?? device.name;

			if (input.specifications) {
				await setSpecifications(device.id, input.specifications, DeviceSpecification, el);
			}

			device.shortId = shortId ?? device.shortId;

			await drizzle.update(Device).set(device).where(eq(Device.id, device.id));
			deviceId = device.id;
		}

		return {
			add: {
				appendedEdge: {
					isNewlyCreated: true,
					node: {
						id: deviceId,
					},
					cursor: deviceId,
				},
				appendedEdgeHierarchical: {
					isNewlyCreated: true,
					node: {
						device: {
							id: deviceId,
						},
						components: [],
					},
					cursor: deviceId,
				},
			},
			edit: {
				id: deviceId,
			},
		};
	},

	async addDeviceDefinition(_, { input }, { userId, services: { drizzle, el }, schema }) {
		const { DeviceDefinition } = schema;
		assertUnitKinds(input.acceptedUnits);

		const definition = EntityFactory.create(
			"DeviceDefinition",
			{
				name: input.name,
				acceptsUnit: input.acceptedUnits,
				imageResourceIds: [],
			},
			userId
		);

		await drizzle.insert(DeviceDefinition).values(definition);
		await setSpecifications(
			definition.id,
			input.specifications,
			schema.DeviceDefinitionSpecification,
			el
		);

		if (input.parentDeviceDefinition != undefined) {
			assert(isEntityId(input.parentDeviceDefinition, "DeviceDefinition"));
			await closureTableInsert(
				el,
				schema.DeviceDefinitionPaths,
				input.parentDeviceDefinition,
				definition.id
			);
		}

		return { id: definition.id };
	},

	async editDeviceDefinition(_, { input }, { services: { el, drizzle }, schema }) {
		const { DeviceDefinition, DeviceDefinitionPaths } = schema;
		assertUnitKinds(input.acceptedUnits);

		const definition = await el.one(DeviceDefinition, input.id);

		const oldParentDeviceIds = await el.drizzle
			.select({ id: DeviceDefinitionPaths.ancestorId })
			.from(DeviceDefinitionPaths)
			.where(
				and(
					eq(DeviceDefinitionPaths.descendantId, definition.id),
					eq(DeviceDefinitionPaths.depth, 1)
				)
			);

		// Check if the new parent causes a loop
		if (oldParentDeviceIds[0]?.id !== input.id) {
			const wouldCauseLoop =
				input.parentDeviceDefinition != undefined && // No parent means no loop
				(
					await el.drizzle
						.select()
						.from(DeviceDefinitionPaths)
						.where(
							and(
								eq(DeviceDefinitionPaths.ancestorId, definition.id),
								eq(
									DeviceDefinitionPaths.descendantId,
									input.parentDeviceDefinition as IDeviceDefinitionId
								)
							)
						)
				).length > 0;

			if (wouldCauseLoop) {
				return {
					message:
						"This change would lead to a constellation in which device definitions inherit from themselves (via indirections). This is not allowed, because the derivation of inherited values becomes impossible.",
				};
			}

			assert(
				input.parentDeviceDefinition == undefined ||
					isEntityId(input.parentDeviceDefinition, "DeviceDefinition")
			);

			await closureTableSetParent(
				definition.id,
				input.parentDeviceDefinition ?? undefined,
				el,
				DeviceDefinitionPaths
			);
		}

		definition.name = input.name;
		definition.acceptsUnit = input.acceptedUnits;

		await drizzle
			.update(DeviceDefinition)
			.set(definition)
			.where(eq(DeviceDefinition.id, definition.id));

		await setSpecifications(
			definition.id,
			input.specifications,
			schema.DeviceDefinitionSpecification,
			el
		);

		return { id: definition.id };
	},

	async deleteDevice(_, { id }, ctx) {
		const {
			services: { logger, el, drizzle },
			schema,
		} = ctx;
		const { Device, Property } = schema;

		const device = await el.one(Device, id);

		// Ignore the mutation if device is still in use.
		// This can happen if a user has the device/device list open while another user starts using
		// the device (by linking it to a resource or using it as component). In that case the UI
		// will still show the enabled delete button, but the mutation will do nothing in that case
		// In theory a different response should be sent, but I think this is fine for now (it
		// should be quite unlikely that User A deletes a Device while User B is starting to use it)
		// const properties = await db.query("property/by_device", {
		// 	key: id as IDeviceId,
		// });
		const properties = await drizzle
			.select()
			.from(Property)
			.where(eq(Property.ownerDeviceId, device.id));

		if (
			properties.length == 0 &&
			(await usageInResource(device.id, el, schema)).length == 0 &&
			(
				await usagesAsProperty(
					{ id: id as IDeviceId },
					{ timeFrame: { begin: null, end: null } },
					ctx
				)
			).length == 0
		) {
			device.metadataDeletedAt = new Date();
		} else {
			logger.warn(
				`Got mutation to delete device ${device.name} (${device.id}) but it is still in use. Ignoring.`
			);
		}

		await drizzle.update(Device).set(device).where(eq(Device.id, device.id));

		// db.searchManager.removeById(device.id);

		return { deletedId: id };
	},

	async deleteDeviceDefinition(_, { id }, { services: { el }, schema }) {
		const { DeviceDefinition } = schema;
		const deviceDefinition = await el.one(DeviceDefinition, id);

		if ((await deviceDefinitionUsages(id as IDeviceDefinitionId, el, schema)).length > 0) {
			return {
				__typename: "Error",
				message:
					"This Device-Type could not be deleted because it is still in use (either as a Type of a Device or another Device Type is defined as a Sub-Type of this Device-Type)",
			};
		}

		deviceDefinition.metadataDeletedAt = new Date();

		await el.drizzle
			.update(DeviceDefinition)
			.set(deviceDefinition)
			.where(eq(DeviceDefinition.id, deviceDefinition.id));

		// db.searchManager.removeById(deviceDefinition.id);

		return { __typename: "DeletedNode", deletedId: id };
	},

	async addSample(_, { input }, { userId, services: { drizzle }, schema: { Sample } }) {
		const sample = EntityFactory.create("Sample", { name: input.name }, userId);

		await drizzle.insert(Sample).values(sample);

		return {
			appendedEdge: {
				node: {
					id: sample.id,
				},
				cursor: sample.id,
			},
		};
	},

	async addSampleAndSampleRelation(
		_,
		{ input },
		{ userId, services: { drizzle }, schema: { Sample, SampleToSample } }
	) {
		const sample = EntityFactory.create("Sample", { name: input.name }, userId);
		await drizzle.insert(Sample).values(sample).execute();

		const relation = EntityFactory.create(
			"SampleToSample",
			{
				relationType: "createdOutOf",
				begin: new Date(),

				sample1: input.sample1 as ISampleId,
				sample2: sample.id,
			},
			userId
		);

		await drizzle.insert(SampleToSample).values(relation).execute();

		return {
			id: input.sample1 as ISampleId,
		};
	},

	async addSampleRelation(
		_,
		{ input },
		{ userId, services: { drizzle }, schema: { SampleToSample } }
	) {
		const relation = EntityFactory.create(
			"SampleToSample",
			{
				relationType: "createdOutOf",
				begin: new Date(),

				sample1: input.sample1 as ISampleId,
				sample2: input.sample2 as ISampleId,
			},
			userId
		);
		await drizzle.insert(SampleToSample).values(relation).execute();

		return {
			sample1: { id: input.sample1 as ISampleId },
			sample2: { id: input.sample2 as ISampleId },
		};
	},

	async makePrimaryDeviceImage(_, { input }, { services: { el }, schema }) {
		const { Device, DeviceDefinition } = schema;
		const { type, thing } = await loadDeviceOrDeviceDefinition(input.imageOwnerId, el, schema);

		// Push passed ID in front of array
		const imageIds = [input.imageId as IResourceId].concat(
			thing.imageResourceIds.filter((id) => id !== input.imageId)
		);

		thing.imageResourceIds = imageIds;

		// TODO: Introduce generic helper?
		if (type === "Device") {
			await el.drizzle
				.update(Device)
				.set({ imageResourceIds: thing.imageResourceIds })
				.where(eq(Device.id, thing.id as IDeviceId));
		} else if (type === "DeviceDefinition") {
			await el.drizzle
				.update(DeviceDefinition)
				.set({ imageResourceIds: thing.imageResourceIds })
				.where(eq(DeviceDefinition.id, thing.id as IDeviceDefinitionId));
		} else {
			assertUnreachable(type);
		}

		return { id: input.imageOwnerId } as { id: IDeviceDefinitionId } | { id: IDeviceId };
	},

	async addDeviceImage(_, { input }, { services: { el }, schema }) {
		const { Device, DeviceDefinition } = schema;
		const { type, thing } = await loadDeviceOrDeviceDefinition(input.imageOwnerId, el, schema);

		thing.imageResourceIds.push(input.imageId as IResourceId);

		// TODO: Introduce generic helper?
		if (type === "Device") {
			await el.drizzle
				.update(Device)
				.set({ imageResourceIds: thing.imageResourceIds })
				.where(eq(Device.id, thing.id as IDeviceId));
		} else if (type === "DeviceDefinition") {
			await el.drizzle
				.update(DeviceDefinition)
				.set({ imageResourceIds: thing.imageResourceIds })
				.where(eq(DeviceDefinition.id, thing.id as IDeviceDefinitionId));
		} else {
			assertUnreachable(type);
		}
		return { id: input.imageOwnerId } as { id: IDeviceDefinitionId } | { id: IDeviceId };
	},

	async deleteDeviceImage(_, { input }, { services: { el }, schema }) {
		const { Device, DeviceDefinition } = schema;
		const { type, thing } = await loadDeviceOrDeviceDefinition(input.imageOwnerId, el, schema);

		thing.imageResourceIds = thing.imageResourceIds.filter((id) => id !== input.imageId);

		// TODO: Introduce generic helper?
		if (type === "Device") {
			await el.drizzle
				.update(Device)
				.set({ imageResourceIds: thing.imageResourceIds })
				.where(eq(Device.id, thing.id as IDeviceId));
		} else if (type === "DeviceDefinition") {
			await el.drizzle
				.update(DeviceDefinition)
				.set({ imageResourceIds: thing.imageResourceIds })
				.where(eq(DeviceDefinition.id, thing.id as IDeviceDefinitionId));
		} else {
			assertUnreachable(type);
		}

		return { id: input.imageOwnerId } as { id: IDeviceDefinitionId } | { id: IDeviceId };
	},

	async removeComponent(_, { input }, { services: { el }, schema: { Property } }) {
		const componentId = input.componentId as IDeviceId | ISampleId;

		const conditions = [
			or(
				eq(Property.sampleId, componentId as ISampleId),
				eq(Property.deviceId, componentId as IDeviceId)
			),
			eq(Property.begin, createDate(input.begin)),
		];

		if (input.end == undefined) {
			conditions.push(isNull(Property.end));
		} else {
			conditions.push(eq(Property.end, createDate(input.end)));
		}

		const properties = await el.find(Property, and(...conditions));

		// Ensure that there is exactly one property matching the provided "description"
		assert(properties.length === 1);

		const property = properties[0];

		await el.drizzle.delete(Property).where(eq(Property.id, property.id));

		return { id: input.returnedDeviceId as IDeviceId };
	},

	async addComponent(_, { input }, { userId, services: { el }, schema: { Property } }) {
		const componentId = input.componentId as IDeviceId | ISampleId;

		const parentId = input.parentDeviceId as IDeviceId;
		const { begin, end, name } = input;

		const property = EntityFactory.create(
			"Property",
			{
				name,
				begin: createDate(begin),
				end: createMaybeDate(end),
				ownerDeviceId: parentId,
				...createPropertyValue(componentId),
			},
			userId
		);
		await el.drizzle.insert(Property).values(property);

		return { id: input.returnedDeviceId as IDeviceId };
	},

	async editComponent(_, { input }, { services: { drizzle }, schema: { Property } }) {
		const componentId = input.componentId as IDeviceId | ISampleId;
		const { begin, end, name } = input;

		const property = {
			name,
			begin: new Date(begin),
			end: end ? new Date(end) : null,
			...createPropertyValue(componentId),
		};

		await drizzle
			.update(Property)
			.set(property)
			.where(eq(Property.id, input.propertyId as IPropertyId));

		return { id: input.returnedDeviceId as IDeviceId };
	},

	async swapComponent(_, { input }, { userId, services: { el }, schema: { Property } }) {
		const swapTime = createDate(input.swapTime);
		const endTime = createMaybeDate(input.newPropertyEndTime);

		const existingProperty = await el.one(Property, input.propertyId);
		const newProperty = EntityFactory.create(
			"Property",
			{
				name: existingProperty.name,
				begin: swapTime,
				end: endTime ?? null,
				ownerDeviceId: existingProperty.ownerDeviceId,
				...createPropertyValue(input.componentId),
			},
			userId
		);

		existingProperty.end = swapTime;

		// Update existing property
		await el.update(Property, existingProperty.id, existingProperty);

		// Insert new property
		await el.insert(Property, newProperty);

		return { id: input.returnedDeviceId as IDeviceId };
	},

	async linkToProject(_, { input }, { services: { el }, schema }) {
		await linkToProject(input, el, schema);

		return { node: { id: input.projectId as IProjectId } };
	},

	async removeFromProject(
		_,
		{ input },
		{ services: { el }, schema: { ProjectToResource, ProjectToDevice, ProjectToSample } }
	) {
		assertEntitySupportsProject(input.id);

		const type = decodeEntityId(input.id);
		const projectId = input.projectId as IProjectId;

		if (type === "Resource") {
			await el.drizzle
				.delete(ProjectToResource)
				.where(
					and(
						eq(ProjectToResource.resourceId, input.id as IResourceId),
						eq(ProjectToResource.projectId, projectId)
					)
				);
		} else if (type === "Device") {
			await el.drizzle
				.delete(ProjectToDevice)
				.where(
					and(
						eq(ProjectToDevice.deviceId, input.id as IDeviceId),
						eq(ProjectToDevice.projectId, projectId)
					)
				);
		} else if (type === "Sample") {
			await el.drizzle
				.delete(ProjectToSample)
				.where(
					and(
						eq(ProjectToSample.sampleId, input.id as ISampleId),
						eq(ProjectToSample.projectId, projectId)
					)
				);
		}

		return { deletedProjectId: input.projectId };
	},

	async addProject(_, { input }, { userId, services: { el, drizzle }, schema }) {
		const { Project } = schema;
		const project = EntityFactory.create("Project", { name: input.name }, userId);
		await drizzle.insert(Project).values(project);

		await linkToProject({ projectId: project.id, id: input.id }, el, schema);

		return { node: { id: project.id } };
	},

	async deleteProject(_, { id }, { services: { el, drizzle }, schema: { Project } }) {
		const project = await el.one(Project, id as IProjectId);
		project.metadataDeletedAt = new Date();

		await drizzle.update(Project).set(project).where(eq(Project.id, project.id)).execute();

		// db.searchManager.removeById(id);
		return { deletedId: id };
	},

	async deleteResource(_, { input }, { services: { el }, schema: { Resource } }) {
		const { resourceId } = input;
		const resource = await el.one(Resource, resourceId);
		resource.metadataDeletedAt = new Date();

		await el.drizzle
			.update(Resource)
			.set({ metadataDeletedAt: resource.metadataDeletedAt })
			.where(eq(Resource.id, resourceId as IResourceId));

		// db.searchManager.removeById(resource._id);

		return { deletedId: resourceId };
	},

	async addEditNote(_, { input }, { userId, services: { el }, schema: { Note } }) {
		const { id, text, caption, begin, end, thingId } = input;

		if (id) {
			const note = await el.one(Note, id as INoteId);

			// Push into history
			note.history.push({
				...note.note,
				metadata: {
					metadataCreatorId: note.metadataCreatorId,
					metadataCreationTimestamp: note.metadataCreationTimestamp,
					metadataDeletedAt: null,
				},
			});

			// Overwrite creator data
			note.metadataCreatorId = userId;

			note.note = { text, caption, begin: createMaybeDate(begin), end: createMaybeDate(end) };

			await el.drizzle.update(Note).set(note).where(eq(Note.id, note.id));
			return { id: note.id };
		} else {
			const note = EntityFactory.create(
				"Note",
				{
					itemId: thingId as ISampleId | IDeviceId,
					note: { text, caption, begin: createMaybeDate(begin), end: createMaybeDate(end) },
					history: [],
				},
				userId
			);

			await el.drizzle.insert(Note).values(note);
			return { id: note.id };
		}
	},

	async deleteNote(_, { id }, { services: { el }, schema: { Note } }) {
		const note = await el.one(Note, id);

		note.metadataDeletedAt = new Date();

		await el.drizzle.update(Note).set(note).where(eq(Note.id, note.id));

		return { deletedId: note.id };
	},

	async addManualTransformation(
		_,
		{ input },
		{ userId, services: { el, ram, rm, downsampling, logger, sto }, schema }
	) {
		const { Transformation } = schema;
		const sourceId = input.source as IResourceId;
		const targetId = input.target as IResourceId;

		const transformationContext = createTransformationContext(
			userId,
			ram,
			rm,
			downsampling,
			logger,
			el,
			schema,
			sto
		);
		const { transformationDoc } = manualTransformation(transformationContext, {
			transformationSource: sourceId,
			transformationTarget: targetId,
		});

		await el.insert(Transformation, transformationDoc);

		return { source: { id: sourceId }, target: { id: targetId } };
	},

	async upsertNameCompositionVariableVariable(
		_,
		{ insert, update },
		{ userId, services: { el, nameComposition, drizzle }, schema: { NameCompositionVariable } }
	) {
		let entitiy: DrizzleEntity<"NameCompositionVariable">;
		if (insert?.input) {
			const { name, alias, prefix, suffix } = insert.input;
			entitiy = EntityFactory.create(
				"NameCompositionVariable",
				{
					name,
					alias,
					prefix: prefix ?? null,
					suffix: suffix ?? null,
					value: null, // This is a variable, so value is null
				},
				userId
			);
			await drizzle.insert(NameCompositionVariable).values(entitiy).execute();
		} else if (update?.input) {
			const id = update.id;
			const { name, alias, prefix, suffix } = update.input;
			entitiy = await el.one(NameCompositionVariable, id as INameCompositionVariableId);

			entitiy.name = name ?? entitiy.name;
			entitiy.alias = alias ?? entitiy.alias;
			entitiy.prefix = prefix ?? entitiy.prefix;
			entitiy.suffix = suffix ?? entitiy.suffix;

			nameComposition.clearCache();

			await drizzle
				.update(NameCompositionVariable)
				.set(entitiy)
				.where(eq(NameCompositionVariable.id, entitiy.id))
				.execute();
		} else {
			throw new Error("Invalid input: Either create or update must be defined");
		}

		return { node: { id: entitiy.id } };
	},

	async upsertNameCompositionVariableConstant(
		_,
		{ insert, update },
		{ userId, services: { el, drizzle }, schema: { NameCompositionVariable } }
	) {
		let entitiy: DrizzleEntity<"NameCompositionVariable">;
		if (insert?.input) {
			const { name, value } = insert.input;
			entitiy = EntityFactory.create(
				"NameCompositionVariable",
				{
					name,
					value: value ?? null,
					// Set remaining fields to null as this is a constant
					suffix: null,
					prefix: null,
					alias: null,
				},
				userId
			);

			await drizzle.insert(NameCompositionVariable).values(entitiy).execute();
		} else if (update?.input) {
			const id = update.id;
			const { name, value } = update.input;
			entitiy = await el.one(NameCompositionVariable, id as INameCompositionVariableId);

			entitiy.name = name ?? entitiy.name;
			entitiy.value = value ?? entitiy.value;

			await drizzle
				.update(NameCompositionVariable)
				.set(entitiy)
				.where(eq(NameCompositionVariable.id, entitiy.id))
				.execute();
		} else {
			throw new Error("Invalid input: Either create or update must be defined");
		}

		return { node: { id: entitiy.id } };
	},

	async upsertNameComposition(
		_,
		{ insert, update },
		{
			userId,
			services: { el, drizzle, nameComposition },
			schema: { NameComposition, NameCompositionVariableUsage },
		}
	) {
		let entity: DrizzleEntity<"NameComposition">;

		const insertVariableUsages = async (variables: string[]) => {
			assert(isEntityId(variables, "NameCompositionVariable"));

			if (variables.length) {
				await drizzle.insert(NameCompositionVariableUsage).values(
					variables.map((variable, index) => ({
						nameCompositionId: entity.id,
						variableId: variable,
						order: index,
					}))
				);
			}
		};

		if (insert?.input) {
			const { name, variables, legacyNameIndex, shortIdIndex } = insert.input;
			entity = EntityFactory.create(
				"NameComposition",
				{
					name,
					legacyNameIndex: legacyNameIndex ?? null,
					shortIdIndex: shortIdIndex ?? null,
				},
				userId
			);

			await insertVariableUsages(variables);

			await drizzle.insert(NameComposition).values(entity).execute();
		} else if (update?.input) {
			const id = update.id;
			const { name, variables, legacyNameIndex, shortIdIndex } = update.input;
			entity = await el.one(NameComposition, id as INameCompositionId);

			entity.name = name ?? entity.name;
			entity.legacyNameIndex =
				// If legacyNameIndex is undefined, we want to keep the old value
				legacyNameIndex === undefined
					? entity.legacyNameIndex
					: // If legacyNameIndex is null, we want to set it to undefined
					  legacyNameIndex ?? null;

			entity.shortIdIndex =
				// If legacyNameIndex is undefined, we want to keep the old value
				shortIdIndex === undefined
					? entity.shortIdIndex
					: // If legacyNameIndex is null, we want to set it to undefined
					  shortIdIndex ?? null;

			if (variables) {
				// Reset entries
				await drizzle
					.delete(NameCompositionVariableUsage)
					.where(eq(NameCompositionVariableUsage.nameCompositionId, entity.id))
					.execute();

				await insertVariableUsages(variables);
			}

			await drizzle.update(NameComposition).set(entity).where(eq(NameComposition.id, entity.id));
		} else {
			throw new Error("Invalid input: Either create or update must be defined");
		}

		// await em.persistAndFlush(entity);
		nameComposition.clearCache();
		return { node: { node: { id: entity.id }, query: { __typename: "NameCompositionQuery" } } };
	},

	async deleteNameCompositionVariable(
		_,
		{ id },
		{ services: { el, drizzle }, schema: { NameCompositionVariable } }
	) {
		assert(isEntityId(id, "NameCompositionVariable"));
		const entity = await el.one(NameCompositionVariable, id);

		entity.metadataDeletedAt = new Date();
		await drizzle
			.update(NameCompositionVariable)
			.set(entity)
			.where(eq(NameCompositionVariable.id, entity.id))
			.execute();
		return { deletedId: id };
	},

	async deleteNameComposition(
		_,
		{ id },
		{ services: { el, drizzle }, schema: { NameComposition, NameCompositionVariableUsage } }
	) {
		const entity = await el.one(NameComposition, id as INameCompositionId);
		// await em.nativeDelete(NameCompositionVariableUsageEntity, { nameCompositions: entity.id });

		await drizzle
			.delete(NameCompositionVariableUsage)
			.where(eq(NameCompositionVariableUsage.nameCompositionId, entity.id))
			.execute();

		entity.metadataDeletedAt = new Date();

		await drizzle.update(NameComposition).set(entity).execute();

		return { deletedId: id };
	},

	async upsertSample(
		_,
		{ insert, update },
		{ userId, services: { el, drizzle }, schema: { Sample, SampleSpecification } }
	) {
		if (insert?.input) {
			const { name, specifications } = insert.input;
			const entitiy = EntityFactory.create("Sample", { name, specifications }, userId);
			await drizzle.insert(Sample).values(entitiy).execute();
			return { node: { id: entitiy.id } };
		} else if (update?.input) {
			const { name, specifications } = update.input;
			const entitiy = await el.one(Sample, update.id as ISampleId);

			entitiy.name = name ?? entitiy.name;

			if (specifications) {
				await setSpecifications(entitiy.id, specifications, SampleSpecification, el);
			}

			await drizzle.update(Sample).set(entitiy).where(eq(Sample.id, entitiy.id)).execute();
			return { node: { id: entitiy.id } };
		} else {
			throw new Error("Invalid input: Either create or update must be defined");
		}
	},

	async repoConfigSetDefaultDeviceNamingStrategy(_, input, { services: { repoConfig } }) {
		const id = input.id as INameCompositionId;
		const oldValue = await repoConfig.getValue("DefaultDeviceNamingStrategy");

		await repoConfig.setValueWithPermissionCheck("DefaultDeviceNamingStrategy", id);
		return oldValue ? [{ id: oldValue }, { id }] : [{ id }];
	},

	async repoConfigSetDefaultSampleNamingStrategy(_, input, { services: { repoConfig } }) {
		const id = input.id as INameCompositionId;
		const oldValue = await repoConfig.getValue("DefaultSampleNamingStrategy");

		await repoConfig.setValueWithPermissionCheck("DefaultSampleNamingStrategy", id);
		return oldValue ? [{ id: oldValue }, { id }] : [{ id }];
	},

	async requestShortId(_, { id }, { services: { el, ipm }, schema: { Device, IdPool } }) {
		const thingType = decodeEntityId(id);
		assert(thingType === "Device");

		const thing = await el.one(Device, id);

		if (thing.shortId) {
			return {
				__typename: "Error",
				message:
					"An ID has already been generated for this device. It is possible to create another ID.",
			};
		}

		const shortId = await requestShortId({ drizzle: el.drizzle, ipm, IdPool });
		thing.shortId = shortId;
		await el.drizzle.update(Device).set({ shortId }).where(eq(Device.id, thing.id));
		return { __typename: thingType, id: thing.id };
	},

	async updateTimeSettings(_, { input }, { userId, services: { el }, schema: { User } }) {
		const { timeStyle, dateStyle, locale } = input;
		assert(isTimeStyle(timeStyle) && isTimeStyle(dateStyle));

		assert(
			timeStyle === "short" ||
				timeStyle === "medium" ||
				timeStyle === "full" ||
				timeStyle === "long",
			"Invalid time style"
		);
		assert(
			dateStyle === "short" ||
				dateStyle === "medium" ||
				dateStyle === "full" ||
				dateStyle === "long",
			"Invalid date style"
		);

		await el.drizzle
			.update(User)
			.set({
				locale,
				timeStyle,
				dateStyle,
			})
			.where(eq(User.id, userId as IUserId));

		return {
			id: CONSTANT_NODE_IDS["CURRENT_USER_ID"].id,
		};
	},
};

function isTimeStyle(input: string) {
	return input === "long" || input === "full" || input === "medium" || input === "short";
}
