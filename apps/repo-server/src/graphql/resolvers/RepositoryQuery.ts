import assert from "assert";

import {
	and,
	asc,
	count,
	desc,
	eq,
	exists,
	gt,
	inArray,
	isNotNull,
	isNull,
	lte,
	not,
	notExists,
	or,
	sql,
} from "drizzle-orm";
import type { SQL } from "drizzle-orm/sql/sql";

import { CONSTANT_NODE_IDS } from "./ConstantNodeIds";
import { ImportResolvers } from "./Import";
import { Node } from "./Node";
import { paginateDocuments } from "./utils/paginateDocuments";
import { DuplicateNameHandling } from "../../utils/repositoryConfigValues/DuplicateNameHandling";
import type { IDefinedResolver } from "../IDefinedResolver";
import { RepositoryInfo } from "../RepositoryInfo";
import type {
	IDevice,
	IDeviceDefinition,
	IHierarchicalDeviceListEntry,
	IProject,
	IResource,
	ISample,
} from "../generated/resolvers";
import { IConflictResolution, IDeviceOrder, IResourceOrder } from "../generated/resolvers";

import type { IResourceDocumentAttachmentRaw } from "~/apps/repo-server/interface/IResourceDocumentAttachment";
import { DataverseClient } from "~/apps/repo-server/src/csvExport/DataverseClient";
import { preProcessQuery } from "~/apps/repo-server/src/graphql/resolvers/SearchResults";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { pickJsonbField } from "~/drizzle/queryHelpers/pickJsonField";
import { CURRENT_USER_ID_PLACEHOLDER } from "~/lib/CURRENT_USER_ID_PLACEHOLDER";
import { assertDefined } from "~/lib/assert/assertDefined";
import { isNonNullish } from "~/lib/assert/isNonNullish";
import type {
	IDeviceDefinitionId,
	IDeviceId,
	IProjectId,
	IResourceId,
	ISampleId,
	IUserId,
} from "~/lib/database/Ids";
import { collectRelatedDefinitions } from "~/lib/inheritance/resolver/collectRelatedDefinitions";

export const RepositoryQuery: IDefinedResolver<"RepositoryQuery"> = {
	...ImportResolvers,

	async repository(_, { id }, { setRepositoryInfo, repositoryName }) {
		if (repositoryName !== id) await setRepositoryInfo(new RepositoryInfo(id));
		return RepositoryQuery;
	},

	node(_, { id }) {
		return { id };
	},

	async nodes(_, { ids }, ctx, info) {
		return (
			(
				await Promise.all(
					ids.map(async (id: string) => {
						// This resolver can be called with any ID (even IDs for entities that are marked as deleted)
						// Therefore, we check if the ID is valid (by calling __resolveType)
						// For IDs where __resolveType throws an error, we return nothing in the result array.
						try {
							const type = await Node.__resolveType({ id }, ctx, info);
							return type ? { id: id, __typename: type } : undefined;
						} catch {
							return undefined;
						}
					})
				)
			)
				// This type assertion is necessary because otherwise type of nodes() would require
				// us to return an ID with opaque type which matches __typename. While that might be
				// possible, it wouldn't add much type-safety as long as Node.__resolveType
				// is typed correctly
				.filter(isNonNullish) as { id: string }[]
		);
	},

	/**
	 * @deprecated
	 */
	device(_, vars) {
		// TODO: Use Query.node instead

		return { id: vars.id as IDeviceId };
	},

	async devices(
		_,
		vars,
		{ services: { el, drizzle }, schema: { Device, ProjectToDevice, Property }, userId }
	) {
		const { filter } = vars;
		const time = new Date();

		const sqlFilter: Array<SQL<unknown> | undefined> = [];
		if (vars.usage === "ROOTS_ONLY") {
			// We consider a device as a root device if it matches the following criteria:
			// 1. It has never been used as a subcomponent of another device
			// 2. It has had properties in the past
			sqlFilter.push(
				and(
					// Condition 1
					notExists(
						drizzle
							.select()
							.from(Property)
							.where(
								and(
									// The "join" between the outer and inner query
									eq(Property.deviceId, Device.id),
									// A device is installed somewhere if it has ownerDeviceId set
									isNotNull(Property.ownerDeviceId)
								)
							)
					),
					// Condition 2
					exists(
						drizzle.select().from(Property).where(
							// The "join" between the outer and inner query
							eq(Property.ownerDeviceId, Device.id)
						)
					)
				)
			);
		} else if (vars.usage === "UNUSED_ONLY") {
			// Exclude devices that are already installed somewhere
			sqlFilter.push(
				notExists(
					drizzle
						.select()
						.from(Property)
						.where(
							and(
								// The "join" between the outer and inner query
								eq(Property.deviceId, Device.id),
								// A device is installed somewhere if it has ownerDeviceId set
								isNotNull(Property.ownerDeviceId),
								lte(Property.begin, time),
								or(isNull(Property.end), gt(Property.end, time))
							)
						)
				)
			);
		}

		// Filter by project
		if (filter?.projectIds && filter?.projectIds.length > 0) {
			assert(isEntityId(filter?.projectIds, "Project"));
			sqlFilter.push(
				exists(
					drizzle
						.select()
						.from(ProjectToDevice)
						.where(
							and(
								eq(ProjectToDevice.deviceId, Device.id),
								inArray(ProjectToDevice.projectId, filter?.projectIds)
							)
						)
				)
			);
		}

		// Filter by user
		if (filter?.userIds && filter?.userIds.length > 0) {
			// currentUserIdPlaceholder is a special value that refers to the currently logged-in user
			const filterUserIds = filter.userIds.map((id) =>
				id === CURRENT_USER_ID_PLACEHOLDER ? userId : id
			);
			assert(isEntityId(filterUserIds, "User"));
			sqlFilter.push(inArray(Device.metadataCreatorId, filterUserIds));
		}

		// Filter by search value
		if (filter?.searchValue) {
			const tsQuery = preProcessQuery(filter?.searchValue);
			sqlFilter.push(and(sql`search @@ ${tsQuery}`));
		}

		const devices = await el.find(Device, {
			where: and(...sqlFilter),
			orderBy: (t) => (vars.order_by === IDeviceOrder.Name ? asc(t.name) : desc(t.name)),
		});

		return paginateDocuments<IDevice>(
			devices.map(({ id }) => ({ id })),
			vars.first,
			vars.after
		);
	},

	/**
	 * @deprecated
	 */
	resource(_, vars) {
		// TODO: Use Query.node instead

		return { id: vars.id as IResourceId };
	},

	async resources(
		_,
		{ rootsOnly, first, after, order_by, filter },
		{ services: { el, drizzle }, schema: { Resource, ProjectToResource, Transformation }, userId }
	) {
		const getResources = async (rootsOnly: boolean) => {
			const sqlFilter: Array<SQL<unknown> | undefined> = [isNull(Resource.metadataDeletedAt)];

			// Filter by search value
			if (
				filter?.searchValue !== undefined &&
				filter?.searchValue !== null &&
				filter?.searchValue.trim() !== ""
			) {
				const tsQuery = preProcessQuery(filter?.searchValue);
				sqlFilter.push(
					and(
						sql`search @@
					${tsQuery}`
					)
				);
			}

			// Filter by project
			if (filter?.projectIds && filter?.projectIds.length > 0) {
				assert(isEntityId(filter?.projectIds, "Project"));
				sqlFilter.push(
					exists(
						drizzle
							.select()
							.from(ProjectToResource)
							.where(
								and(
									eq(ProjectToResource.resourceId, Resource.id),
									inArray(ProjectToResource.projectId, filter?.projectIds)
								)
							)
					)
				);
			}

			// Filter by user
			if (filter?.userIds && filter?.userIds.length > 0) {
				// currentUserIdPlaceholder is a special value that refers to the currently logged-in user
				const filterUserIds = filter.userIds.map((id) =>
					id === CURRENT_USER_ID_PLACEHOLDER ? userId : id
				);
				assert(isEntityId(filterUserIds, "User"));
				sqlFilter.push(inArray(Resource.metadataCreatorId, filterUserIds));
			}

			// TODO: This query filter is not tested
			if (rootsOnly) {
				const transformationResults = (await el.find(Transformation)).flatMap((o) =>
					Object.values(o.output)
				);
				sqlFilter.push(
					not(inArray(Resource.id, transformationResults)),
					eq(
						pickJsonbField(Resource.attachment, "type"),
						"Raw" satisfies IResourceDocumentAttachmentRaw["type"]
					)
				);
			}

			return el.find(Resource, {
				where: and(...sqlFilter),
			});
		};

		const resources = await getResources(rootsOnly ?? false);

		// TODO: Implement order_by using SQL + Add limit and offset

		switch (order_by) {
			case IResourceOrder.CreationDate:
				resources.sort(
					(a, b) =>
						new Date(a.metadataCreationTimestamp).getTime() -
						new Date(b.metadataCreationTimestamp).getTime()
				);
				break;
			case IResourceOrder.CreationDateDesc:
				resources.sort(
					(a, b) =>
						new Date(b.metadataCreationTimestamp).getTime() -
						new Date(a.metadataCreationTimestamp).getTime()
				);
				break;
			case IResourceOrder.Name:
				resources.sort((a, b) => a.name.localeCompare(b.name));
				break;
			case IResourceOrder.NameDesc:
			default:
				resources.sort((a, b) => b.name.localeCompare(a.name));
				break;
		}

		return paginateDocuments<IResource>(
			resources.map((r) => ({ id: r.id })),
			first,
			after
		);
	},

	mergedResourceChart(_, { ids, alignStart, offsets }, { services: { downsampling } }) {
		return downsampling.requestGraphMerged({
			resourceIds: ids as IResourceId[],
			datapoints: 150,
			alignStart: alignStart !== null ? alignStart : undefined,
			offsets: offsets !== null ? offsets : undefined,
		});
	},

	/**
	 * @deprecated
	 */
	sample(_, vars) {
		// TODO: Use Query.node instead

		return { id: vars.id as ISampleId };
	},

	async samples(
		_,
		vars,
		{ services: { el, drizzle }, schema: { Sample, SampleToSample, ProjectToSample }, userId }
	) {
		const { filter } = vars;
		const sqlFilter: Array<SQL<unknown> | undefined> = [];
		if (vars.rootsOnly === true) {
			sqlFilter.push(isNull(SampleToSample.id));
		}

		// Filter by search value
		if (
			filter?.searchValue !== undefined &&
			filter?.searchValue !== null &&
			filter?.searchValue.trim() !== ""
		) {
			const tsQuery = preProcessQuery(filter.searchValue);
			sqlFilter.push(
				and(
					sql`search @@
			${tsQuery}`
				)
			);
		}

		//Filter by project
		if (
			filter?.projectIds !== undefined &&
			filter?.projectIds !== null &&
			filter.projectIds.length > 0
		) {
			assert(isEntityId(filter.projectIds, "Project"));
			sqlFilter.push(
				exists(
					drizzle
						.select()
						.from(ProjectToSample)
						.where(
							and(
								eq(ProjectToSample.sampleId, Sample.id),
								inArray(ProjectToSample.projectId, filter.projectIds)
							)
						)
				)
			);
		}

		// Filter by user
		if (filter?.userIds !== undefined && filter?.userIds !== null && filter.userIds.length > 0) {
			// currentUserIdPlaceholder is a special value that refers to the currently logged-in user
			const filterUserIds = filter.userIds.map((id) =>
				id === CURRENT_USER_ID_PLACEHOLDER ? userId : id
			);
			assert(isEntityId(filterUserIds, "User"));
			sqlFilter.push(inArray(Sample.metadataCreatorId, filterUserIds));
		}

		if (vars.rootsOnly == true) {
			const rootsOnly = await drizzle
				.select()
				.from(Sample)
				.leftJoin(SampleToSample, eq(Sample.id, SampleToSample.sample2))
				.where(and(...sqlFilter)); // Select only samples which are not in the SamplesToSample table (on the child side)

			return paginateDocuments<ISample>(
				rootsOnly.map((s) => ({ id: s.Sample.id })),
				vars.first,
				vars.after
			);
		}

		const samples = await el.find(Sample);
		return paginateDocuments<ISample>(
			samples.map((s) => ({ id: s.id })),
			vars.first,
			vars.after
		);
	},

	/**
	 * Returns the currently logged-in user.
	 *
	 * @see CurrentUser
	 */
	currentUser() {
		return {
			id: CONSTANT_NODE_IDS.CURRENT_USER_ID.id,
		};
	},

	/**
	 * @deprecated
	 */
	user(_, vars) {
		// TODO: Use Query.node instead

		return { id: vars.id as IUserId };
	},

	deviceDefinition(_, { id }) {
		return {
			id: id as IDeviceDefinitionId,
		};
	},

	async deviceDefinitions(_, __, { services: { el }, schema: { DeviceDefinition } }) {
		const deviceDefinitions = await el.find(DeviceDefinition, (t) => isNull(t.metadataDeletedAt));

		return paginateDocuments<IDeviceDefinition>(deviceDefinitions.map(({ id }) => ({ id })));
	},

	search() {
		// To make SearchResults refetchable the `SearchResults` type needs to have an id
		return { id: CONSTANT_NODE_IDS["SEARCH_RESULT_ID"].id };
	},

	async projects(__, _, { services: { el }, schema: { Project } }) {
		const projects = (await el.find(Project, (t) => isNull(t.metadataDeletedAt))).map((e) => ({
			id: e.id,
		}));

		return paginateDocuments<IProject>(projects);
	},

	project(_, { id }) {
		return { id: id as IProjectId };
	},

	async devicesHierarchical(_, __, { services: { el }, schema: { Property } }) {
		// TODO: Evaluate if this can be done more efficiently by calling this to find the current root devices:
		//  const roots = await this.devices?.(_, { filter: "ROOTS_ONLY"}, ctx)

		// Skip all sample entries because this code is device-centric
		const data = await el.find(Property, and(isNull(Property.end), isNull(Property.sampleId)));

		let possibleRoots = [];

		// Create Map from Device -> Subdevice
		const propertiesByDevice = new Map<IDeviceId, DrizzleEntity<"Property">[]>();
		for (const doc of data) {
			const array = propertiesByDevice.get(doc.ownerDeviceId) ?? [];

			array.push(doc);

			propertiesByDevice.set(doc.ownerDeviceId, array);
			possibleRoots.push(doc.ownerDeviceId);
		}
		possibleRoots = [...new Set(possibleRoots)];

		// Identify possible roots by finding all devices which aren't used as a property
		for (const children of propertiesByDevice.values()) {
			for (const child of children) {
				const index = possibleRoots.indexOf(child.deviceId as IDeviceId);
				if (index !== -1) {
					possibleRoots.splice(index, 1);
				}
			}
		}

		const collectChildren = (node: IDeviceId, startPath?: string[]) => {
			const children = propertiesByDevice.get(node) ?? [];
			const items: { path: string[]; property: DrizzleEntity<"Property"> }[] = [];
			for (const child of children) {
				const path = [...(startPath ?? [])];
				path.push(child.name);
				items.push(
					{ path, property: child },
					...collectChildren(child.deviceId as IDeviceId, path)
				);
			}

			return items;
		};

		const docs = possibleRoots.map((r) => {
			const components = collectChildren(r, []);

			const c = {
				device: { id: r },
				components: components.map((c) => {
					return {
						pathFromTopLevelDevice: c.path,
						installDate: c.property.begin.toISOString(),
						component: { __typename: "Device" as const, id: c.property.deviceId as IDeviceId },
					};
				}),
			};

			return c;
		});

		return paginateDocuments<IHierarchicalDeviceListEntry>(docs, 500);
	},

	async checkNameAvailability(
		_,
		{ name, checkFor },
		{ services: { drizzle, repoConfig }, schema: { Device, Sample, Project, DeviceDefinition } }
	) {
		let Table;
		if (checkFor === "DEVICE") {
			Table = Device;
		} else if (checkFor === "DEVICE_DEFINITION") {
			Table = DeviceDefinition;
		} else if (checkFor === "SAMPLE") {
			Table = Sample;
		} else if (checkFor === "PROJECT") {
			Table = Project;
		} else {
			throw new Error(`Invalid value for checkFor: ${checkFor}`);
		}

		const [{ itemCount }] = await drizzle
			.select({ itemCount: count(Table.id) })
			.from(Table)
			.where(eq(Table.name, name));

		const getConflictResolution = async () => {
			switch (await repoConfig.getValue("DuplicateNameHandling")) {
				case DuplicateNameHandling.IGNORE:
					return IConflictResolution.Ignore;
				case DuplicateNameHandling.WARN:
					return IConflictResolution.Warn;
				case DuplicateNameHandling.DENY:
					return IConflictResolution.Deny;
			}
		};

		return {
			isAvailable: itemCount === 0,
			conflictResolution: await getConflictResolution(),
		};
	},

	deviceNameComposition() {
		return { __typename: "NameCompositionQuery" };
	},

	async deviceDefinitionsTree(_, { simulatedParentId }, { services: { el }, schema }) {
		const parents = simulatedParentId ?? [];

		const relatedDefinitions =
			parents.length > 0
				? await collectRelatedDefinitions(parents[0] as IDeviceDefinitionId | IDeviceId, {
						el,
						schema,
				  })
				: [];
		return relatedDefinitions.map((r) => ({
			level: r.level,
			definition: { id: r.definition },
		}));
	},

	async users(_, __, { services: { drizzle }, schema: { User, UserRepository }, repositoryName }) {
		assertDefined(repositoryName);
		const users = await drizzle
			.select({ id: User.id })
			.from(User)
			.leftJoin(UserRepository, eq(UserRepository.userId, User.id))
			.where(eq(UserRepository.repositoryName, repositoryName))
			.orderBy(asc(User.firstName), asc(User.lastName));
		return users.map((u) => ({ id: u.id }));
	},

	async dataverses(_, { instanceId }, { services: { el }, schema: { UserDataverseConnection } }) {
		assert(isEntityId(instanceId, "UserDataverseConnection"));
		const instance = (await el.find(UserDataverseConnection, (t) => eq(t.id, instanceId)))[0];
		const client = new DataverseClient(instance.url, instance.token);
		return client.getDataverseCollections();
	},
};
