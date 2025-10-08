// @generated
import { ResolverReturnType } from "~/lib/utils/types";
import type { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from "graphql";
import type { IGraphQLContext } from "../IGraphQLContext";
export type Maybe<T> = T | null | undefined;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
	ID: string;
	String: string;
	Boolean: boolean;
	Int: number;
	Float: number;
	DateTime: string;
	ResourceType: any;
	ColumnType: any;
	JSONString: any;
};

export type IRepositoryQuery = {
	__typename?: "RepositoryQuery";
	repository: IRepositoryQuery;
	node?: Maybe<INode>;
	nodes: Array<INode>;
	/**
	 * Fetches a UserProfile by given `id`.
	 * If no id is given the currently logged in user is returned.
	 */
	user?: Maybe<IUser>;
	currentUser: ICurrentUser;
	users: Array<IUser>;
	devices: IDeviceConnection;
	device: IDevice;
	resources: IResourceConnection;
	resource: IResource;
	mergedResourceChart: Array<IData>;
	samples: ISampleConnection;
	sample: ISample;
	/** Request for a single device definition */
	deviceDefinition: IDeviceDefinition;
	/** Request for a list of device definitions */
	deviceDefinitions: IConnection_DeviceDefinition;
	/** Request for a full tree where simulatedParentId is treated as the parent of the root node */
	deviceDefinitionsTree: Array<IDeviceDefinitionGraphElement>;
	search: ISearchResults;
	importPresets: IConnection_ImportPreset;
	projects: IProjectConnection;
	project: IProject;
	devicesHierarchical: IHierarchicalDeviceListConnection;
	deviceNameComposition: INameCompositionQuery;
	/**
	 * Checks if the given name is available for the given "target type"
	 *
	 * checkFor: The type of the object that should be checked for name availability (i.e. Device, Sample)
	 */
	checkNameAvailability: ICheckNameAvailability;
	/**
	 * A dataverse instance can have multiple dataverses. This query returns a list of all dataverses
	 * of a instance
	 */
	dataverses: Array<IDataverse>;
};

export type IRepositoryQueryRepositoryArgs = {
	id: Scalars["ID"];
};

export type IRepositoryQueryNodeArgs = {
	id: Scalars["ID"];
};

export type IRepositoryQueryNodesArgs = {
	ids: Array<Scalars["ID"]>;
};

export type IRepositoryQueryUserArgs = {
	id: Scalars["ID"];
};

export type IRepositoryQueryDevicesArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
	order_by?: InputMaybe<IDeviceOrder>;
	usage?: InputMaybe<IDevicesUsage>;
	filter?: InputMaybe<IDevicesFilterInput>;
};

export type IRepositoryQueryDeviceArgs = {
	id: Scalars["ID"];
};

export type IRepositoryQueryResourcesArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
	rootsOnly?: InputMaybe<Scalars["Boolean"]>;
	order_by?: InputMaybe<IResourceOrder>;
	filter?: InputMaybe<IResourcesFilterInput>;
};

export type IRepositoryQueryResourceArgs = {
	id: Scalars["ID"];
};

export type IRepositoryQueryMergedResourceChartArgs = {
	ids: Array<Scalars["ID"]>;
	alignStart?: InputMaybe<Scalars["Boolean"]>;
	offsets?: InputMaybe<Array<Scalars["Int"]>>;
};

export type IRepositoryQuerySamplesArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
	rootsOnly?: InputMaybe<Scalars["Boolean"]>;
	filter?: InputMaybe<ISamplesFilterInput>;
};

export type IRepositoryQuerySampleArgs = {
	id: Scalars["ID"];
};

export type IRepositoryQueryDeviceDefinitionArgs = {
	id: Scalars["ID"];
};

export type IRepositoryQueryDeviceDefinitionsTreeArgs = {
	simulatedParentId?: InputMaybe<Array<Scalars["ID"]>>;
};

export type IRepositoryQueryImportPresetsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
	deviceId?: InputMaybe<Scalars["ID"]>;
};

export type IRepositoryQueryProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IRepositoryQueryProjectArgs = {
	id: Scalars["ID"];
};

export type IRepositoryQueryDevicesHierarchicalArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IRepositoryQueryCheckNameAvailabilityArgs = {
	name: Scalars["String"];
	checkFor?: InputMaybe<INameAvailabilityCheckTarget>;
};

export type IRepositoryQueryDataversesArgs = {
	instanceId: Scalars["ID"];
};

export type INode = {
	id: Scalars["ID"];
};

export type IDevice = INode &
	ISupportsUsageAsProperty &
	ISupportsNotes &
	IHasMetadata &
	IHasImageResource &
	IHasProjects & {
		__typename?: "Device";
		id: Scalars["ID"];
		name: Scalars["String"];
		displayName: Scalars["String"];
		metadata: IMetadata;
		/** A unique identifier for this device. It is used in the URL of the device page. */
		shortId?: Maybe<Scalars["String"]>;
		definition: IDeviceDefinition;
		definitions: Array<IDeviceDefinitionGraphElement>;
		/** Returns the combined specifications from the device and the inheritance tree */
		specifications: Array<ISpecification>;
		properties: Array<IProperty>;
		imageResource: Array<IResourceImage>;
		setupDescription: Array<ISetupDescription>;
		usagesAsProperty: Array<IProperty>;
		parent?: Maybe<IDevice>;
		samples: Array<ISampleUsage>;
		usageInResource: Array<Maybe<IResourceTimed>>;
		/**
		 * Returns a flat list of all child devices. The list corresponds to the components this device is
		 * made of in the specified timespan. A value of `null` for the `end` argument means "up until
		 * now".
		 */
		components: Array<IComponentWithPathAndTime>;
		topLevelDevice?: Maybe<ITopLevelDevice>;
		/**
		 * Returns the components that are available for use in the given time frame.
		 * This resolver is used to find possible components to be used as sub-components of a device.
		 * A timeframe is required as the device must be unused for the entire duration.
		 *
		 * The property with the ID `ignoreProperty` should be ignored when checking for conflicts, because
		 * it is the property that is being updated (and therefore won't cause a conflict with itself).
		 */
		freeComponents: Array<IPropertyValue>;
		componentsInSlot: Array<IComponentWithPathAndTime>;
		notes: INoteConnection;
		projects: IProjectConnection;
	};

export type IDeviceSpecificationsArgs = {
	names?: InputMaybe<Array<Scalars["String"]>>;
};

export type IDevicePropertiesArgs = {
	timestamp?: InputMaybe<Scalars["DateTime"]>;
};

export type IDeviceSetupDescriptionArgs = {
	time?: InputMaybe<Scalars["DateTime"]>;
};

export type IDeviceUsagesAsPropertyArgs = {
	timeFrame?: InputMaybe<ITimeFrameInput>;
	time?: InputMaybe<Scalars["DateTime"]>;
	includeOverlaps?: InputMaybe<Scalars["Boolean"]>;
};

export type IDeviceParentArgs = {
	timestamp?: InputMaybe<Scalars["DateTime"]>;
};

export type IDeviceComponentsArgs = {
	timeFrame?: InputMaybe<ITimeFrameInput>;
	time?: InputMaybe<Scalars["DateTime"]>;
	includeOverlaps?: InputMaybe<Scalars["Boolean"]>;
};

export type IDeviceTopLevelDeviceArgs = {
	timestamp?: InputMaybe<Scalars["DateTime"]>;
};

export type IDeviceFreeComponentsArgs = {
	begin: Scalars["DateTime"];
	end?: InputMaybe<Scalars["DateTime"]>;
	ignoreProperty?: InputMaybe<Scalars["ID"]>;
};

export type IDeviceComponentsInSlotArgs = {
	path: Array<Scalars["String"]>;
};

export type IDeviceProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type ISupportsUsageAsProperty = {
	usagesAsProperty: Array<IProperty>;
};

export type ISupportsUsageAsPropertyUsagesAsPropertyArgs = {
	timeFrame?: InputMaybe<ITimeFrameInput>;
	time?: InputMaybe<Scalars["DateTime"]>;
	includeOverlaps?: InputMaybe<Scalars["Boolean"]>;
};

export type ISample = INode &
	ISupportsUsageAsProperty &
	ISupportsNotes &
	IHasProjects &
	IHasMetadata & {
		__typename?: "Sample";
		id: Scalars["ID"];
		name: Scalars["String"];
		displayName: Scalars["String"];
		metadata: IMetadata;
		usagesAsProperty: Array<IProperty>;
		/**
		 * Outgoing relations
		 * (i.e. this Sample is a batch and was used to create an other Sample)
		 */
		relatedSamples: Array<ISampleRelation>;
		/**
		 * Incoming relations
		 * (i.e. this Sample is created out of a other Sample which is a batch)
		 */
		relatedSamplesReverse: Array<ISampleRelation>;
		/** Devices that have this sample as a prop */
		devices: Array<IProperty>;
		/** Device that has this sample as a prop at the given time */
		device?: Maybe<IDevice>;
		/** Data that was recorded with this sample */
		resources: Array<IResourceTabularData>;
		topLevelDevice?: Maybe<ITopLevelDevice>;
		notes: INoteConnection;
		projects: IProjectConnection;
		specifications: Array<ISpecification>;
		specificationsCollected: Array<ISpecificationsGraphElement>;
	};

export type ISampleUsagesAsPropertyArgs = {
	timeFrame?: InputMaybe<ITimeFrameInput>;
	time?: InputMaybe<Scalars["DateTime"]>;
	includeOverlaps?: InputMaybe<Scalars["Boolean"]>;
};

export type ISampleDeviceArgs = {
	timestamp?: InputMaybe<Scalars["DateTime"]>;
};

export type ISampleTopLevelDeviceArgs = {
	timestamp?: InputMaybe<Scalars["DateTime"]>;
};

export type ISampleProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type ISupportsNotes = {
	id: Scalars["ID"];
	notes: INoteConnection;
};

export type INoteConnection = IConnection & {
	__typename?: "NoteConnection";
	edges: Array<INoteEdge>;
	pageInfo: IPageInfo;
};

export type IConnection = {
	edges: Array<IEdge>;
	pageInfo: IPageInfo;
};

export type IProjectConnection = IConnection & {
	__typename?: "ProjectConnection";
	edges: Array<IProjectEdge>;
	pageInfo: IPageInfo;
};

export type IProjectEdge = IEdge & {
	__typename?: "ProjectEdge";
	node: IProject;
	cursor: Scalars["String"];
};

export type IEdge = {
	cursor: Scalars["String"];
};

export type IDeletedNodeEdge = IEdge & {
	__typename?: "DeletedNodeEdge";
	node: IDeletedNode;
	cursor: Scalars["String"];
};

export type IDeletedNode = {
	__typename?: "DeletedNode";
	deletedId: Scalars["ID"];
};

export type IHierarchicalDeviceListEdge = IEdge & {
	__typename?: "HierarchicalDeviceListEdge";
	cursor: Scalars["String"];
	node?: Maybe<IHierarchicalDeviceListEntry>;
	/**
	 * Set to "true" if the device was newly created (i.e. for the Edge that is returned as the result
	 * of the add device mutation)
	 *
	 * In the UI this information can then be used to display the newly created device in a highlighted
	 * way (even if filters would otherwise hide it)
	 */
	isNewlyCreated?: Maybe<Scalars["Boolean"]>;
};

export type IHierarchicalDeviceListEntry = {
	__typename?: "HierarchicalDeviceListEntry";
	device: IDevice;
	components: Array<IComponentWithPathAndTime>;
};

export type IComponentWithPathAndTime = {
	__typename?: "ComponentWithPathAndTime";
	component: IPropertyValue;
	pathFromTopLevelDevice: Array<Scalars["String"]>;
	installDate: Scalars["DateTime"];
	removeDate?: Maybe<Scalars["DateTime"]>;
};

export type IPropertyValue = IDevice | ISample;

export type IRowEdge = IEdge & {
	__typename?: "RowEdge";
	node: IRow;
	cursor: Scalars["String"];
};

export type IRow = {
	__typename?: "Row";
	values: Array<Scalars["Float"]>;
};

export type IDeviceEdge = IEdge & {
	__typename?: "DeviceEdge";
	/**
	 * Set to "true" if the device was newly created (i.e. for the Edge that is returned as the result
	 * of the add device mutation)
	 *
	 * In the UI this information can then be used to display the newly created device in a highlighted
	 * way (even if filters would otherwise hide it)
	 */
	isNewlyCreated?: Maybe<Scalars["Boolean"]>;
	node: IDevice;
	cursor: Scalars["String"];
};

export type IResourceEdge = IEdge & {
	__typename?: "ResourceEdge";
	node: IResource;
	cursor: Scalars["String"];
};

export type IResource = {
	id: Scalars["ID"];
	name: Scalars["String"];
	subName?: Maybe<Scalars["String"]>;
	projects: IProjectConnection;
	metadata: IMetadata;
	parent?: Maybe<IResource>;
	children: IResourceConnection;
	devices: Array<IDevice>;
	type?: Maybe<Scalars["ResourceType"]>;
};

export type IResourceProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IResourceTimed = {
	id: Scalars["ID"];
	name: Scalars["String"];
	subName?: Maybe<Scalars["String"]>;
	projects: IProjectConnection;
	metadata: IMetadata;
	parent?: Maybe<IResource>;
	children: IResourceConnection;
	devices: Array<IDevice>;
	type?: Maybe<Scalars["ResourceType"]>;
	/** Timeframe in which the resource was recorded */
	begin?: Maybe<Scalars["DateTime"]>;
	end?: Maybe<Scalars["DateTime"]>;
};

export type IResourceTimedProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IResourceGeneric = INode &
	IResource &
	IResourceTimed &
	IHasProjects &
	IHasMetadata & {
		__typename?: "ResourceGeneric";
		id: Scalars["ID"];
		name: Scalars["String"];
		subName?: Maybe<Scalars["String"]>;
		projects: IProjectConnection;
		metadata: IMetadata;
		parent?: Maybe<IResource>;
		children: IResourceConnection;
		devices: Array<IDevice>;
		type?: Maybe<Scalars["ResourceType"]>;
		uploadDeviceId?: Maybe<Scalars["String"]>;
		/** Timeframe in which the resource was recorded */
		begin?: Maybe<Scalars["DateTime"]>;
		end?: Maybe<Scalars["DateTime"]>;
		/** Path where the resource can be downloaded from. */
		downloadURL: Scalars["String"];
		text: Scalars["String"];
	};

export type IResourceGenericProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IResourceGenericTextArgs = {
	start: Scalars["Int"];
	end: Scalars["Int"];
};

export type IHasProjects = {
	id: Scalars["ID"];
	metadata: IMetadata;
	projects: IProjectConnection;
};

export type IHasProjectsProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IResourceTabularData = INode &
	IResource &
	IResourceTimed &
	IHasProjects &
	IHasMetadata & {
		__typename?: "ResourceTabularData";
		id: Scalars["ID"];
		name: Scalars["String"];
		subName?: Maybe<Scalars["String"]>;
		projects: IProjectConnection;
		metadata: IMetadata;
		parent?: Maybe<IResource>;
		children: IResourceConnection;
		devices: Array<IDevice>;
		type?: Maybe<Scalars["ResourceType"]>;
		/**
		 * Timeframe in which the resource was recorded
		 *
		 * Begin/End are marked as nullable, but the value should always be available.
		 * The fields are marked as nullable here, so that they can be queried within a union with other
		 * resources. According to GraphQL specs, fields with the same name must have the same nullability.
		 */
		begin?: Maybe<Scalars["DateTime"]>;
		end?: Maybe<Scalars["DateTime"]>;
		columns: Array<IColumnDescription>;
		rows?: Maybe<IRowConnection>;
		/**
		 * Downsamples the resources data.
		 * If singleColumn is set to false all columns will be down sampled.
		 * If singleColumn is set to true only one y axis will be select and down sampled. Currently, an attempt is made to
		 * select a specific column position in which the reactor temperature is often (but not always) located.
		 */
		downSampled?: Maybe<IData>;
	};

export type IResourceTabularDataProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IResourceTabularDataRowsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IResourceTabularDataDownSampledArgs = {
	dataPoints: Scalars["Int"];
	singleColumn?: InputMaybe<Scalars["Boolean"]>;
};

export type IHasMetadata = {
	metadata: IMetadata;
};

export type IProject = INode &
	IHasMetadata & {
		__typename?: "Project";
		id: Scalars["ID"];
		name: Scalars["String"];
		metadata: IMetadata;
		contents: Array<IHasProjects>;
	};

export type IMetadata = {
	__typename?: "Metadata";
	creator: IUser;
	creationTimestamp: Scalars["DateTime"];
	origin?: Maybe<IOriginRepoMetadata>;
	canEdit?: Maybe<Scalars["Boolean"]>;
};

export type IUser = INode & {
	__typename?: "User";
	id: Scalars["ID"];
	name: Scalars["String"];
	/** Repositories the user has access to. This is a list of repository names. */
	repositories: Array<Scalars["String"]>;
	createdDevices: IDeviceConnection;
	createdResources: IResourceConnection;
	createdSamples: ISampleConnection;
	createdProjects: IProjectConnection;
};

export type IDeviceConnection = IConnection & {
	__typename?: "DeviceConnection";
	edges: Array<IDeviceEdge>;
	pageInfo: IPageInfo;
};

export type IPageInfo = {
	__typename?: "PageInfo";
	hasPreviousPage: Scalars["Boolean"];
	hasNextPage: Scalars["Boolean"];
	startCursor?: Maybe<Scalars["String"]>;
	endCursor?: Maybe<Scalars["String"]>;
	cursors?: Maybe<IPageCursors>;
};

export type IPageCursors = {
	__typename?: "PageCursors";
	first: IPageCursor;
	last: IPageCursor;
	around: Array<IPageCursor>;
};

export type IPageCursor = {
	__typename?: "PageCursor";
	cursor: Scalars["String"];
	pageNumber: Scalars["Int"];
};

export type IResourceConnection = IConnection & {
	__typename?: "ResourceConnection";
	edges: Array<IResourceEdge>;
	pageInfo: IPageInfo;
};

export type ISampleConnection = IConnection & {
	__typename?: "SampleConnection";
	edges: Array<ISampleEdge>;
	pageInfo: IPageInfo;
};

export type ISampleEdge = IEdge & {
	__typename?: "SampleEdge";
	node: ISample;
	cursor: Scalars["String"];
};

export type IOriginRepoMetadata = {
	__typename?: "OriginRepoMetadata";
	remoteRepo?: Maybe<IRemoteRepo>;
};

export type IRemoteRepo = INode & {
	__typename?: "RemoteRepo";
	id: Scalars["ID"];
};

export type IDeviceDefinition = INode &
	IHasImageResource &
	IHasMetadata & {
		__typename?: "DeviceDefinition";
		id: Scalars["ID"];
		name: Scalars["String"];
		imageResource: Array<IResourceImage>;
		propertyDefinitions: Array<IPropertyDefinition>;
		specifications: Array<ISpecification>;
		acceptsUnit: Array<Scalars["String"]>;
		definitions: Array<IDeviceDefinitionGraphElement>;
		/** Returns a flat list of devices which are derived from this DeviceDefinition or it's children */
		derivedDefinitionsFlat: Array<IDeviceDefinition>;
		usages: Array<IDeviceOrDefinition>;
		metadata: IMetadata;
	};

export type IHasImageResource = {
	id: Scalars["ID"];
	name: Scalars["String"];
	imageResource: Array<IResourceImage>;
};

export type IResourceImage = INode &
	IResource &
	IHasProjects &
	IHasMetadata & {
		__typename?: "ResourceImage";
		id: Scalars["ID"];
		name: Scalars["String"];
		subName?: Maybe<Scalars["String"]>;
		projects: IProjectConnection;
		metadata: IMetadata;
		parent?: Maybe<IResource>;
		children: IResourceConnection;
		devices: Array<IDevice>;
		/** @deprecated Use the imageURI field instead */
		type?: Maybe<Scalars["ResourceType"]>;
		dataURI: Scalars["String"];
		imageURI: Scalars["String"];
		height: Scalars["Float"];
		width: Scalars["Float"];
	};

export type IResourceImageProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
};

export type IResourceImageImageUriArgs = {
	preset: IImagePreset;
};

export enum IImagePreset {
	Icon = "ICON",
	Thumbnail = "THUMBNAIL",
	Regular = "REGULAR",
}

export type IPropertyDefinition = {
	__typename?: "PropertyDefinition";
	name: Scalars["String"];
	type: IPropertyType;
};

export enum IPropertyType {
	Device = "Device",
	Sample = "Sample",
}

export type ISpecification = {
	__typename?: "Specification";
	name: Scalars["String"];
	value: Scalars["String"];
};

export type IDeviceDefinitionGraphElement = {
	__typename?: "DeviceDefinitionGraphElement";
	level: Scalars["Int"];
	definition: IDeviceDefinition;
};

export type IDeviceOrDefinition = IDevice | IDeviceDefinition;

export type IImportPreset = INode &
	IHasMetadata & {
		__typename?: "ImportPreset";
		id: Scalars["ID"];
		metadata: IMetadata;
		devices: Array<IDevice>;
		displayName?: Maybe<Scalars["String"]>;
		presetJSON: Scalars["String"];
		columns: Array<Scalars["String"]>;
	};

export type IIBaseNote = {
	caption: Scalars["String"];
	text: Scalars["String"];
	begin?: Maybe<Scalars["DateTime"]>;
	end?: Maybe<Scalars["DateTime"]>;
	metadata: IMetadata;
};

/** Base implementation for Note (but without ID) and the type used for old revisions */
export type IBaseNote = IIBaseNote &
	IHasMetadata & {
		__typename?: "BaseNote";
		caption: Scalars["String"];
		text: Scalars["String"];
		begin?: Maybe<Scalars["DateTime"]>;
		end?: Maybe<Scalars["DateTime"]>;
		metadata: IMetadata;
	};

export type INote = INode &
	IIBaseNote &
	IHasMetadata & {
		__typename?: "Note";
		id: Scalars["ID"];
		caption: Scalars["String"];
		text: Scalars["String"];
		begin?: Maybe<Scalars["DateTime"]>;
		end?: Maybe<Scalars["DateTime"]>;
		revisions: Array<IBaseNote>;
		metadata: IMetadata;
	};

export type IColumnDescription = {
	__typename?: "ColumnDescription";
	label: Scalars["String"];
	type: Scalars["ColumnType"];
};

export type IRowConnection = IConnection & {
	__typename?: "RowConnection";
	edges: Array<IRowEdge>;
	pageInfo: IPageInfo;
	count: Scalars["Int"];
};

export type IData = {
	__typename?: "Data";
	x: IDataSeries;
	y: Array<IDataSeries>;
};

export type IDataSeries = {
	__typename?: "DataSeries";
	label: Scalars["String"];
	unit: Scalars["String"];
	values: Array<Maybe<Scalars["Float"]>>;
	device?: Maybe<IDevice>;
	resourceId?: Maybe<Scalars["ID"]>;
};

export type IUserEdge = IEdge & {
	__typename?: "UserEdge";
	node: IUser;
	cursor: Scalars["String"];
};

export type INoteEdge = IEdge & {
	__typename?: "NoteEdge";
	cursor: Scalars["String"];
	node: INote;
};

export type IHierarchicalDeviceListConnection = IConnection & {
	__typename?: "HierarchicalDeviceListConnection";
	edges: Array<IHierarchicalDeviceListEdge>;
	pageInfo: IPageInfo;
};

export type IUserConnection = IConnection & {
	__typename?: "UserConnection";
	edges: Array<IUserEdge>;
	pageInfo: IPageInfo;
};

export type ITimeFrameInput = {
	begin?: InputMaybe<Scalars["DateTime"]>;
	end?: InputMaybe<Scalars["DateTime"]>;
};

export type IProperty = INode & {
	__typename?: "Property";
	id: Scalars["ID"];
	timestamp: Scalars["DateTime"];
	timestampEnd?: Maybe<Scalars["DateTime"]>;
	name: Scalars["String"];
	/** The device that this property belongs to */
	device: IDevice;
	value: IPropertyValue;
};

export type ISampleRelation = INode & {
	__typename?: "SampleRelation";
	id: Scalars["ID"];
	type: Scalars["String"];
	sample: ISample;
};

export type ITopLevelDevice = {
	__typename?: "TopLevelDevice";
	device: IDevice;
	path: Array<Scalars["String"]>;
};

export type ISpecificationsGraphElement = {
	__typename?: "SpecificationsGraphElement";
	level: Scalars["Int"];
	sample: ISample;
};

export type ISetupDescription = {
	__typename?: "SetupDescription";
	id: Scalars["ID"];
	imageResource: IResourceImage;
	begin: Scalars["DateTime"];
	end?: Maybe<Scalars["DateTime"]>;
	setupLabels: Array<ISetupLabel>;
};

export type ISetupLabel = {
	__typename?: "SetupLabel";
	propertyPath: Array<Scalars["String"]>;
	xPos: Scalars["Float"];
	yPos: Scalars["Float"];
};

export type ISampleUsage = {
	__typename?: "SampleUsage";
	sample: ISample;
	timeframes: Array<ITimeFrame>;
};

export type ITimeFrame = {
	__typename?: "TimeFrame";
	begin: Scalars["DateTime"];
	end?: Maybe<Scalars["DateTime"]>;
	pathFromTopLevelDevice: Array<Scalars["String"]>;
};

/**
 * When relay receives a mutation response, any objects in the mutation response with `id` fields that
 * match records in the local store will automatically be updated with the new field values from the
 * response. Furthermore any local data updates caused by the mutation will automatically cause
 * components subscribed to the data to be notified of the change and re-render.
 * Sometimes no id exists initially to subscribe to (e.g. user that is not yet logged in).
 * This wrapper is therefore essential to allow UI updates as it provides an `id` that is known
 * regardless of whether an actual id is known at the time. (e.g. it provides an id regardless of
 * whether a user is logged in or no.)
 *
 * Needs to implement `Node` for types in `CONSTANT_NODE_IDS` to work.
 */
export type IIdentifiedPayload = {
	id: Scalars["ID"];
};

/**
 * "Notification"s describe messages that the server (i.e. worker/graphql) want's to present to the
 * user over the UI as a toast. Since the UI itself can also create toasts the store of the currently
 * active toasts is on the UI/Renderer side of the code. Therefore we only need to subscribe to a
 * single `LatestNotification`. Once a new notification is available the Renderer is notified via the
 * subscription and stores it in its own store (just as if another part of the renderer would have
 * created a new toast). Automatic timeouts of toasts is therefore all handled by the renderer.
 * See the comment for `IdentifiedPayload` to understand why `LatestNotification` needs an `id`.
 */
export type ILatestNotification = IIdentifiedPayload &
	INode & {
		__typename?: "LatestNotification";
		id: Scalars["ID"];
		payload?: Maybe<ILatestNotificationPayload>;
	};

export type ILatestNotificationPayload = INode & {
	__typename?: "LatestNotificationPayload";
	id: Scalars["ID"];
	notification: INotification;
};

export type INotification = {
	__typename?: "Notification";
	title: Scalars["String"];
	text?: Maybe<Scalars["String"]>;
	severity?: Maybe<INotificationSeverity>;
};

export enum INotificationSeverity {
	Primary = "primary",
	Success = "success",
	Warning = "warning",
	Danger = "danger",
}

/**
 * Represents the current user that is actively using the app. There is only a single `CurrentUser`
 * (which exists even if no user is logged in), so the `id` field has a single known value. This known
 * `id` value is essential for updating the UI. The actual information about the logged in user
 * (if applicable) is embedded in the `payload` field. Wrapping the `User` in this way allows relay to
 * keep track of the login state.
 */
export type ICurrentUser = IIdentifiedPayload &
	INode & {
		__typename?: "CurrentUser";
		id: Scalars["ID"];
		payload: ICurrentUserCore;
	};

export type ICurrentUserCore = {
	__typename?: "CurrentUserCore";
	user: IUser;
	timeSetting?: Maybe<IDateOptions>;
	dataverses: IConnection_UserDataverseConnection;
};

export type IDateOptions = {
	__typename?: "DateOptions";
	locale: Scalars["String"];
	dateStyle: Scalars["String"];
	timeStyle: Scalars["String"];
};

export type IConnection_UserDataverseConnection = {
	__typename?: "Connection_UserDataverseConnection";
	edges: Array<IEdge_UserDataverseConnection>;
	pageInfo: IPageInfo;
};

export type IEdge_UserDataverseConnection = {
	__typename?: "Edge_UserDataverseConnection";
	cursor: Scalars["String"];
	node: IUserDataverseConnection;
};

export type IUserDataverseConnection = INode & {
	__typename?: "UserDataverseConnection";
	id: Scalars["ID"];
	name: Scalars["String"];
	url: Scalars["String"];
	tokenPreview: Scalars["String"];
};

export type INameComposition = INode & {
	__typename?: "NameComposition";
	id: Scalars["ID"];
	name: Scalars["String"];
	variables: IConnection_NameCompositionVariable;
	legacyNameIndex?: Maybe<Scalars["Int"]>;
	shortIdIndex?: Maybe<Scalars["Int"]>;
	/**
	 * Indicates how this composition is used.
	 * Whether this composition is the default composition for devices/samples
	 */
	usageType?: Maybe<INameCompositionType>;
};

export type IConnection_NameCompositionVariable = {
	__typename?: "Connection_NameCompositionVariable";
	edges: Array<IEdge_NameCompositionVariable>;
	pageInfo: IPageInfo;
};

export type IEdge_NameCompositionVariable = {
	__typename?: "Edge_NameCompositionVariable";
	cursor: Scalars["String"];
	node: INameCompositionVariable;
};

export type INameCompositionVariable = {
	id: Scalars["ID"];
	name: Scalars["String"];
	deletable: Scalars["Boolean"];
};

export type INameCompositionVariableConstant = INode &
	INameCompositionVariable & {
		__typename?: "NameCompositionVariableConstant";
		id: Scalars["ID"];
		name: Scalars["String"];
		deletable: Scalars["Boolean"];
		value: Scalars["String"];
	};

export type INameCompositionVariableVariable = INode &
	INameCompositionVariable & {
		__typename?: "NameCompositionVariableVariable";
		id: Scalars["ID"];
		name: Scalars["String"];
		deletable: Scalars["Boolean"];
		alias: Array<Scalars["String"]>;
		prefix?: Maybe<Scalars["String"]>;
		suffix?: Maybe<Scalars["String"]>;
	};

export enum INameCompositionType {
	DefaultDevices = "DEFAULT_DEVICES",
	DefaultSamples = "DEFAULT_SAMPLES",
	DefaultDevicesAndSamples = "DEFAULT_DEVICES_AND_SAMPLES",
}

export type IMonitoredJobsStatus = INode & {
	__typename?: "MonitoredJobsStatus";
	id: Scalars["ID"];
	statuses: Array<Scalars["String"]>;
};

export type ITransformation = INode & {
	__typename?: "Transformation";
	id: Scalars["ID"];
};

export type ISearchResults = INode & {
	__typename?: "SearchResults";
	id: Scalars["ID"];
	search: Array<ISearchResult>;
	devices?: Maybe<IDeviceConnection>;
	resources?: Maybe<IResourceConnection>;
	samples?: Maybe<ISampleConnection>;
	projects?: Maybe<IProjectConnection>;
	users?: Maybe<IUserConnection>;
};

export type ISearchResultsSearchArgs = {
	query: Scalars["String"];
	queryTime: Scalars["DateTime"];
	first: Scalars["Int"];
};

export type ISearchResultsDevicesArgs = {
	query: Scalars["String"];
	queryTime: Scalars["DateTime"];
	first: Scalars["Int"];
	after?: InputMaybe<Scalars["String"]>;
};

export type ISearchResultsResourcesArgs = {
	query: Scalars["String"];
	queryTime: Scalars["DateTime"];
	first: Scalars["Int"];
	after?: InputMaybe<Scalars["String"]>;
};

export type ISearchResultsSamplesArgs = {
	query: Scalars["String"];
	queryTime: Scalars["DateTime"];
	first: Scalars["Int"];
	after?: InputMaybe<Scalars["String"]>;
};

export type ISearchResultsProjectsArgs = {
	query: Scalars["String"];
	queryTime: Scalars["DateTime"];
	first: Scalars["Int"];
	after?: InputMaybe<Scalars["String"]>;
};

export type ISearchResultsUsersArgs = {
	query: Scalars["String"];
	first: Scalars["Int"];
	after?: InputMaybe<Scalars["String"]>;
};

export type ISearchResult = {
	__typename?: "SearchResult";
	node: INode;
	score: Scalars["Float"];
	repositoryId?: Maybe<Scalars["ID"]>;
};

export enum IDeviceOrder {
	Name = "NAME",
	NameDesc = "NAME_DESC",
}

export enum IDevicesUsage {
	/**
	 * rootsOnly will only show devices which have properties and were never used as a device.
	 * The idea behind this flag is that it tries to display only setups/reactors.
	 */
	RootsOnly = "ROOTS_ONLY",
	/** Only shows Devices that are not used as components of a different setup (right now) */
	UnusedOnly = "UNUSED_ONLY",
}

export type IDevicesFilterInput = {
	searchValue?: InputMaybe<Scalars["String"]>;
	userIds?: InputMaybe<Array<Scalars["ID"]>>;
	projectIds?: InputMaybe<Array<Scalars["ID"]>>;
};

export enum IResourceOrder {
	Name = "NAME",
	NameDesc = "NAME_DESC",
	CreationDate = "CREATION_DATE",
	CreationDateDesc = "CREATION_DATE_DESC",
}

export type IResourcesFilterInput = {
	searchValue?: InputMaybe<Scalars["String"]>;
	projectIds?: InputMaybe<Array<Scalars["ID"]>>;
	userIds?: InputMaybe<Array<Scalars["ID"]>>;
};

export type ISamplesFilterInput = {
	searchValue?: InputMaybe<Scalars["String"]>;
	projectIds?: InputMaybe<Array<Scalars["ID"]>>;
	userIds?: InputMaybe<Array<Scalars["ID"]>>;
};

export type IConnection_DeviceDefinition = {
	__typename?: "Connection_DeviceDefinition";
	edges: Array<IEdge_DeviceDefinition>;
	pageInfo: IPageInfo;
};

export type IEdge_DeviceDefinition = {
	__typename?: "Edge_DeviceDefinition";
	cursor: Scalars["String"];
	node: IDeviceDefinition;
};

export type IConnection_ImportPreset = {
	__typename?: "Connection_ImportPreset";
	edges: Array<IEdge_ImportPreset>;
	pageInfo: IPageInfo;
};

export type IEdge_ImportPreset = {
	__typename?: "Edge_ImportPreset";
	cursor: Scalars["String"];
	node: IImportPreset;
};

/**
 * Group NameComposition related fields on RepositoryQuery
 *
 * NOTE: This is not a "real" type or entity
 */
export type INameCompositionQuery = {
	__typename?: "NameCompositionQuery";
	/** List of available variables (for this repository) */
	variables: IConnection_NameCompositionVariable;
	/** Custom name composition */
	composition: IConnection_NameComposition;
};

export type IConnection_NameComposition = {
	__typename?: "Connection_NameComposition";
	edges: Array<IEdge_NameComposition>;
	pageInfo: IPageInfo;
};

export type IEdge_NameComposition = {
	__typename?: "Edge_NameComposition";
	cursor: Scalars["String"];
	node: INameComposition;
};

export enum INameAvailabilityCheckTarget {
	Device = "DEVICE",
	DeviceDefinition = "DEVICE_DEFINITION",
	Sample = "SAMPLE",
	Project = "PROJECT",
}

export type ICheckNameAvailability = {
	__typename?: "CheckNameAvailability";
	conflictResolution: IConflictResolution;
	isAvailable: Scalars["Boolean"];
};

export enum IConflictResolution {
	Ignore = "IGNORE",
	Warn = "WARN",
	Deny = "DENY",
}

export type IDataverse = {
	__typename?: "Dataverse";
	id: Scalars["ID"];
	title: Scalars["String"];
};

export type IRepositoryMutation = {
	__typename?: "RepositoryMutation";
	repository: IRepositoryMutation;
	/** Authentication */
	updateTimeSettings: ICurrentUser;
	toCellArray: Scalars["JSONString"];
	toGenericTable: Scalars["JSONString"];
	toTabularDataArrayBuffer: IImportWizardStep3Payload;
	/** Import */
	importRawResourceRequest: IImportRawResourceRequestResponse;
	importRawResource: Scalars["ID"];
	importImageResource: IErrorMessageOr_ResourceImage;
	createAndRunImportTransformation: ICreateAndRunImportTransformationResponse;
	deleteImportPreset: IDeletedNode;
	deleteResource: IDeletedNode;
	addSample: IAddSamplePayload;
	/** Add a relation between two samples */
	addSampleRelation: IAddSampleRelationPayload;
	/** Create a new sample and a relationship between an existing sample and the newly created sample */
	addSampleAndSampleRelation: ISample;
	deleteDevice: IDeletedNode;
	upsertDevice?: Maybe<IUpsertMutationPayloadDevice>;
	requestShortId: IDeviceOrSampleOrError;
	addDeviceDefinition: IDeviceDefinition;
	editDeviceDefinition: IEditDeviceDefinitionResult;
	deleteDeviceDefinition: IDeleteDeviceDefinitionResult;
	/** Setup Description */
	deleteSetupDescription: IDevice;
	linkImageWithSetupDescription: IDevice;
	updateSetupDescriptionTime: IDevice;
	addSetupLabel: IDevice;
	deleteSetupLabel: IDevice;
	makePrimaryDeviceImage: IHasImageResource;
	addDeviceImage: IHasImageResource;
	deleteDeviceImage: IHasImageResource;
	removeComponent: IDevice;
	addComponent: IDevice;
	editComponent: IDevice;
	swapComponent: IDevice;
	linkToProject: ILinkToProjectPayload;
	removeFromProject: IRemoveFromProjectPayload;
	addProject: IAddProjectPayload;
	deleteProject: IDeletedNode;
	addManualTransformation: IAddManualTransformationPayload;
	addEditNote?: Maybe<INote>;
	deleteNote: IDeletedNode;
	upsertImportPreset?: Maybe<IUpsertMutationPayload_ImportPreset>;
	upsertNameCompositionVariableVariable?: Maybe<IUpsertMutationPayload_NameCompositionVariableVariable>;
	upsertNameCompositionVariableConstant?: Maybe<IUpsertMutationPayload_NameCompositionVariableConstant>;
	deleteNameCompositionVariable: IDeletedNode;
	upsertNameComposition?: Maybe<IUpsertMutationPayload_NameCompositionPayload>;
	deleteNameComposition: IDeletedNode;
	upsertSample?: Maybe<IUpsertMutationPayload_Sample>;
	repoConfigSetDefaultDeviceNamingStrategy: Array<INameComposition>;
	repoConfigSetDefaultSampleNamingStrategy: Array<INameComposition>;
	publishToDataverse?: Maybe<Scalars["String"]>;
	searchDataverse: Array<IDataverse>;
	upsertUserDataverseConnection?: Maybe<IUpsertMutationPayload_UserDataverseConnection>;
	deleteUserDataverseConnection: IDeletedNode;
};

export type IRepositoryMutationRepositoryArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationUpdateTimeSettingsArgs = {
	input: IUpdateTimeSettingsInput;
};

export type IRepositoryMutationToCellArrayArgs = {
	resourceId: Scalars["ID"];
	options?: InputMaybe<Scalars["JSONString"]>;
};

export type IRepositoryMutationToGenericTableArgs = {
	resourceId: Scalars["ID"];
	options?: InputMaybe<Scalars["JSONString"]>;
};

export type IRepositoryMutationToTabularDataArrayBufferArgs = {
	resourceId: Scalars["ID"];
	deviceId: Scalars["ID"];
	options?: InputMaybe<Scalars["JSONString"]>;
};

export type IRepositoryMutationImportRawResourceArgs = {
	input: IImportRawResourceInput;
};

export type IRepositoryMutationImportImageResourceArgs = {
	input: IImportImageResourceInput;
};

export type IRepositoryMutationCreateAndRunImportTransformationArgs = {
	input: ICreateAndRunImportTransformationInput;
};

export type IRepositoryMutationDeleteImportPresetArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationDeleteResourceArgs = {
	input: IDeleteResourceInput;
};

export type IRepositoryMutationAddSampleArgs = {
	input: IAddSampleInput;
};

export type IRepositoryMutationAddSampleRelationArgs = {
	input: IAddSampleRelationInput;
};

export type IRepositoryMutationAddSampleAndSampleRelationArgs = {
	input: IAddSampleAndSampleRelationInput;
};

export type IRepositoryMutationDeleteDeviceArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationUpsertDeviceArgs = {
	insert?: InputMaybe<IInsert_DeviceInput>;
	update?: InputMaybe<IUpdate_DeviceInput>;
};

export type IRepositoryMutationRequestShortIdArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationAddDeviceDefinitionArgs = {
	input: IAddDeviceDefinitionInput;
};

export type IRepositoryMutationEditDeviceDefinitionArgs = {
	input: IEditDeviceDefinitionInput;
};

export type IRepositoryMutationDeleteDeviceDefinitionArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationDeleteSetupDescriptionArgs = {
	input: IDeleteSetupDescriptionInput;
};

export type IRepositoryMutationLinkImageWithSetupDescriptionArgs = {
	input: ILinkImageWithSetupDescriptionInput;
};

export type IRepositoryMutationUpdateSetupDescriptionTimeArgs = {
	input: IUpdateSetupDescriptionTimeInput;
};

export type IRepositoryMutationAddSetupLabelArgs = {
	input: IAddSetupLabelInput;
};

export type IRepositoryMutationDeleteSetupLabelArgs = {
	input: IDeleteSetupLabelInput;
};

export type IRepositoryMutationMakePrimaryDeviceImageArgs = {
	input: IMakePrimaryDeviceImageInput;
};

export type IRepositoryMutationAddDeviceImageArgs = {
	input: IAddDeviceImageInput;
};

export type IRepositoryMutationDeleteDeviceImageArgs = {
	input: IDeleteDeviceImageInput;
};

export type IRepositoryMutationRemoveComponentArgs = {
	input: IRemoveComponentInput;
};

export type IRepositoryMutationAddComponentArgs = {
	input: IAddComponentInput;
};

export type IRepositoryMutationEditComponentArgs = {
	input: IEditComponentInput;
};

export type IRepositoryMutationSwapComponentArgs = {
	input: ISwapComponentInput;
};

export type IRepositoryMutationLinkToProjectArgs = {
	input: ILinkToProjectInput;
};

export type IRepositoryMutationRemoveFromProjectArgs = {
	input: IRemoveFromProjectInput;
};

export type IRepositoryMutationAddProjectArgs = {
	input: IAddProjectInput;
};

export type IRepositoryMutationDeleteProjectArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationAddManualTransformationArgs = {
	input: IAddManualTransformationInput;
};

export type IRepositoryMutationAddEditNoteArgs = {
	input: IAddEditNoteInput;
};

export type IRepositoryMutationDeleteNoteArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationUpsertImportPresetArgs = {
	insert?: InputMaybe<IInsert_ImportPresetInput>;
	update?: InputMaybe<IUpdate_ImportPresetInput>;
};

export type IRepositoryMutationUpsertNameCompositionVariableVariableArgs = {
	insert?: InputMaybe<IInsert_NameCompositionVariableVariableInput>;
	update?: InputMaybe<IUpdate_NameCompositionVariableVariableInput>;
};

export type IRepositoryMutationUpsertNameCompositionVariableConstantArgs = {
	insert?: InputMaybe<IInsert_NameCompositionVariableConstantInput>;
	update?: InputMaybe<IUpdate_NameCompositionVariableConstantInput>;
};

export type IRepositoryMutationDeleteNameCompositionVariableArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationUpsertNameCompositionArgs = {
	insert?: InputMaybe<IInsert_NameCompositionInput>;
	update?: InputMaybe<IUpdate_NameCompositionInput>;
};

export type IRepositoryMutationDeleteNameCompositionArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationUpsertSampleArgs = {
	insert?: InputMaybe<IInsert_SampleInput>;
	update?: InputMaybe<IUpdate_SampleInput>;
};

export type IRepositoryMutationRepoConfigSetDefaultDeviceNamingStrategyArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationRepoConfigSetDefaultSampleNamingStrategyArgs = {
	id: Scalars["ID"];
};

export type IRepositoryMutationPublishToDataverseArgs = {
	input: IPublishToDataverseInput;
};

export type IRepositoryMutationSearchDataverseArgs = {
	input: ISearchDataverseInput;
};

export type IRepositoryMutationUpsertUserDataverseConnectionArgs = {
	insert?: InputMaybe<IInsert_UserDataverseConnectionInput>;
	update?: InputMaybe<IUpdate_UserDataverseConnectionInput>;
};

export type IRepositoryMutationDeleteUserDataverseConnectionArgs = {
	id: Scalars["ID"];
};

export type IUpdateTimeSettingsInput = {
	locale: Scalars["String"];
	dateStyle: Scalars["String"];
	timeStyle: Scalars["String"];
};

export type IImportWizardStep3Payload = IImportWizardStep3PayloadSuccess | IImportWizardError;

export type IImportWizardStep3PayloadSuccess = {
	__typename?: "ImportWizardStep3PayloadSuccess";
	data: IImportWizardStep3PayloadData;
	warnings?: Maybe<Array<Scalars["String"]>>;
};

export type IImportWizardStep3PayloadData = {
	__typename?: "ImportWizardStep3PayloadData";
	metadata: Scalars["JSONString"];
	end: Scalars["DateTime"];
	begin: Scalars["DateTime"];
	tabularData: Array<Array<Scalars["String"]>>;
};

export type IImportWizardError = {
	__typename?: "ImportWizardError";
	errors: Array<Scalars["String"]>;
};

export type IImportRawResourceRequestResponse = {
	__typename?: "ImportRawResourceRequestResponse";
	id: Scalars["ID"];
	url: Scalars["String"];
};

export type IImportRawResourceInput = {
	name: Scalars["String"];
	uploadId: Scalars["ID"];
	uploadDevice: Scalars["ID"];
	projects?: InputMaybe<Array<Scalars["ID"]>>;
};

export type IImportImageResourceInput = {
	uploadId: Scalars["ID"];
};

export type IErrorMessageOr_ResourceImage = {
	__typename?: "ErrorMessageOr_ResourceImage";
	data?: Maybe<IResourceImage>;
	error?: Maybe<IErrorMessage>;
};

export type IErrorMessage = {
	__typename?: "ErrorMessage";
	message: Scalars["String"];
};

export type ICreateAndRunImportTransformationInput = {
	rawResourceId: Scalars["ID"];
	presetJson: Scalars["String"];
	/**
	 * If the number of problems does not exceed a certain number, the user should have the possibility
	 * to accept these problems.
	 * A possible case here is that individual lines cannot be processed because they are for example
	 * a footer.
	 *
	 * importWithWarnings should be set to True if the user agrees in the UI to accept the reported problems
	 */
	importWithWarnings?: InputMaybe<Scalars["Boolean"]>;
};

export type ICreateAndRunImportTransformationResponse = {
	__typename?: "CreateAndRunImportTransformationResponse";
	importTaskId: Scalars["ID"];
};

export type IDeleteResourceInput = {
	resourceId: Scalars["ID"];
};

export type IAddSampleInput = {
	name: Scalars["String"];
};

export type IAddSamplePayload = {
	__typename?: "AddSamplePayload";
	appendedEdge: ISampleEdge;
};

export type IAddSampleRelationInput = {
	sample1: Scalars["ID"];
	sample2: Scalars["ID"];
};

export type IAddSampleRelationPayload = {
	__typename?: "AddSampleRelationPayload";
	sample1?: Maybe<ISample>;
	sample2?: Maybe<ISample>;
};

export type IAddSampleAndSampleRelationInput = {
	name: Scalars["String"];
	sample1: Scalars["ID"];
};

export type IInsert_DeviceInput = {
	input: IDeviceInput;
};

export type IDeviceInput = {
	name: Scalars["String"];
	deviceDefinition: Scalars["ID"];
	specifications: Array<ISpecificationInput>;
	/**
	 * Whether a new short ID should be generated and assigned to the device.
	 *
	 * Defaults to false for backwards compatibility.
	 */
	assignShortId?: InputMaybe<Scalars["Boolean"]>;
};

export type ISpecificationInput = {
	name: Scalars["String"];
	value: Scalars["String"];
};

export type IUpdate_DeviceInput = {
	id: Scalars["ID"];
	input: IPartial_DeviceInput;
};

export type IPartial_DeviceInput = {
	name?: InputMaybe<Scalars["String"]>;
	deviceDefinition?: InputMaybe<Scalars["ID"]>;
	specifications?: InputMaybe<Array<ISpecificationInput>>;
	/**
	 * Whether a new short ID should be generated and assigned to the device.
	 *
	 * Defaults to false for backwards compatibility.
	 */
	assignShortId?: InputMaybe<Scalars["Boolean"]>;
};

export type IUpsertMutationPayloadDevice = {
	__typename?: "UpsertMutationPayloadDevice";
	edit?: Maybe<IDevice>;
	add?: Maybe<IAddDevicePayload>;
};

export type IAddDevicePayload = {
	__typename?: "AddDevicePayload";
	appendedEdge: IDeviceEdge;
	appendedEdgeHierarchical: IHierarchicalDeviceListEdge;
};

export type IDeviceOrSampleOrError = IDevice | ISample | IError;

export type IError = {
	__typename?: "Error";
	message: Scalars["String"];
};

export type IAddDeviceDefinitionInput = {
	parentDeviceDefinition?: InputMaybe<Scalars["ID"]>;
	name: Scalars["String"];
	specifications: Array<ISpecificationInput>;
	acceptedUnits: Array<Scalars["String"]>;
};

export type IEditDeviceDefinitionInput = {
	id: Scalars["ID"];
	parentDeviceDefinition?: InputMaybe<Scalars["ID"]>;
	name: Scalars["String"];
	specifications: Array<ISpecificationInput>;
	acceptedUnits: Array<Scalars["String"]>;
};

export type IEditDeviceDefinitionResult = IDeviceDefinition | IError;

export type IDeleteDeviceDefinitionResult = IDeletedNode | IError;

export type IDeleteSetupDescriptionInput = {
	deviceId: Scalars["ID"];
	imageId: Scalars["ID"];
};

export type ILinkImageWithSetupDescriptionInput = {
	deviceId: Scalars["ID"];
	resourceId: Scalars["ID"];
	begin: Scalars["DateTime"];
	end?: InputMaybe<Scalars["DateTime"]>;
};

export type IUpdateSetupDescriptionTimeInput = {
	deviceId: Scalars["ID"];
	resourceId: Scalars["ID"];
	begin: Scalars["DateTime"];
	end?: InputMaybe<Scalars["DateTime"]>;
};

export type IAddSetupLabelInput = {
	deviceId: Scalars["ID"];
	imageId: Scalars["ID"];
	xPos: Scalars["Float"];
	yPos: Scalars["Float"];
	propertyPath: Array<Scalars["String"]>;
};

export type IDeleteSetupLabelInput = {
	deviceId: Scalars["ID"];
	imageId: Scalars["ID"];
	xPos: Scalars["Float"];
	yPos: Scalars["Float"];
};

export type IMakePrimaryDeviceImageInput = {
	imageOwnerId: Scalars["ID"];
	imageId: Scalars["ID"];
};

export type IAddDeviceImageInput = {
	imageOwnerId: Scalars["ID"];
	imageId: Scalars["ID"];
};

export type IDeleteDeviceImageInput = {
	imageOwnerId: Scalars["ID"];
	imageId: Scalars["ID"];
};

export type IRemoveComponentInput = {
	/**
	 * This ID should be the ID of the device that is currently displayed.
	 * The ID is only used to control which updated device is returned after the mutation is executed
	 * to ensure that the UI for that device updates.
	 * Not necessarily the parent device, as adding children of children is also allowed.
	 */
	returnedDeviceId: Scalars["ID"];
	componentId: Scalars["ID"];
	begin: Scalars["DateTime"];
	end?: InputMaybe<Scalars["DateTime"]>;
};

export type IAddComponentInput = {
	/**
	 * This ID should be the ID of the device that is currently displayed.
	 * The ID is only used to control which updated device is returned after the mutation is executed
	 * to ensure that the UI for that device updates.
	 * Not necessarily the parent device, as adding children of children is also allowed.
	 */
	returnedDeviceId: Scalars["ID"];
	parentDeviceId: Scalars["ID"];
	/** ID of the added device/sample */
	componentId: Scalars["ID"];
	name: Scalars["String"];
	begin: Scalars["DateTime"];
	end?: InputMaybe<Scalars["DateTime"]>;
};

export type IEditComponentInput = {
	/**
	 * "This ID should be the ID of the device that is currently displayed.
	 * The ID is only used to control which updated device is returned after the mutation is executed
	 * to ensure that the UI for that device updates.
	 * Not necessarily the parent device, as editing children of children is also allowed.
	 */
	returnedDeviceId: Scalars["ID"];
	propertyId: Scalars["ID"];
	componentId: Scalars["ID"];
	name: Scalars["String"];
	begin: Scalars["DateTime"];
	end?: InputMaybe<Scalars["DateTime"]>;
};

export type ISwapComponentInput = {
	returnedDeviceId: Scalars["ID"];
	propertyId: Scalars["ID"];
	/** Time of the swap (end of old property, begin of new propertxy) */
	swapTime: Scalars["DateTime"];
	/** Time when the component which is swapped in gets removed */
	newPropertyEndTime?: InputMaybe<Scalars["DateTime"]>;
	/** Property value after the swap */
	componentId: Scalars["ID"];
};

export type ILinkToProjectInput = {
	id: Scalars["ID"];
	projectId: Scalars["ID"];
};

export type ILinkToProjectPayload = {
	__typename?: "LinkToProjectPayload";
	node: IProject;
};

export type IRemoveFromProjectInput = {
	id: Scalars["ID"];
	projectId: Scalars["ID"];
};

export type IRemoveFromProjectPayload = {
	__typename?: "RemoveFromProjectPayload";
	deletedProjectId: Scalars["ID"];
};

export type IAddProjectInput = {
	id: Scalars["ID"];
	name: Scalars["String"];
};

export type IAddProjectPayload = {
	__typename?: "AddProjectPayload";
	node: IProject;
};

export type IAddManualTransformationInput = {
	source: Scalars["ID"];
	target: Scalars["ID"];
};

export type IAddManualTransformationPayload = {
	__typename?: "AddManualTransformationPayload";
	source: IResource;
	target: IResourceGeneric;
	addEditNote?: Maybe<INote>;
	deleteNote: IDeletedNode;
};

export type IAddManualTransformationPayloadAddEditNoteArgs = {
	input: IAddEditNoteInput;
};

export type IAddManualTransformationPayloadDeleteNoteArgs = {
	id: Scalars["ID"];
};

export type IAddEditNoteInput = {
	id?: InputMaybe<Scalars["ID"]>;
	thingId: Scalars["ID"];
	caption: Scalars["String"];
	text: Scalars["String"];
	begin?: InputMaybe<Scalars["DateTime"]>;
	end?: InputMaybe<Scalars["DateTime"]>;
};

export type IInsert_ImportPresetInput = {
	input: IImportPresetInput;
};

export type IImportPresetInput = {
	deviceId: Array<Scalars["ID"]>;
	name: Scalars["String"];
	presetJson: Scalars["String"];
};

export type IUpdate_ImportPresetInput = {
	id: Scalars["ID"];
	input: IPartial_ImportPresetInput;
};

export type IPartial_ImportPresetInput = {
	deviceId?: InputMaybe<Array<Scalars["ID"]>>;
	name?: InputMaybe<Scalars["String"]>;
	presetJson?: InputMaybe<Scalars["String"]>;
};

export type IUpsertMutationPayload_ImportPreset = {
	__typename?: "UpsertMutationPayload_ImportPreset";
	node: IImportPreset;
};

export type IInsert_NameCompositionVariableVariableInput = {
	input: INameCompositionVariableVariableInput;
};

export type INameCompositionVariableVariableInput = {
	name: Scalars["String"];
	alias: Array<Scalars["String"]>;
	prefix?: InputMaybe<Scalars["String"]>;
	suffix?: InputMaybe<Scalars["String"]>;
};

export type IUpdate_NameCompositionVariableVariableInput = {
	id: Scalars["ID"];
	input: IPartial_NameCompositionVariableVariableInput;
};

export type IPartial_NameCompositionVariableVariableInput = {
	name?: InputMaybe<Scalars["String"]>;
	alias?: InputMaybe<Array<Scalars["String"]>>;
	prefix?: InputMaybe<Scalars["String"]>;
	suffix?: InputMaybe<Scalars["String"]>;
};

export type IUpsertMutationPayload_NameCompositionVariableVariable = {
	__typename?: "UpsertMutationPayload_NameCompositionVariableVariable";
	node: INameCompositionVariableVariable;
};

export type IInsert_NameCompositionVariableConstantInput = {
	input: INameCompositionVariableConstantInput;
};

export type INameCompositionVariableConstantInput = {
	name: Scalars["String"];
	value: Scalars["String"];
};

export type IUpdate_NameCompositionVariableConstantInput = {
	id: Scalars["ID"];
	input: IPartial_NameCompositionVariableConstantInput;
};

export type IPartial_NameCompositionVariableConstantInput = {
	name?: InputMaybe<Scalars["String"]>;
	value?: InputMaybe<Scalars["String"]>;
};

export type IUpsertMutationPayload_NameCompositionVariableConstant = {
	__typename?: "UpsertMutationPayload_NameCompositionVariableConstant";
	node: INameCompositionVariableConstant;
};

export type IInsert_NameCompositionInput = {
	input: INameCompositionInput;
};

export type INameCompositionInput = {
	name: Scalars["String"];
	variables: Array<Scalars["ID"]>;
	legacyNameIndex?: InputMaybe<Scalars["Int"]>;
	shortIdIndex?: InputMaybe<Scalars["Int"]>;
};

export type IUpdate_NameCompositionInput = {
	id: Scalars["ID"];
	input: IPartial_NameCompositionInput;
};

export type IPartial_NameCompositionInput = {
	name?: InputMaybe<Scalars["String"]>;
	variables?: InputMaybe<Array<Scalars["ID"]>>;
	legacyNameIndex?: InputMaybe<Scalars["Int"]>;
	shortIdIndex?: InputMaybe<Scalars["Int"]>;
};

export type IUpsertMutationPayload_NameCompositionPayload = {
	__typename?: "UpsertMutationPayload_NameCompositionPayload";
	node: INameCompositionPayload;
};

export type INameCompositionPayload = {
	__typename?: "NameCompositionPayload";
	node: INameComposition;
	query: INameCompositionQuery;
};

export type IInsert_SampleInput = {
	input: ISampleInput;
};

export type ISampleInput = {
	name: Scalars["String"];
	specifications: Array<ISpecificationInput>;
};

export type IUpdate_SampleInput = {
	id: Scalars["ID"];
	input: IPartial_SampleInput;
};

export type IPartial_SampleInput = {
	name?: InputMaybe<Scalars["String"]>;
	specifications?: InputMaybe<Array<ISpecificationInput>>;
};

export type IUpsertMutationPayload_Sample = {
	__typename?: "UpsertMutationPayload_Sample";
	node: ISample;
};

export type IPublishToDataverseInput = {
	dataverseInstanceId: Scalars["ID"];
	dataverse: Scalars["String"];
	/** Create a new dataset in the dataverse */
	createNewDataset?: InputMaybe<ICreateDatasetInput>;
	/** Use an existing dataset in the dataverse */
	useExistingDataset?: InputMaybe<Scalars["ID"]>;
	resourceId: Scalars["ID"];
};

export type ICreateDatasetInput = {
	title: Scalars["String"];
	description: Scalars["String"];
	subject: Array<Scalars["String"]>;
};

export type ISearchDataverseInput = {
	dataverseInstanceId: Scalars["ID"];
	dataverse: Scalars["String"];
	query: Scalars["String"];
};

export type IInsert_UserDataverseConnectionInput = {
	input: IUserDataverseConnectionInput;
};

export type IUserDataverseConnectionInput = {
	name: Scalars["String"];
	url: Scalars["String"];
	token: Scalars["String"];
};

export type IUpdate_UserDataverseConnectionInput = {
	id: Scalars["ID"];
	input: IPartial_UserDataverseConnectionInput;
};

export type IPartial_UserDataverseConnectionInput = {
	name?: InputMaybe<Scalars["String"]>;
	url?: InputMaybe<Scalars["String"]>;
	token?: InputMaybe<Scalars["String"]>;
};

export type IUpsertMutationPayload_UserDataverseConnection = {
	__typename?: "UpsertMutationPayload_UserDataverseConnection";
	node: IUserDataverseConnection;
};

export type IRepositorySubscription = {
	__typename?: "RepositorySubscription";
	latestNotification: ILatestNotification;
	importTask: IImportTaskResult;
	downsampleDataBecameReady: IDownsampleDataBecameReady;
	sampleAddedOrUpdated: ISampleEdge;
	deviceAddedOrUpdated: IDeviceEdge;
	resourceAddedOrUpdated: IResourceEdge;
	removedNode: IDeletedNodeEdge;
};

export type IImportTaskResult = {
	__typename?: "ImportTaskResult";
	id: Scalars["ID"];
	payload: IImportTaskResultPayload;
};

export type IImportTaskResultPayload =
	| IImportTransformationSuccess
	| IImportTransformationWarning
	| IImportTransformationError
	| IImportTransformationProgress;

export type IImportTransformationSuccess = {
	__typename?: "ImportTransformationSuccess";
	ids: Array<Maybe<Scalars["ID"]>>;
};

export type IImportTransformationWarning = {
	__typename?: "ImportTransformationWarning";
	message: Array<Maybe<Scalars["String"]>>;
};

export type IImportTransformationError = {
	__typename?: "ImportTransformationError";
	message: Array<Maybe<Scalars["String"]>>;
};

export type IImportTransformationProgress = {
	__typename?: "ImportTransformationProgress";
	resourceId?: Maybe<Scalars["ID"]>;
	progress?: Maybe<Scalars["Float"]>;
};

export type IDownsampleDataBecameReady = {
	__typename?: "DownsampleDataBecameReady";
	resourceId: Scalars["ID"];
	dataPoints: Scalars["Int"];
	singleColumn?: Maybe<Scalars["Boolean"]>;
	resource: IResourceTabularData;
};

export type ResolverTypeWrapper<T> = Promise<T> | T;

export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
	resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> =
	| ResolverFn<TResult, TParent, TContext, TArgs>
	| ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
	parent: TParent,
	args: TArgs,
	context: TContext,
	info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
	parent: TParent,
	args: TArgs,
	context: TContext,
	info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
	parent: TParent,
	args: TArgs,
	context: TContext,
	info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<
	TResult,
	TKey extends string,
	TParent,
	TContext,
	TArgs
> {
	subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
	resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
	subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
	resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
	| SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
	| SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<
	TResult,
	TKey extends string,
	TParent = {},
	TContext = {},
	TArgs = {}
> =
	| ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
	| SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
	parent: TParent,
	context: TContext,
	info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (
	obj: T,
	context: TContext,
	info: GraphQLResolveInfo
) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
	next: NextResolverFn<TResult>,
	parent: TParent,
	args: TArgs,
	context: TContext,
	info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

/** Mapping between all available schema types and the resolvers types */
export type IResolversTypes = {
	RepositoryQuery: ResolverTypeWrapper<{}>;
	ID: ResolverTypeWrapper<ResolverReturnType<Scalars["ID"]>>;
	Int: ResolverTypeWrapper<ResolverReturnType<Scalars["Int"]>>;
	String: ResolverTypeWrapper<ResolverReturnType<Scalars["String"]>>;
	Boolean: ResolverTypeWrapper<ResolverReturnType<Scalars["Boolean"]>>;
	Node:
		| IResolversTypes["Device"]
		| IResolversTypes["Sample"]
		| IResolversTypes["ResourceGeneric"]
		| IResolversTypes["ResourceTabularData"]
		| IResolversTypes["Project"]
		| IResolversTypes["User"]
		| IResolversTypes["RemoteRepo"]
		| IResolversTypes["DeviceDefinition"]
		| IResolversTypes["ResourceImage"]
		| IResolversTypes["ImportPreset"]
		| IResolversTypes["Note"]
		| IResolversTypes["Property"]
		| IResolversTypes["SampleRelation"]
		| IResolversTypes["LatestNotification"]
		| IResolversTypes["LatestNotificationPayload"]
		| IResolversTypes["CurrentUser"]
		| IResolversTypes["UserDataverseConnection"]
		| IResolversTypes["NameComposition"]
		| IResolversTypes["NameCompositionVariableConstant"]
		| IResolversTypes["NameCompositionVariableVariable"]
		| IResolversTypes["MonitoredJobsStatus"]
		| IResolversTypes["Transformation"]
		| IResolversTypes["SearchResults"];
	Device: ResolverTypeWrapper<
		ResolverReturnType<
			Omit<IDevice, "freeComponents"> & { freeComponents: Array<IResolversTypes["PropertyValue"]> }
		>
	>;
	SupportsUsageAsProperty: IResolversTypes["Device"] | IResolversTypes["Sample"];
	Sample: ResolverTypeWrapper<ResolverReturnType<ISample>>;
	SupportsNotes: IResolversTypes["Device"] | IResolversTypes["Sample"];
	NoteConnection: ResolverTypeWrapper<ResolverReturnType<INoteConnection>>;
	Connection:
		| IResolversTypes["NoteConnection"]
		| IResolversTypes["ProjectConnection"]
		| IResolversTypes["DeviceConnection"]
		| IResolversTypes["ResourceConnection"]
		| IResolversTypes["SampleConnection"]
		| IResolversTypes["RowConnection"]
		| IResolversTypes["HierarchicalDeviceListConnection"]
		| IResolversTypes["UserConnection"];
	ProjectConnection: ResolverTypeWrapper<ResolverReturnType<IProjectConnection>>;
	ProjectEdge: ResolverTypeWrapper<ResolverReturnType<IProjectEdge>>;
	Edge:
		| IResolversTypes["ProjectEdge"]
		| IResolversTypes["DeletedNodeEdge"]
		| IResolversTypes["HierarchicalDeviceListEdge"]
		| IResolversTypes["RowEdge"]
		| IResolversTypes["DeviceEdge"]
		| IResolversTypes["ResourceEdge"]
		| IResolversTypes["SampleEdge"]
		| IResolversTypes["UserEdge"]
		| IResolversTypes["NoteEdge"];
	DeletedNodeEdge: ResolverTypeWrapper<ResolverReturnType<IDeletedNodeEdge>>;
	DeletedNode: ResolverTypeWrapper<ResolverReturnType<IDeletedNode>>;
	HierarchicalDeviceListEdge: ResolverTypeWrapper<ResolverReturnType<IHierarchicalDeviceListEdge>>;
	HierarchicalDeviceListEntry: ResolverTypeWrapper<
		ResolverReturnType<IHierarchicalDeviceListEntry>
	>;
	ComponentWithPathAndTime: ResolverTypeWrapper<
		ResolverReturnType<
			Omit<IComponentWithPathAndTime, "component"> & { component: IResolversTypes["PropertyValue"] }
		>
	>;
	PropertyValue: ResolverReturnType<IResolversTypes["Device"] | IResolversTypes["Sample"]>;
	DateTime: ResolverTypeWrapper<ResolverReturnType<Scalars["DateTime"]>>;
	RowEdge: ResolverTypeWrapper<ResolverReturnType<IRowEdge>>;
	Row: ResolverTypeWrapper<ResolverReturnType<IRow>>;
	Float: ResolverTypeWrapper<ResolverReturnType<Scalars["Float"]>>;
	DeviceEdge: ResolverTypeWrapper<ResolverReturnType<IDeviceEdge>>;
	ResourceEdge: ResolverTypeWrapper<ResolverReturnType<IResourceEdge>>;
	Resource:
		| IResolversTypes["ResourceGeneric"]
		| IResolversTypes["ResourceTabularData"]
		| IResolversTypes["ResourceImage"];
	ResourceTimed: IResolversTypes["ResourceGeneric"] | IResolversTypes["ResourceTabularData"];
	ResourceGeneric: ResolverTypeWrapper<ResolverReturnType<IResourceGeneric>>;
	HasProjects:
		| IResolversTypes["Device"]
		| IResolversTypes["Sample"]
		| IResolversTypes["ResourceGeneric"]
		| IResolversTypes["ResourceTabularData"]
		| IResolversTypes["ResourceImage"];
	ResourceTabularData: ResolverTypeWrapper<ResolverReturnType<IResourceTabularData>>;
	HasMetadata:
		| IResolversTypes["Device"]
		| IResolversTypes["Sample"]
		| IResolversTypes["ResourceGeneric"]
		| IResolversTypes["ResourceTabularData"]
		| IResolversTypes["Project"]
		| IResolversTypes["DeviceDefinition"]
		| IResolversTypes["ResourceImage"]
		| IResolversTypes["ImportPreset"]
		| IResolversTypes["BaseNote"]
		| IResolversTypes["Note"];
	Project: ResolverTypeWrapper<ResolverReturnType<IProject>>;
	Metadata: ResolverTypeWrapper<ResolverReturnType<IMetadata>>;
	User: ResolverTypeWrapper<ResolverReturnType<IUser>>;
	DeviceConnection: ResolverTypeWrapper<ResolverReturnType<IDeviceConnection>>;
	PageInfo: ResolverTypeWrapper<ResolverReturnType<IPageInfo>>;
	PageCursors: ResolverTypeWrapper<ResolverReturnType<IPageCursors>>;
	PageCursor: ResolverTypeWrapper<ResolverReturnType<IPageCursor>>;
	ResourceConnection: ResolverTypeWrapper<ResolverReturnType<IResourceConnection>>;
	SampleConnection: ResolverTypeWrapper<ResolverReturnType<ISampleConnection>>;
	SampleEdge: ResolverTypeWrapper<ResolverReturnType<ISampleEdge>>;
	OriginRepoMetadata: ResolverTypeWrapper<ResolverReturnType<IOriginRepoMetadata>>;
	RemoteRepo: ResolverTypeWrapper<ResolverReturnType<IRemoteRepo>>;
	DeviceDefinition: ResolverTypeWrapper<
		ResolverReturnType<
			Omit<IDeviceDefinition, "usages"> & { usages: Array<IResolversTypes["DeviceOrDefinition"]> }
		>
	>;
	HasImageResource: IResolversTypes["Device"] | IResolversTypes["DeviceDefinition"];
	ResourceImage: ResolverTypeWrapper<ResolverReturnType<IResourceImage>>;
	ResourceType: ResolverTypeWrapper<ResolverReturnType<Scalars["ResourceType"]>>;
	ImagePreset: ResolverTypeWrapper<ResolverReturnType<IImagePreset>>;
	PropertyDefinition: ResolverTypeWrapper<ResolverReturnType<IPropertyDefinition>>;
	PropertyType: ResolverTypeWrapper<ResolverReturnType<IPropertyType>>;
	Specification: ResolverTypeWrapper<ResolverReturnType<ISpecification>>;
	DeviceDefinitionGraphElement: ResolverTypeWrapper<
		ResolverReturnType<IDeviceDefinitionGraphElement>
	>;
	DeviceOrDefinition: ResolverReturnType<
		IResolversTypes["Device"] | IResolversTypes["DeviceDefinition"]
	>;
	ImportPreset: ResolverTypeWrapper<ResolverReturnType<IImportPreset>>;
	IBaseNote: IResolversTypes["BaseNote"] | IResolversTypes["Note"];
	BaseNote: ResolverTypeWrapper<ResolverReturnType<IBaseNote>>;
	Note: ResolverTypeWrapper<ResolverReturnType<INote>>;
	ColumnDescription: ResolverTypeWrapper<ResolverReturnType<IColumnDescription>>;
	ColumnType: ResolverTypeWrapper<ResolverReturnType<Scalars["ColumnType"]>>;
	RowConnection: ResolverTypeWrapper<ResolverReturnType<IRowConnection>>;
	Data: ResolverTypeWrapper<ResolverReturnType<IData>>;
	DataSeries: ResolverTypeWrapper<ResolverReturnType<IDataSeries>>;
	UserEdge: ResolverTypeWrapper<ResolverReturnType<IUserEdge>>;
	NoteEdge: ResolverTypeWrapper<ResolverReturnType<INoteEdge>>;
	HierarchicalDeviceListConnection: ResolverTypeWrapper<
		ResolverReturnType<IHierarchicalDeviceListConnection>
	>;
	UserConnection: ResolverTypeWrapper<ResolverReturnType<IUserConnection>>;
	TimeFrameInput: ResolverTypeWrapper<ResolverReturnType<ITimeFrameInput>>;
	Property: ResolverTypeWrapper<
		ResolverReturnType<Omit<IProperty, "value"> & { value: IResolversTypes["PropertyValue"] }>
	>;
	SampleRelation: ResolverTypeWrapper<ResolverReturnType<ISampleRelation>>;
	TopLevelDevice: ResolverTypeWrapper<ResolverReturnType<ITopLevelDevice>>;
	SpecificationsGraphElement: ResolverTypeWrapper<ResolverReturnType<ISpecificationsGraphElement>>;
	SetupDescription: ResolverTypeWrapper<ResolverReturnType<ISetupDescription>>;
	SetupLabel: ResolverTypeWrapper<ResolverReturnType<ISetupLabel>>;
	SampleUsage: ResolverTypeWrapper<ResolverReturnType<ISampleUsage>>;
	TimeFrame: ResolverTypeWrapper<ResolverReturnType<ITimeFrame>>;
	IdentifiedPayload: IResolversTypes["LatestNotification"] | IResolversTypes["CurrentUser"];
	LatestNotification: ResolverTypeWrapper<ResolverReturnType<ILatestNotification>>;
	LatestNotificationPayload: ResolverTypeWrapper<ResolverReturnType<ILatestNotificationPayload>>;
	Notification: ResolverTypeWrapper<ResolverReturnType<INotification>>;
	NotificationSeverity: ResolverTypeWrapper<ResolverReturnType<INotificationSeverity>>;
	CurrentUser: ResolverTypeWrapper<ResolverReturnType<ICurrentUser>>;
	CurrentUserCore: ResolverTypeWrapper<ResolverReturnType<ICurrentUserCore>>;
	DateOptions: ResolverTypeWrapper<ResolverReturnType<IDateOptions>>;
	Connection_UserDataverseConnection: ResolverTypeWrapper<
		ResolverReturnType<IConnection_UserDataverseConnection>
	>;
	Edge_UserDataverseConnection: ResolverTypeWrapper<
		ResolverReturnType<IEdge_UserDataverseConnection>
	>;
	UserDataverseConnection: ResolverTypeWrapper<ResolverReturnType<IUserDataverseConnection>>;
	NameComposition: ResolverTypeWrapper<ResolverReturnType<INameComposition>>;
	Connection_NameCompositionVariable: ResolverTypeWrapper<
		ResolverReturnType<IConnection_NameCompositionVariable>
	>;
	Edge_NameCompositionVariable: ResolverTypeWrapper<
		ResolverReturnType<IEdge_NameCompositionVariable>
	>;
	NameCompositionVariable:
		| IResolversTypes["NameCompositionVariableConstant"]
		| IResolversTypes["NameCompositionVariableVariable"];
	NameCompositionVariableConstant: ResolverTypeWrapper<
		ResolverReturnType<INameCompositionVariableConstant>
	>;
	NameCompositionVariableVariable: ResolverTypeWrapper<
		ResolverReturnType<INameCompositionVariableVariable>
	>;
	NameCompositionType: ResolverTypeWrapper<ResolverReturnType<INameCompositionType>>;
	MonitoredJobsStatus: ResolverTypeWrapper<ResolverReturnType<IMonitoredJobsStatus>>;
	Transformation: ResolverTypeWrapper<ResolverReturnType<ITransformation>>;
	SearchResults: ResolverTypeWrapper<ResolverReturnType<ISearchResults>>;
	SearchResult: ResolverTypeWrapper<ResolverReturnType<ISearchResult>>;
	DeviceOrder: ResolverTypeWrapper<ResolverReturnType<IDeviceOrder>>;
	DevicesUsage: ResolverTypeWrapper<ResolverReturnType<IDevicesUsage>>;
	DevicesFilterInput: ResolverTypeWrapper<ResolverReturnType<IDevicesFilterInput>>;
	ResourceOrder: ResolverTypeWrapper<ResolverReturnType<IResourceOrder>>;
	ResourcesFilterInput: ResolverTypeWrapper<ResolverReturnType<IResourcesFilterInput>>;
	SamplesFilterInput: ResolverTypeWrapper<ResolverReturnType<ISamplesFilterInput>>;
	Connection_DeviceDefinition: ResolverTypeWrapper<
		ResolverReturnType<IConnection_DeviceDefinition>
	>;
	Edge_DeviceDefinition: ResolverTypeWrapper<ResolverReturnType<IEdge_DeviceDefinition>>;
	Connection_ImportPreset: ResolverTypeWrapper<ResolverReturnType<IConnection_ImportPreset>>;
	Edge_ImportPreset: ResolverTypeWrapper<ResolverReturnType<IEdge_ImportPreset>>;
	NameCompositionQuery: ResolverTypeWrapper<ResolverReturnType<INameCompositionQuery>>;
	Connection_NameComposition: ResolverTypeWrapper<ResolverReturnType<IConnection_NameComposition>>;
	Edge_NameComposition: ResolverTypeWrapper<ResolverReturnType<IEdge_NameComposition>>;
	NameAvailabilityCheckTarget: ResolverTypeWrapper<
		ResolverReturnType<INameAvailabilityCheckTarget>
	>;
	CheckNameAvailability: ResolverTypeWrapper<ResolverReturnType<ICheckNameAvailability>>;
	ConflictResolution: ResolverTypeWrapper<ResolverReturnType<IConflictResolution>>;
	Dataverse: ResolverTypeWrapper<ResolverReturnType<IDataverse>>;
	RepositoryMutation: ResolverTypeWrapper<{}>;
	UpdateTimeSettingsInput: ResolverTypeWrapper<ResolverReturnType<IUpdateTimeSettingsInput>>;
	JSONString: ResolverTypeWrapper<ResolverReturnType<Scalars["JSONString"]>>;
	ImportWizardStep3Payload: ResolverReturnType<
		IResolversTypes["ImportWizardStep3PayloadSuccess"] | IResolversTypes["ImportWizardError"]
	>;
	ImportWizardStep3PayloadSuccess: ResolverTypeWrapper<
		ResolverReturnType<IImportWizardStep3PayloadSuccess>
	>;
	ImportWizardStep3PayloadData: ResolverTypeWrapper<
		ResolverReturnType<IImportWizardStep3PayloadData>
	>;
	ImportWizardError: ResolverTypeWrapper<ResolverReturnType<IImportWizardError>>;
	ImportRawResourceRequestResponse: ResolverTypeWrapper<
		ResolverReturnType<IImportRawResourceRequestResponse>
	>;
	ImportRawResourceInput: ResolverTypeWrapper<ResolverReturnType<IImportRawResourceInput>>;
	ImportImageResourceInput: ResolverTypeWrapper<ResolverReturnType<IImportImageResourceInput>>;
	ErrorMessageOr_ResourceImage: ResolverTypeWrapper<
		ResolverReturnType<IErrorMessageOr_ResourceImage>
	>;
	ErrorMessage: ResolverTypeWrapper<ResolverReturnType<IErrorMessage>>;
	CreateAndRunImportTransformationInput: ResolverTypeWrapper<
		ResolverReturnType<ICreateAndRunImportTransformationInput>
	>;
	CreateAndRunImportTransformationResponse: ResolverTypeWrapper<
		ResolverReturnType<ICreateAndRunImportTransformationResponse>
	>;
	DeleteResourceInput: ResolverTypeWrapper<ResolverReturnType<IDeleteResourceInput>>;
	AddSampleInput: ResolverTypeWrapper<ResolverReturnType<IAddSampleInput>>;
	AddSamplePayload: ResolverTypeWrapper<ResolverReturnType<IAddSamplePayload>>;
	AddSampleRelationInput: ResolverTypeWrapper<ResolverReturnType<IAddSampleRelationInput>>;
	AddSampleRelationPayload: ResolverTypeWrapper<ResolverReturnType<IAddSampleRelationPayload>>;
	AddSampleAndSampleRelationInput: ResolverTypeWrapper<
		ResolverReturnType<IAddSampleAndSampleRelationInput>
	>;
	Insert_DeviceInput: ResolverTypeWrapper<ResolverReturnType<IInsert_DeviceInput>>;
	DeviceInput: ResolverTypeWrapper<ResolverReturnType<IDeviceInput>>;
	SpecificationInput: ResolverTypeWrapper<ResolverReturnType<ISpecificationInput>>;
	Update_DeviceInput: ResolverTypeWrapper<ResolverReturnType<IUpdate_DeviceInput>>;
	Partial_DeviceInput: ResolverTypeWrapper<ResolverReturnType<IPartial_DeviceInput>>;
	UpsertMutationPayloadDevice: ResolverTypeWrapper<
		ResolverReturnType<IUpsertMutationPayloadDevice>
	>;
	AddDevicePayload: ResolverTypeWrapper<ResolverReturnType<IAddDevicePayload>>;
	DeviceOrSampleOrError: ResolverReturnType<
		IResolversTypes["Device"] | IResolversTypes["Sample"] | IResolversTypes["Error"]
	>;
	Error: ResolverTypeWrapper<ResolverReturnType<IError>>;
	AddDeviceDefinitionInput: ResolverTypeWrapper<ResolverReturnType<IAddDeviceDefinitionInput>>;
	EditDeviceDefinitionInput: ResolverTypeWrapper<ResolverReturnType<IEditDeviceDefinitionInput>>;
	EditDeviceDefinitionResult: ResolverReturnType<
		IResolversTypes["DeviceDefinition"] | IResolversTypes["Error"]
	>;
	DeleteDeviceDefinitionResult: ResolverReturnType<
		IResolversTypes["DeletedNode"] | IResolversTypes["Error"]
	>;
	DeleteSetupDescriptionInput: ResolverTypeWrapper<
		ResolverReturnType<IDeleteSetupDescriptionInput>
	>;
	LinkImageWithSetupDescriptionInput: ResolverTypeWrapper<
		ResolverReturnType<ILinkImageWithSetupDescriptionInput>
	>;
	UpdateSetupDescriptionTimeInput: ResolverTypeWrapper<
		ResolverReturnType<IUpdateSetupDescriptionTimeInput>
	>;
	AddSetupLabelInput: ResolverTypeWrapper<ResolverReturnType<IAddSetupLabelInput>>;
	DeleteSetupLabelInput: ResolverTypeWrapper<ResolverReturnType<IDeleteSetupLabelInput>>;
	MakePrimaryDeviceImageInput: ResolverTypeWrapper<
		ResolverReturnType<IMakePrimaryDeviceImageInput>
	>;
	AddDeviceImageInput: ResolverTypeWrapper<ResolverReturnType<IAddDeviceImageInput>>;
	DeleteDeviceImageInput: ResolverTypeWrapper<ResolverReturnType<IDeleteDeviceImageInput>>;
	RemoveComponentInput: ResolverTypeWrapper<ResolverReturnType<IRemoveComponentInput>>;
	AddComponentInput: ResolverTypeWrapper<ResolverReturnType<IAddComponentInput>>;
	EditComponentInput: ResolverTypeWrapper<ResolverReturnType<IEditComponentInput>>;
	SwapComponentInput: ResolverTypeWrapper<ResolverReturnType<ISwapComponentInput>>;
	LinkToProjectInput: ResolverTypeWrapper<ResolverReturnType<ILinkToProjectInput>>;
	LinkToProjectPayload: ResolverTypeWrapper<ResolverReturnType<ILinkToProjectPayload>>;
	RemoveFromProjectInput: ResolverTypeWrapper<ResolverReturnType<IRemoveFromProjectInput>>;
	RemoveFromProjectPayload: ResolverTypeWrapper<ResolverReturnType<IRemoveFromProjectPayload>>;
	AddProjectInput: ResolverTypeWrapper<ResolverReturnType<IAddProjectInput>>;
	AddProjectPayload: ResolverTypeWrapper<ResolverReturnType<IAddProjectPayload>>;
	AddManualTransformationInput: ResolverTypeWrapper<
		ResolverReturnType<IAddManualTransformationInput>
	>;
	AddManualTransformationPayload: ResolverTypeWrapper<
		ResolverReturnType<IAddManualTransformationPayload>
	>;
	AddEditNoteInput: ResolverTypeWrapper<ResolverReturnType<IAddEditNoteInput>>;
	Insert_ImportPresetInput: ResolverTypeWrapper<ResolverReturnType<IInsert_ImportPresetInput>>;
	ImportPresetInput: ResolverTypeWrapper<ResolverReturnType<IImportPresetInput>>;
	Update_ImportPresetInput: ResolverTypeWrapper<ResolverReturnType<IUpdate_ImportPresetInput>>;
	Partial_ImportPresetInput: ResolverTypeWrapper<ResolverReturnType<IPartial_ImportPresetInput>>;
	UpsertMutationPayload_ImportPreset: ResolverTypeWrapper<
		ResolverReturnType<IUpsertMutationPayload_ImportPreset>
	>;
	Insert_NameCompositionVariableVariableInput: ResolverTypeWrapper<
		ResolverReturnType<IInsert_NameCompositionVariableVariableInput>
	>;
	NameCompositionVariableVariableInput: ResolverTypeWrapper<
		ResolverReturnType<INameCompositionVariableVariableInput>
	>;
	Update_NameCompositionVariableVariableInput: ResolverTypeWrapper<
		ResolverReturnType<IUpdate_NameCompositionVariableVariableInput>
	>;
	Partial_NameCompositionVariableVariableInput: ResolverTypeWrapper<
		ResolverReturnType<IPartial_NameCompositionVariableVariableInput>
	>;
	UpsertMutationPayload_NameCompositionVariableVariable: ResolverTypeWrapper<
		ResolverReturnType<IUpsertMutationPayload_NameCompositionVariableVariable>
	>;
	Insert_NameCompositionVariableConstantInput: ResolverTypeWrapper<
		ResolverReturnType<IInsert_NameCompositionVariableConstantInput>
	>;
	NameCompositionVariableConstantInput: ResolverTypeWrapper<
		ResolverReturnType<INameCompositionVariableConstantInput>
	>;
	Update_NameCompositionVariableConstantInput: ResolverTypeWrapper<
		ResolverReturnType<IUpdate_NameCompositionVariableConstantInput>
	>;
	Partial_NameCompositionVariableConstantInput: ResolverTypeWrapper<
		ResolverReturnType<IPartial_NameCompositionVariableConstantInput>
	>;
	UpsertMutationPayload_NameCompositionVariableConstant: ResolverTypeWrapper<
		ResolverReturnType<IUpsertMutationPayload_NameCompositionVariableConstant>
	>;
	Insert_NameCompositionInput: ResolverTypeWrapper<
		ResolverReturnType<IInsert_NameCompositionInput>
	>;
	NameCompositionInput: ResolverTypeWrapper<ResolverReturnType<INameCompositionInput>>;
	Update_NameCompositionInput: ResolverTypeWrapper<
		ResolverReturnType<IUpdate_NameCompositionInput>
	>;
	Partial_NameCompositionInput: ResolverTypeWrapper<
		ResolverReturnType<IPartial_NameCompositionInput>
	>;
	UpsertMutationPayload_NameCompositionPayload: ResolverTypeWrapper<
		ResolverReturnType<IUpsertMutationPayload_NameCompositionPayload>
	>;
	NameCompositionPayload: ResolverTypeWrapper<ResolverReturnType<INameCompositionPayload>>;
	Insert_SampleInput: ResolverTypeWrapper<ResolverReturnType<IInsert_SampleInput>>;
	SampleInput: ResolverTypeWrapper<ResolverReturnType<ISampleInput>>;
	Update_SampleInput: ResolverTypeWrapper<ResolverReturnType<IUpdate_SampleInput>>;
	Partial_SampleInput: ResolverTypeWrapper<ResolverReturnType<IPartial_SampleInput>>;
	UpsertMutationPayload_Sample: ResolverTypeWrapper<
		ResolverReturnType<IUpsertMutationPayload_Sample>
	>;
	PublishToDataverseInput: ResolverTypeWrapper<ResolverReturnType<IPublishToDataverseInput>>;
	CreateDatasetInput: ResolverTypeWrapper<ResolverReturnType<ICreateDatasetInput>>;
	SearchDataverseInput: ResolverTypeWrapper<ResolverReturnType<ISearchDataverseInput>>;
	Insert_UserDataverseConnectionInput: ResolverTypeWrapper<
		ResolverReturnType<IInsert_UserDataverseConnectionInput>
	>;
	UserDataverseConnectionInput: ResolverTypeWrapper<
		ResolverReturnType<IUserDataverseConnectionInput>
	>;
	Update_UserDataverseConnectionInput: ResolverTypeWrapper<
		ResolverReturnType<IUpdate_UserDataverseConnectionInput>
	>;
	Partial_UserDataverseConnectionInput: ResolverTypeWrapper<
		ResolverReturnType<IPartial_UserDataverseConnectionInput>
	>;
	UpsertMutationPayload_UserDataverseConnection: ResolverTypeWrapper<
		ResolverReturnType<IUpsertMutationPayload_UserDataverseConnection>
	>;
	RepositorySubscription: ResolverTypeWrapper<{}>;
	ImportTaskResult: ResolverTypeWrapper<
		ResolverReturnType<
			Omit<IImportTaskResult, "payload"> & { payload: IResolversTypes["ImportTaskResultPayload"] }
		>
	>;
	ImportTaskResultPayload: ResolverReturnType<
		| IResolversTypes["ImportTransformationSuccess"]
		| IResolversTypes["ImportTransformationWarning"]
		| IResolversTypes["ImportTransformationError"]
		| IResolversTypes["ImportTransformationProgress"]
	>;
	ImportTransformationSuccess: ResolverTypeWrapper<
		ResolverReturnType<IImportTransformationSuccess>
	>;
	ImportTransformationWarning: ResolverTypeWrapper<
		ResolverReturnType<IImportTransformationWarning>
	>;
	ImportTransformationError: ResolverTypeWrapper<ResolverReturnType<IImportTransformationError>>;
	ImportTransformationProgress: ResolverTypeWrapper<
		ResolverReturnType<IImportTransformationProgress>
	>;
	DownsampleDataBecameReady: ResolverTypeWrapper<ResolverReturnType<IDownsampleDataBecameReady>>;
};

/** Mapping between all available schema types and the resolvers parents */
export type IResolversParentTypes = {
	RepositoryQuery: {};
	ID: ResolverReturnType<Scalars["ID"]>;
	Int: ResolverReturnType<Scalars["Int"]>;
	String: ResolverReturnType<Scalars["String"]>;
	Boolean: ResolverReturnType<Scalars["Boolean"]>;
	Node:
		| IResolversParentTypes["Device"]
		| IResolversParentTypes["Sample"]
		| IResolversParentTypes["ResourceGeneric"]
		| IResolversParentTypes["ResourceTabularData"]
		| IResolversParentTypes["Project"]
		| IResolversParentTypes["User"]
		| IResolversParentTypes["RemoteRepo"]
		| IResolversParentTypes["DeviceDefinition"]
		| IResolversParentTypes["ResourceImage"]
		| IResolversParentTypes["ImportPreset"]
		| IResolversParentTypes["Note"]
		| IResolversParentTypes["Property"]
		| IResolversParentTypes["SampleRelation"]
		| IResolversParentTypes["LatestNotification"]
		| IResolversParentTypes["LatestNotificationPayload"]
		| IResolversParentTypes["CurrentUser"]
		| IResolversParentTypes["UserDataverseConnection"]
		| IResolversParentTypes["NameComposition"]
		| IResolversParentTypes["NameCompositionVariableConstant"]
		| IResolversParentTypes["NameCompositionVariableVariable"]
		| IResolversParentTypes["MonitoredJobsStatus"]
		| IResolversParentTypes["Transformation"]
		| IResolversParentTypes["SearchResults"];
	Device: ResolverReturnType<
		Omit<IDevice, "freeComponents"> & {
			freeComponents: Array<IResolversParentTypes["PropertyValue"]>;
		}
	>;
	SupportsUsageAsProperty: IResolversParentTypes["Device"] | IResolversParentTypes["Sample"];
	Sample: ResolverReturnType<ISample>;
	SupportsNotes: IResolversParentTypes["Device"] | IResolversParentTypes["Sample"];
	NoteConnection: ResolverReturnType<INoteConnection>;
	Connection:
		| IResolversParentTypes["NoteConnection"]
		| IResolversParentTypes["ProjectConnection"]
		| IResolversParentTypes["DeviceConnection"]
		| IResolversParentTypes["ResourceConnection"]
		| IResolversParentTypes["SampleConnection"]
		| IResolversParentTypes["RowConnection"]
		| IResolversParentTypes["HierarchicalDeviceListConnection"]
		| IResolversParentTypes["UserConnection"];
	ProjectConnection: ResolverReturnType<IProjectConnection>;
	ProjectEdge: ResolverReturnType<IProjectEdge>;
	Edge:
		| IResolversParentTypes["ProjectEdge"]
		| IResolversParentTypes["DeletedNodeEdge"]
		| IResolversParentTypes["HierarchicalDeviceListEdge"]
		| IResolversParentTypes["RowEdge"]
		| IResolversParentTypes["DeviceEdge"]
		| IResolversParentTypes["ResourceEdge"]
		| IResolversParentTypes["SampleEdge"]
		| IResolversParentTypes["UserEdge"]
		| IResolversParentTypes["NoteEdge"];
	DeletedNodeEdge: ResolverReturnType<IDeletedNodeEdge>;
	DeletedNode: ResolverReturnType<IDeletedNode>;
	HierarchicalDeviceListEdge: ResolverReturnType<IHierarchicalDeviceListEdge>;
	HierarchicalDeviceListEntry: ResolverReturnType<IHierarchicalDeviceListEntry>;
	ComponentWithPathAndTime: ResolverReturnType<
		Omit<IComponentWithPathAndTime, "component"> & {
			component: IResolversParentTypes["PropertyValue"];
		}
	>;
	PropertyValue: ResolverReturnType<
		IResolversParentTypes["Device"] | IResolversParentTypes["Sample"]
	>;
	DateTime: ResolverReturnType<Scalars["DateTime"]>;
	RowEdge: ResolverReturnType<IRowEdge>;
	Row: ResolverReturnType<IRow>;
	Float: ResolverReturnType<Scalars["Float"]>;
	DeviceEdge: ResolverReturnType<IDeviceEdge>;
	ResourceEdge: ResolverReturnType<IResourceEdge>;
	Resource:
		| IResolversParentTypes["ResourceGeneric"]
		| IResolversParentTypes["ResourceTabularData"]
		| IResolversParentTypes["ResourceImage"];
	ResourceTimed:
		| IResolversParentTypes["ResourceGeneric"]
		| IResolversParentTypes["ResourceTabularData"];
	ResourceGeneric: ResolverReturnType<IResourceGeneric>;
	HasProjects:
		| IResolversParentTypes["Device"]
		| IResolversParentTypes["Sample"]
		| IResolversParentTypes["ResourceGeneric"]
		| IResolversParentTypes["ResourceTabularData"]
		| IResolversParentTypes["ResourceImage"];
	ResourceTabularData: ResolverReturnType<IResourceTabularData>;
	HasMetadata:
		| IResolversParentTypes["Device"]
		| IResolversParentTypes["Sample"]
		| IResolversParentTypes["ResourceGeneric"]
		| IResolversParentTypes["ResourceTabularData"]
		| IResolversParentTypes["Project"]
		| IResolversParentTypes["DeviceDefinition"]
		| IResolversParentTypes["ResourceImage"]
		| IResolversParentTypes["ImportPreset"]
		| IResolversParentTypes["BaseNote"]
		| IResolversParentTypes["Note"];
	Project: ResolverReturnType<IProject>;
	Metadata: ResolverReturnType<IMetadata>;
	User: ResolverReturnType<IUser>;
	DeviceConnection: ResolverReturnType<IDeviceConnection>;
	PageInfo: ResolverReturnType<IPageInfo>;
	PageCursors: ResolverReturnType<IPageCursors>;
	PageCursor: ResolverReturnType<IPageCursor>;
	ResourceConnection: ResolverReturnType<IResourceConnection>;
	SampleConnection: ResolverReturnType<ISampleConnection>;
	SampleEdge: ResolverReturnType<ISampleEdge>;
	OriginRepoMetadata: ResolverReturnType<IOriginRepoMetadata>;
	RemoteRepo: ResolverReturnType<IRemoteRepo>;
	DeviceDefinition: ResolverReturnType<
		Omit<IDeviceDefinition, "usages"> & {
			usages: Array<IResolversParentTypes["DeviceOrDefinition"]>;
		}
	>;
	HasImageResource: IResolversParentTypes["Device"] | IResolversParentTypes["DeviceDefinition"];
	ResourceImage: ResolverReturnType<IResourceImage>;
	ResourceType: ResolverReturnType<Scalars["ResourceType"]>;
	PropertyDefinition: ResolverReturnType<IPropertyDefinition>;
	Specification: ResolverReturnType<ISpecification>;
	DeviceDefinitionGraphElement: ResolverReturnType<IDeviceDefinitionGraphElement>;
	DeviceOrDefinition: ResolverReturnType<
		IResolversParentTypes["Device"] | IResolversParentTypes["DeviceDefinition"]
	>;
	ImportPreset: ResolverReturnType<IImportPreset>;
	IBaseNote: IResolversParentTypes["BaseNote"] | IResolversParentTypes["Note"];
	BaseNote: ResolverReturnType<IBaseNote>;
	Note: ResolverReturnType<INote>;
	ColumnDescription: ResolverReturnType<IColumnDescription>;
	ColumnType: ResolverReturnType<Scalars["ColumnType"]>;
	RowConnection: ResolverReturnType<IRowConnection>;
	Data: ResolverReturnType<IData>;
	DataSeries: ResolverReturnType<IDataSeries>;
	UserEdge: ResolverReturnType<IUserEdge>;
	NoteEdge: ResolverReturnType<INoteEdge>;
	HierarchicalDeviceListConnection: ResolverReturnType<IHierarchicalDeviceListConnection>;
	UserConnection: ResolverReturnType<IUserConnection>;
	TimeFrameInput: ResolverReturnType<ITimeFrameInput>;
	Property: ResolverReturnType<
		Omit<IProperty, "value"> & { value: IResolversParentTypes["PropertyValue"] }
	>;
	SampleRelation: ResolverReturnType<ISampleRelation>;
	TopLevelDevice: ResolverReturnType<ITopLevelDevice>;
	SpecificationsGraphElement: ResolverReturnType<ISpecificationsGraphElement>;
	SetupDescription: ResolverReturnType<ISetupDescription>;
	SetupLabel: ResolverReturnType<ISetupLabel>;
	SampleUsage: ResolverReturnType<ISampleUsage>;
	TimeFrame: ResolverReturnType<ITimeFrame>;
	IdentifiedPayload:
		| IResolversParentTypes["LatestNotification"]
		| IResolversParentTypes["CurrentUser"];
	LatestNotification: ResolverReturnType<ILatestNotification>;
	LatestNotificationPayload: ResolverReturnType<ILatestNotificationPayload>;
	Notification: ResolverReturnType<INotification>;
	CurrentUser: ResolverReturnType<ICurrentUser>;
	CurrentUserCore: ResolverReturnType<ICurrentUserCore>;
	DateOptions: ResolverReturnType<IDateOptions>;
	Connection_UserDataverseConnection: ResolverReturnType<IConnection_UserDataverseConnection>;
	Edge_UserDataverseConnection: ResolverReturnType<IEdge_UserDataverseConnection>;
	UserDataverseConnection: ResolverReturnType<IUserDataverseConnection>;
	NameComposition: ResolverReturnType<INameComposition>;
	Connection_NameCompositionVariable: ResolverReturnType<IConnection_NameCompositionVariable>;
	Edge_NameCompositionVariable: ResolverReturnType<IEdge_NameCompositionVariable>;
	NameCompositionVariable:
		| IResolversParentTypes["NameCompositionVariableConstant"]
		| IResolversParentTypes["NameCompositionVariableVariable"];
	NameCompositionVariableConstant: ResolverReturnType<INameCompositionVariableConstant>;
	NameCompositionVariableVariable: ResolverReturnType<INameCompositionVariableVariable>;
	MonitoredJobsStatus: ResolverReturnType<IMonitoredJobsStatus>;
	Transformation: ResolverReturnType<ITransformation>;
	SearchResults: ResolverReturnType<ISearchResults>;
	SearchResult: ResolverReturnType<ISearchResult>;
	DevicesFilterInput: ResolverReturnType<IDevicesFilterInput>;
	ResourcesFilterInput: ResolverReturnType<IResourcesFilterInput>;
	SamplesFilterInput: ResolverReturnType<ISamplesFilterInput>;
	Connection_DeviceDefinition: ResolverReturnType<IConnection_DeviceDefinition>;
	Edge_DeviceDefinition: ResolverReturnType<IEdge_DeviceDefinition>;
	Connection_ImportPreset: ResolverReturnType<IConnection_ImportPreset>;
	Edge_ImportPreset: ResolverReturnType<IEdge_ImportPreset>;
	NameCompositionQuery: ResolverReturnType<INameCompositionQuery>;
	Connection_NameComposition: ResolverReturnType<IConnection_NameComposition>;
	Edge_NameComposition: ResolverReturnType<IEdge_NameComposition>;
	CheckNameAvailability: ResolverReturnType<ICheckNameAvailability>;
	Dataverse: ResolverReturnType<IDataverse>;
	RepositoryMutation: {};
	UpdateTimeSettingsInput: ResolverReturnType<IUpdateTimeSettingsInput>;
	JSONString: ResolverReturnType<Scalars["JSONString"]>;
	ImportWizardStep3Payload: ResolverReturnType<
		| IResolversParentTypes["ImportWizardStep3PayloadSuccess"]
		| IResolversParentTypes["ImportWizardError"]
	>;
	ImportWizardStep3PayloadSuccess: ResolverReturnType<IImportWizardStep3PayloadSuccess>;
	ImportWizardStep3PayloadData: ResolverReturnType<IImportWizardStep3PayloadData>;
	ImportWizardError: ResolverReturnType<IImportWizardError>;
	ImportRawResourceRequestResponse: ResolverReturnType<IImportRawResourceRequestResponse>;
	ImportRawResourceInput: ResolverReturnType<IImportRawResourceInput>;
	ImportImageResourceInput: ResolverReturnType<IImportImageResourceInput>;
	ErrorMessageOr_ResourceImage: ResolverReturnType<IErrorMessageOr_ResourceImage>;
	ErrorMessage: ResolverReturnType<IErrorMessage>;
	CreateAndRunImportTransformationInput: ResolverReturnType<ICreateAndRunImportTransformationInput>;
	CreateAndRunImportTransformationResponse: ResolverReturnType<ICreateAndRunImportTransformationResponse>;
	DeleteResourceInput: ResolverReturnType<IDeleteResourceInput>;
	AddSampleInput: ResolverReturnType<IAddSampleInput>;
	AddSamplePayload: ResolverReturnType<IAddSamplePayload>;
	AddSampleRelationInput: ResolverReturnType<IAddSampleRelationInput>;
	AddSampleRelationPayload: ResolverReturnType<IAddSampleRelationPayload>;
	AddSampleAndSampleRelationInput: ResolverReturnType<IAddSampleAndSampleRelationInput>;
	Insert_DeviceInput: ResolverReturnType<IInsert_DeviceInput>;
	DeviceInput: ResolverReturnType<IDeviceInput>;
	SpecificationInput: ResolverReturnType<ISpecificationInput>;
	Update_DeviceInput: ResolverReturnType<IUpdate_DeviceInput>;
	Partial_DeviceInput: ResolverReturnType<IPartial_DeviceInput>;
	UpsertMutationPayloadDevice: ResolverReturnType<IUpsertMutationPayloadDevice>;
	AddDevicePayload: ResolverReturnType<IAddDevicePayload>;
	DeviceOrSampleOrError: ResolverReturnType<
		| IResolversParentTypes["Device"]
		| IResolversParentTypes["Sample"]
		| IResolversParentTypes["Error"]
	>;
	Error: ResolverReturnType<IError>;
	AddDeviceDefinitionInput: ResolverReturnType<IAddDeviceDefinitionInput>;
	EditDeviceDefinitionInput: ResolverReturnType<IEditDeviceDefinitionInput>;
	EditDeviceDefinitionResult: ResolverReturnType<
		IResolversParentTypes["DeviceDefinition"] | IResolversParentTypes["Error"]
	>;
	DeleteDeviceDefinitionResult: ResolverReturnType<
		IResolversParentTypes["DeletedNode"] | IResolversParentTypes["Error"]
	>;
	DeleteSetupDescriptionInput: ResolverReturnType<IDeleteSetupDescriptionInput>;
	LinkImageWithSetupDescriptionInput: ResolverReturnType<ILinkImageWithSetupDescriptionInput>;
	UpdateSetupDescriptionTimeInput: ResolverReturnType<IUpdateSetupDescriptionTimeInput>;
	AddSetupLabelInput: ResolverReturnType<IAddSetupLabelInput>;
	DeleteSetupLabelInput: ResolverReturnType<IDeleteSetupLabelInput>;
	MakePrimaryDeviceImageInput: ResolverReturnType<IMakePrimaryDeviceImageInput>;
	AddDeviceImageInput: ResolverReturnType<IAddDeviceImageInput>;
	DeleteDeviceImageInput: ResolverReturnType<IDeleteDeviceImageInput>;
	RemoveComponentInput: ResolverReturnType<IRemoveComponentInput>;
	AddComponentInput: ResolverReturnType<IAddComponentInput>;
	EditComponentInput: ResolverReturnType<IEditComponentInput>;
	SwapComponentInput: ResolverReturnType<ISwapComponentInput>;
	LinkToProjectInput: ResolverReturnType<ILinkToProjectInput>;
	LinkToProjectPayload: ResolverReturnType<ILinkToProjectPayload>;
	RemoveFromProjectInput: ResolverReturnType<IRemoveFromProjectInput>;
	RemoveFromProjectPayload: ResolverReturnType<IRemoveFromProjectPayload>;
	AddProjectInput: ResolverReturnType<IAddProjectInput>;
	AddProjectPayload: ResolverReturnType<IAddProjectPayload>;
	AddManualTransformationInput: ResolverReturnType<IAddManualTransformationInput>;
	AddManualTransformationPayload: ResolverReturnType<IAddManualTransformationPayload>;
	AddEditNoteInput: ResolverReturnType<IAddEditNoteInput>;
	Insert_ImportPresetInput: ResolverReturnType<IInsert_ImportPresetInput>;
	ImportPresetInput: ResolverReturnType<IImportPresetInput>;
	Update_ImportPresetInput: ResolverReturnType<IUpdate_ImportPresetInput>;
	Partial_ImportPresetInput: ResolverReturnType<IPartial_ImportPresetInput>;
	UpsertMutationPayload_ImportPreset: ResolverReturnType<IUpsertMutationPayload_ImportPreset>;
	Insert_NameCompositionVariableVariableInput: ResolverReturnType<IInsert_NameCompositionVariableVariableInput>;
	NameCompositionVariableVariableInput: ResolverReturnType<INameCompositionVariableVariableInput>;
	Update_NameCompositionVariableVariableInput: ResolverReturnType<IUpdate_NameCompositionVariableVariableInput>;
	Partial_NameCompositionVariableVariableInput: ResolverReturnType<IPartial_NameCompositionVariableVariableInput>;
	UpsertMutationPayload_NameCompositionVariableVariable: ResolverReturnType<IUpsertMutationPayload_NameCompositionVariableVariable>;
	Insert_NameCompositionVariableConstantInput: ResolverReturnType<IInsert_NameCompositionVariableConstantInput>;
	NameCompositionVariableConstantInput: ResolverReturnType<INameCompositionVariableConstantInput>;
	Update_NameCompositionVariableConstantInput: ResolverReturnType<IUpdate_NameCompositionVariableConstantInput>;
	Partial_NameCompositionVariableConstantInput: ResolverReturnType<IPartial_NameCompositionVariableConstantInput>;
	UpsertMutationPayload_NameCompositionVariableConstant: ResolverReturnType<IUpsertMutationPayload_NameCompositionVariableConstant>;
	Insert_NameCompositionInput: ResolverReturnType<IInsert_NameCompositionInput>;
	NameCompositionInput: ResolverReturnType<INameCompositionInput>;
	Update_NameCompositionInput: ResolverReturnType<IUpdate_NameCompositionInput>;
	Partial_NameCompositionInput: ResolverReturnType<IPartial_NameCompositionInput>;
	UpsertMutationPayload_NameCompositionPayload: ResolverReturnType<IUpsertMutationPayload_NameCompositionPayload>;
	NameCompositionPayload: ResolverReturnType<INameCompositionPayload>;
	Insert_SampleInput: ResolverReturnType<IInsert_SampleInput>;
	SampleInput: ResolverReturnType<ISampleInput>;
	Update_SampleInput: ResolverReturnType<IUpdate_SampleInput>;
	Partial_SampleInput: ResolverReturnType<IPartial_SampleInput>;
	UpsertMutationPayload_Sample: ResolverReturnType<IUpsertMutationPayload_Sample>;
	PublishToDataverseInput: ResolverReturnType<IPublishToDataverseInput>;
	CreateDatasetInput: ResolverReturnType<ICreateDatasetInput>;
	SearchDataverseInput: ResolverReturnType<ISearchDataverseInput>;
	Insert_UserDataverseConnectionInput: ResolverReturnType<IInsert_UserDataverseConnectionInput>;
	UserDataverseConnectionInput: ResolverReturnType<IUserDataverseConnectionInput>;
	Update_UserDataverseConnectionInput: ResolverReturnType<IUpdate_UserDataverseConnectionInput>;
	Partial_UserDataverseConnectionInput: ResolverReturnType<IPartial_UserDataverseConnectionInput>;
	UpsertMutationPayload_UserDataverseConnection: ResolverReturnType<IUpsertMutationPayload_UserDataverseConnection>;
	RepositorySubscription: {};
	ImportTaskResult: ResolverReturnType<
		Omit<IImportTaskResult, "payload"> & {
			payload: IResolversParentTypes["ImportTaskResultPayload"];
		}
	>;
	ImportTaskResultPayload: ResolverReturnType<
		| IResolversParentTypes["ImportTransformationSuccess"]
		| IResolversParentTypes["ImportTransformationWarning"]
		| IResolversParentTypes["ImportTransformationError"]
		| IResolversParentTypes["ImportTransformationProgress"]
	>;
	ImportTransformationSuccess: ResolverReturnType<IImportTransformationSuccess>;
	ImportTransformationWarning: ResolverReturnType<IImportTransformationWarning>;
	ImportTransformationError: ResolverReturnType<IImportTransformationError>;
	ImportTransformationProgress: ResolverReturnType<IImportTransformationProgress>;
	DownsampleDataBecameReady: ResolverReturnType<IDownsampleDataBecameReady>;
};

export type IRepositoryQueryResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["RepositoryQuery"] = IResolversParentTypes["RepositoryQuery"]
> = {
	repository?: Resolver<
		IResolversTypes["RepositoryQuery"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryRepositoryArgs, "id">
	>;
	node?: Resolver<
		Maybe<IResolversTypes["Node"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryNodeArgs, "id">
	>;
	nodes?: Resolver<
		Array<IResolversTypes["Node"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryNodesArgs, "ids">
	>;
	user?: Resolver<
		Maybe<IResolversTypes["User"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryUserArgs, "id">
	>;
	currentUser?: Resolver<IResolversTypes["CurrentUser"], ParentType, ContextType>;
	users?: Resolver<Array<IResolversTypes["User"]>, ParentType, ContextType>;
	devices?: Resolver<
		IResolversTypes["DeviceConnection"],
		ParentType,
		ContextType,
		Partial<IRepositoryQueryDevicesArgs>
	>;
	device?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryDeviceArgs, "id">
	>;
	resources?: Resolver<
		IResolversTypes["ResourceConnection"],
		ParentType,
		ContextType,
		Partial<IRepositoryQueryResourcesArgs>
	>;
	resource?: Resolver<
		IResolversTypes["Resource"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryResourceArgs, "id">
	>;
	mergedResourceChart?: Resolver<
		Array<IResolversTypes["Data"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryMergedResourceChartArgs, "ids">
	>;
	samples?: Resolver<
		IResolversTypes["SampleConnection"],
		ParentType,
		ContextType,
		Partial<IRepositoryQuerySamplesArgs>
	>;
	sample?: Resolver<
		IResolversTypes["Sample"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryQuerySampleArgs, "id">
	>;
	deviceDefinition?: Resolver<
		IResolversTypes["DeviceDefinition"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryDeviceDefinitionArgs, "id">
	>;
	deviceDefinitions?: Resolver<
		IResolversTypes["Connection_DeviceDefinition"],
		ParentType,
		ContextType
	>;
	deviceDefinitionsTree?: Resolver<
		Array<IResolversTypes["DeviceDefinitionGraphElement"]>,
		ParentType,
		ContextType,
		Partial<IRepositoryQueryDeviceDefinitionsTreeArgs>
	>;
	search?: Resolver<IResolversTypes["SearchResults"], ParentType, ContextType>;
	importPresets?: Resolver<
		IResolversTypes["Connection_ImportPreset"],
		ParentType,
		ContextType,
		Partial<IRepositoryQueryImportPresetsArgs>
	>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<IRepositoryQueryProjectsArgs>
	>;
	project?: Resolver<
		IResolversTypes["Project"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryProjectArgs, "id">
	>;
	devicesHierarchical?: Resolver<
		IResolversTypes["HierarchicalDeviceListConnection"],
		ParentType,
		ContextType,
		Partial<IRepositoryQueryDevicesHierarchicalArgs>
	>;
	deviceNameComposition?: Resolver<
		IResolversTypes["NameCompositionQuery"],
		ParentType,
		ContextType
	>;
	checkNameAvailability?: Resolver<
		IResolversTypes["CheckNameAvailability"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryCheckNameAvailabilityArgs, "name">
	>;
	dataverses?: Resolver<
		Array<IResolversTypes["Dataverse"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryQueryDataversesArgs, "instanceId">
	>;
};

export type INodeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Node"] = IResolversParentTypes["Node"]
> = {
	__resolveType: TypeResolveFn<
		| "Device"
		| "Sample"
		| "ResourceGeneric"
		| "ResourceTabularData"
		| "Project"
		| "User"
		| "RemoteRepo"
		| "DeviceDefinition"
		| "ResourceImage"
		| "ImportPreset"
		| "Note"
		| "Property"
		| "SampleRelation"
		| "LatestNotification"
		| "LatestNotificationPayload"
		| "CurrentUser"
		| "UserDataverseConnection"
		| "NameComposition"
		| "NameCompositionVariableConstant"
		| "NameCompositionVariableVariable"
		| "MonitoredJobsStatus"
		| "Transformation"
		| "SearchResults",
		ParentType,
		ContextType
	>;
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
};

export type IDeviceResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Device"] = IResolversParentTypes["Device"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	displayName?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	shortId?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	definition?: Resolver<IResolversTypes["DeviceDefinition"], ParentType, ContextType>;
	definitions?: Resolver<
		Array<IResolversTypes["DeviceDefinitionGraphElement"]>,
		ParentType,
		ContextType
	>;
	specifications?: Resolver<
		Array<IResolversTypes["Specification"]>,
		ParentType,
		ContextType,
		Partial<IDeviceSpecificationsArgs>
	>;
	properties?: Resolver<
		Array<IResolversTypes["Property"]>,
		ParentType,
		ContextType,
		Partial<IDevicePropertiesArgs>
	>;
	imageResource?: Resolver<Array<IResolversTypes["ResourceImage"]>, ParentType, ContextType>;
	setupDescription?: Resolver<
		Array<IResolversTypes["SetupDescription"]>,
		ParentType,
		ContextType,
		Partial<IDeviceSetupDescriptionArgs>
	>;
	usagesAsProperty?: Resolver<
		Array<IResolversTypes["Property"]>,
		ParentType,
		ContextType,
		Partial<IDeviceUsagesAsPropertyArgs>
	>;
	parent?: Resolver<
		Maybe<IResolversTypes["Device"]>,
		ParentType,
		ContextType,
		Partial<IDeviceParentArgs>
	>;
	samples?: Resolver<Array<IResolversTypes["SampleUsage"]>, ParentType, ContextType>;
	usageInResource?: Resolver<
		Array<Maybe<IResolversTypes["ResourceTimed"]>>,
		ParentType,
		ContextType
	>;
	components?: Resolver<
		Array<IResolversTypes["ComponentWithPathAndTime"]>,
		ParentType,
		ContextType,
		Partial<IDeviceComponentsArgs>
	>;
	topLevelDevice?: Resolver<
		Maybe<IResolversTypes["TopLevelDevice"]>,
		ParentType,
		ContextType,
		Partial<IDeviceTopLevelDeviceArgs>
	>;
	freeComponents?: Resolver<
		Array<IResolversTypes["PropertyValue"]>,
		ParentType,
		ContextType,
		RequireFields<IDeviceFreeComponentsArgs, "begin">
	>;
	componentsInSlot?: Resolver<
		Array<IResolversTypes["ComponentWithPathAndTime"]>,
		ParentType,
		ContextType,
		RequireFields<IDeviceComponentsInSlotArgs, "path">
	>;
	notes?: Resolver<IResolversTypes["NoteConnection"], ParentType, ContextType>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<IDeviceProjectsArgs>
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISupportsUsageAsPropertyResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SupportsUsageAsProperty"] = IResolversParentTypes["SupportsUsageAsProperty"]
> = {
	__resolveType: TypeResolveFn<"Device" | "Sample", ParentType, ContextType>;
	usagesAsProperty?: Resolver<
		Array<IResolversTypes["Property"]>,
		ParentType,
		ContextType,
		Partial<ISupportsUsageAsPropertyUsagesAsPropertyArgs>
	>;
};

export type ISampleResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Sample"] = IResolversParentTypes["Sample"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	displayName?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	usagesAsProperty?: Resolver<
		Array<IResolversTypes["Property"]>,
		ParentType,
		ContextType,
		Partial<ISampleUsagesAsPropertyArgs>
	>;
	relatedSamples?: Resolver<Array<IResolversTypes["SampleRelation"]>, ParentType, ContextType>;
	relatedSamplesReverse?: Resolver<
		Array<IResolversTypes["SampleRelation"]>,
		ParentType,
		ContextType
	>;
	devices?: Resolver<Array<IResolversTypes["Property"]>, ParentType, ContextType>;
	device?: Resolver<
		Maybe<IResolversTypes["Device"]>,
		ParentType,
		ContextType,
		Partial<ISampleDeviceArgs>
	>;
	resources?: Resolver<Array<IResolversTypes["ResourceTabularData"]>, ParentType, ContextType>;
	topLevelDevice?: Resolver<
		Maybe<IResolversTypes["TopLevelDevice"]>,
		ParentType,
		ContextType,
		Partial<ISampleTopLevelDeviceArgs>
	>;
	notes?: Resolver<IResolversTypes["NoteConnection"], ParentType, ContextType>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<ISampleProjectsArgs>
	>;
	specifications?: Resolver<Array<IResolversTypes["Specification"]>, ParentType, ContextType>;
	specificationsCollected?: Resolver<
		Array<IResolversTypes["SpecificationsGraphElement"]>,
		ParentType,
		ContextType
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISupportsNotesResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SupportsNotes"] = IResolversParentTypes["SupportsNotes"]
> = {
	__resolveType: TypeResolveFn<"Device" | "Sample", ParentType, ContextType>;
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	notes?: Resolver<IResolversTypes["NoteConnection"], ParentType, ContextType>;
};

export type INoteConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["NoteConnection"] = IResolversParentTypes["NoteConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["NoteEdge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Connection"] = IResolversParentTypes["Connection"]
> = {
	__resolveType: TypeResolveFn<
		| "NoteConnection"
		| "ProjectConnection"
		| "DeviceConnection"
		| "ResourceConnection"
		| "SampleConnection"
		| "RowConnection"
		| "HierarchicalDeviceListConnection"
		| "UserConnection",
		ParentType,
		ContextType
	>;
	edges?: Resolver<Array<IResolversTypes["Edge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
};

export type IProjectConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ProjectConnection"] = IResolversParentTypes["ProjectConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["ProjectEdge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IProjectEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ProjectEdge"] = IResolversParentTypes["ProjectEdge"]
> = {
	node?: Resolver<IResolversTypes["Project"], ParentType, ContextType>;
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Edge"] = IResolversParentTypes["Edge"]
> = {
	__resolveType: TypeResolveFn<
		| "ProjectEdge"
		| "DeletedNodeEdge"
		| "HierarchicalDeviceListEdge"
		| "RowEdge"
		| "DeviceEdge"
		| "ResourceEdge"
		| "SampleEdge"
		| "UserEdge"
		| "NoteEdge",
		ParentType,
		ContextType
	>;
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
};

export type IDeletedNodeEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeletedNodeEdge"] = IResolversParentTypes["DeletedNodeEdge"]
> = {
	node?: Resolver<IResolversTypes["DeletedNode"], ParentType, ContextType>;
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDeletedNodeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeletedNode"] = IResolversParentTypes["DeletedNode"]
> = {
	deletedId?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IHierarchicalDeviceListEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["HierarchicalDeviceListEdge"] = IResolversParentTypes["HierarchicalDeviceListEdge"]
> = {
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	node?: Resolver<Maybe<IResolversTypes["HierarchicalDeviceListEntry"]>, ParentType, ContextType>;
	isNewlyCreated?: Resolver<Maybe<IResolversTypes["Boolean"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IHierarchicalDeviceListEntryResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["HierarchicalDeviceListEntry"] = IResolversParentTypes["HierarchicalDeviceListEntry"]
> = {
	device?: Resolver<IResolversTypes["Device"], ParentType, ContextType>;
	components?: Resolver<
		Array<IResolversTypes["ComponentWithPathAndTime"]>,
		ParentType,
		ContextType
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IComponentWithPathAndTimeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ComponentWithPathAndTime"] = IResolversParentTypes["ComponentWithPathAndTime"]
> = {
	component?: Resolver<IResolversTypes["PropertyValue"], ParentType, ContextType>;
	pathFromTopLevelDevice?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	installDate?: Resolver<IResolversTypes["DateTime"], ParentType, ContextType>;
	removeDate?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IPropertyValueResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["PropertyValue"] = IResolversParentTypes["PropertyValue"]
> = {
	__resolveType: TypeResolveFn<"Device" | "Sample", ParentType, ContextType>;
};

export interface IDateTimeScalarConfig
	extends GraphQLScalarTypeConfig<IResolversTypes["DateTime"], any> {
	name: "DateTime";
}

export type IRowEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["RowEdge"] = IResolversParentTypes["RowEdge"]
> = {
	node?: Resolver<IResolversTypes["Row"], ParentType, ContextType>;
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IRowResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Row"] = IResolversParentTypes["Row"]
> = {
	values?: Resolver<Array<IResolversTypes["Float"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDeviceEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeviceEdge"] = IResolversParentTypes["DeviceEdge"]
> = {
	isNewlyCreated?: Resolver<Maybe<IResolversTypes["Boolean"]>, ParentType, ContextType>;
	node?: Resolver<IResolversTypes["Device"], ParentType, ContextType>;
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IResourceEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ResourceEdge"] = IResolversParentTypes["ResourceEdge"]
> = {
	node?: Resolver<IResolversTypes["Resource"], ParentType, ContextType>;
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IResourceResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Resource"] = IResolversParentTypes["Resource"]
> = {
	__resolveType: TypeResolveFn<
		"ResourceGeneric" | "ResourceTabularData" | "ResourceImage",
		ParentType,
		ContextType
	>;
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	subName?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<IResourceProjectsArgs>
	>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	parent?: Resolver<Maybe<IResolversTypes["Resource"]>, ParentType, ContextType>;
	children?: Resolver<IResolversTypes["ResourceConnection"], ParentType, ContextType>;
	devices?: Resolver<Array<IResolversTypes["Device"]>, ParentType, ContextType>;
	type?: Resolver<Maybe<IResolversTypes["ResourceType"]>, ParentType, ContextType>;
};

export type IResourceTimedResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ResourceTimed"] = IResolversParentTypes["ResourceTimed"]
> = {
	__resolveType: TypeResolveFn<"ResourceGeneric" | "ResourceTabularData", ParentType, ContextType>;
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	subName?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<IResourceTimedProjectsArgs>
	>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	parent?: Resolver<Maybe<IResolversTypes["Resource"]>, ParentType, ContextType>;
	children?: Resolver<IResolversTypes["ResourceConnection"], ParentType, ContextType>;
	devices?: Resolver<Array<IResolversTypes["Device"]>, ParentType, ContextType>;
	type?: Resolver<Maybe<IResolversTypes["ResourceType"]>, ParentType, ContextType>;
	begin?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	end?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
};

export type IResourceGenericResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ResourceGeneric"] = IResolversParentTypes["ResourceGeneric"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	subName?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<IResourceGenericProjectsArgs>
	>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	parent?: Resolver<Maybe<IResolversTypes["Resource"]>, ParentType, ContextType>;
	children?: Resolver<IResolversTypes["ResourceConnection"], ParentType, ContextType>;
	devices?: Resolver<Array<IResolversTypes["Device"]>, ParentType, ContextType>;
	type?: Resolver<Maybe<IResolversTypes["ResourceType"]>, ParentType, ContextType>;
	uploadDeviceId?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	begin?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	end?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	downloadURL?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	text?: Resolver<
		IResolversTypes["String"],
		ParentType,
		ContextType,
		RequireFields<IResourceGenericTextArgs, "start" | "end">
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IHasProjectsResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["HasProjects"] = IResolversParentTypes["HasProjects"]
> = {
	__resolveType: TypeResolveFn<
		"Device" | "Sample" | "ResourceGeneric" | "ResourceTabularData" | "ResourceImage",
		ParentType,
		ContextType
	>;
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<IHasProjectsProjectsArgs>
	>;
};

export type IResourceTabularDataResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ResourceTabularData"] = IResolversParentTypes["ResourceTabularData"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	subName?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<IResourceTabularDataProjectsArgs>
	>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	parent?: Resolver<Maybe<IResolversTypes["Resource"]>, ParentType, ContextType>;
	children?: Resolver<IResolversTypes["ResourceConnection"], ParentType, ContextType>;
	devices?: Resolver<Array<IResolversTypes["Device"]>, ParentType, ContextType>;
	type?: Resolver<Maybe<IResolversTypes["ResourceType"]>, ParentType, ContextType>;
	begin?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	end?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	columns?: Resolver<Array<IResolversTypes["ColumnDescription"]>, ParentType, ContextType>;
	rows?: Resolver<
		Maybe<IResolversTypes["RowConnection"]>,
		ParentType,
		ContextType,
		Partial<IResourceTabularDataRowsArgs>
	>;
	downSampled?: Resolver<
		Maybe<IResolversTypes["Data"]>,
		ParentType,
		ContextType,
		RequireFields<IResourceTabularDataDownSampledArgs, "dataPoints">
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IHasMetadataResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["HasMetadata"] = IResolversParentTypes["HasMetadata"]
> = {
	__resolveType: TypeResolveFn<
		| "Device"
		| "Sample"
		| "ResourceGeneric"
		| "ResourceTabularData"
		| "Project"
		| "DeviceDefinition"
		| "ResourceImage"
		| "ImportPreset"
		| "BaseNote"
		| "Note",
		ParentType,
		ContextType
	>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
};

export type IProjectResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Project"] = IResolversParentTypes["Project"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	contents?: Resolver<Array<IResolversTypes["HasProjects"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IMetadataResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Metadata"] = IResolversParentTypes["Metadata"]
> = {
	creator?: Resolver<IResolversTypes["User"], ParentType, ContextType>;
	creationTimestamp?: Resolver<IResolversTypes["DateTime"], ParentType, ContextType>;
	origin?: Resolver<Maybe<IResolversTypes["OriginRepoMetadata"]>, ParentType, ContextType>;
	canEdit?: Resolver<Maybe<IResolversTypes["Boolean"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUserResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["User"] = IResolversParentTypes["User"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	repositories?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	createdDevices?: Resolver<IResolversTypes["DeviceConnection"], ParentType, ContextType>;
	createdResources?: Resolver<IResolversTypes["ResourceConnection"], ParentType, ContextType>;
	createdSamples?: Resolver<IResolversTypes["SampleConnection"], ParentType, ContextType>;
	createdProjects?: Resolver<IResolversTypes["ProjectConnection"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDeviceConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeviceConnection"] = IResolversParentTypes["DeviceConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["DeviceEdge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IPageInfoResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["PageInfo"] = IResolversParentTypes["PageInfo"]
> = {
	hasPreviousPage?: Resolver<IResolversTypes["Boolean"], ParentType, ContextType>;
	hasNextPage?: Resolver<IResolversTypes["Boolean"], ParentType, ContextType>;
	startCursor?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	endCursor?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	cursors?: Resolver<Maybe<IResolversTypes["PageCursors"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IPageCursorsResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["PageCursors"] = IResolversParentTypes["PageCursors"]
> = {
	first?: Resolver<IResolversTypes["PageCursor"], ParentType, ContextType>;
	last?: Resolver<IResolversTypes["PageCursor"], ParentType, ContextType>;
	around?: Resolver<Array<IResolversTypes["PageCursor"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IPageCursorResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["PageCursor"] = IResolversParentTypes["PageCursor"]
> = {
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	pageNumber?: Resolver<IResolversTypes["Int"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IResourceConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ResourceConnection"] = IResolversParentTypes["ResourceConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["ResourceEdge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISampleConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SampleConnection"] = IResolversParentTypes["SampleConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["SampleEdge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISampleEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SampleEdge"] = IResolversParentTypes["SampleEdge"]
> = {
	node?: Resolver<IResolversTypes["Sample"], ParentType, ContextType>;
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IOriginRepoMetadataResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["OriginRepoMetadata"] = IResolversParentTypes["OriginRepoMetadata"]
> = {
	remoteRepo?: Resolver<Maybe<IResolversTypes["RemoteRepo"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IRemoteRepoResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["RemoteRepo"] = IResolversParentTypes["RemoteRepo"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDeviceDefinitionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeviceDefinition"] = IResolversParentTypes["DeviceDefinition"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	imageResource?: Resolver<Array<IResolversTypes["ResourceImage"]>, ParentType, ContextType>;
	propertyDefinitions?: Resolver<
		Array<IResolversTypes["PropertyDefinition"]>,
		ParentType,
		ContextType
	>;
	specifications?: Resolver<Array<IResolversTypes["Specification"]>, ParentType, ContextType>;
	acceptsUnit?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	definitions?: Resolver<
		Array<IResolversTypes["DeviceDefinitionGraphElement"]>,
		ParentType,
		ContextType
	>;
	derivedDefinitionsFlat?: Resolver<
		Array<IResolversTypes["DeviceDefinition"]>,
		ParentType,
		ContextType
	>;
	usages?: Resolver<Array<IResolversTypes["DeviceOrDefinition"]>, ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IHasImageResourceResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["HasImageResource"] = IResolversParentTypes["HasImageResource"]
> = {
	__resolveType: TypeResolveFn<"Device" | "DeviceDefinition", ParentType, ContextType>;
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	imageResource?: Resolver<Array<IResolversTypes["ResourceImage"]>, ParentType, ContextType>;
};

export type IResourceImageResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ResourceImage"] = IResolversParentTypes["ResourceImage"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	subName?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	projects?: Resolver<
		IResolversTypes["ProjectConnection"],
		ParentType,
		ContextType,
		Partial<IResourceImageProjectsArgs>
	>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	parent?: Resolver<Maybe<IResolversTypes["Resource"]>, ParentType, ContextType>;
	children?: Resolver<IResolversTypes["ResourceConnection"], ParentType, ContextType>;
	devices?: Resolver<Array<IResolversTypes["Device"]>, ParentType, ContextType>;
	type?: Resolver<Maybe<IResolversTypes["ResourceType"]>, ParentType, ContextType>;
	dataURI?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	imageURI?: Resolver<
		IResolversTypes["String"],
		ParentType,
		ContextType,
		RequireFields<IResourceImageImageUriArgs, "preset">
	>;
	height?: Resolver<IResolversTypes["Float"], ParentType, ContextType>;
	width?: Resolver<IResolversTypes["Float"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface IResourceTypeScalarConfig
	extends GraphQLScalarTypeConfig<IResolversTypes["ResourceType"], any> {
	name: "ResourceType";
}

export type IPropertyDefinitionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["PropertyDefinition"] = IResolversParentTypes["PropertyDefinition"]
> = {
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	type?: Resolver<IResolversTypes["PropertyType"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISpecificationResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Specification"] = IResolversParentTypes["Specification"]
> = {
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	value?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDeviceDefinitionGraphElementResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeviceDefinitionGraphElement"] = IResolversParentTypes["DeviceDefinitionGraphElement"]
> = {
	level?: Resolver<IResolversTypes["Int"], ParentType, ContextType>;
	definition?: Resolver<IResolversTypes["DeviceDefinition"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDeviceOrDefinitionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeviceOrDefinition"] = IResolversParentTypes["DeviceOrDefinition"]
> = {
	__resolveType: TypeResolveFn<"Device" | "DeviceDefinition", ParentType, ContextType>;
};

export type IImportPresetResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportPreset"] = IResolversParentTypes["ImportPreset"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	devices?: Resolver<Array<IResolversTypes["Device"]>, ParentType, ContextType>;
	displayName?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	presetJSON?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	columns?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IIBaseNoteResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["IBaseNote"] = IResolversParentTypes["IBaseNote"]
> = {
	__resolveType: TypeResolveFn<"BaseNote" | "Note", ParentType, ContextType>;
	caption?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	text?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	begin?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	end?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
};

export type IBaseNoteResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["BaseNote"] = IResolversParentTypes["BaseNote"]
> = {
	caption?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	text?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	begin?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	end?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type INoteResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Note"] = IResolversParentTypes["Note"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	caption?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	text?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	begin?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	end?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	revisions?: Resolver<Array<IResolversTypes["BaseNote"]>, ParentType, ContextType>;
	metadata?: Resolver<IResolversTypes["Metadata"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IColumnDescriptionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ColumnDescription"] = IResolversParentTypes["ColumnDescription"]
> = {
	label?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	type?: Resolver<IResolversTypes["ColumnType"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface IColumnTypeScalarConfig
	extends GraphQLScalarTypeConfig<IResolversTypes["ColumnType"], any> {
	name: "ColumnType";
}

export type IRowConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["RowConnection"] = IResolversParentTypes["RowConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["RowEdge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	count?: Resolver<IResolversTypes["Int"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDataResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Data"] = IResolversParentTypes["Data"]
> = {
	x?: Resolver<IResolversTypes["DataSeries"], ParentType, ContextType>;
	y?: Resolver<Array<IResolversTypes["DataSeries"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDataSeriesResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DataSeries"] = IResolversParentTypes["DataSeries"]
> = {
	label?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	unit?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	values?: Resolver<Array<Maybe<IResolversTypes["Float"]>>, ParentType, ContextType>;
	device?: Resolver<Maybe<IResolversTypes["Device"]>, ParentType, ContextType>;
	resourceId?: Resolver<Maybe<IResolversTypes["ID"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUserEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UserEdge"] = IResolversParentTypes["UserEdge"]
> = {
	node?: Resolver<IResolversTypes["User"], ParentType, ContextType>;
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type INoteEdgeResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["NoteEdge"] = IResolversParentTypes["NoteEdge"]
> = {
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	node?: Resolver<IResolversTypes["Note"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IHierarchicalDeviceListConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["HierarchicalDeviceListConnection"] = IResolversParentTypes["HierarchicalDeviceListConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["HierarchicalDeviceListEdge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUserConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UserConnection"] = IResolversParentTypes["UserConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["UserEdge"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IPropertyResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Property"] = IResolversParentTypes["Property"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	timestamp?: Resolver<IResolversTypes["DateTime"], ParentType, ContextType>;
	timestampEnd?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	device?: Resolver<IResolversTypes["Device"], ParentType, ContextType>;
	value?: Resolver<IResolversTypes["PropertyValue"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISampleRelationResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SampleRelation"] = IResolversParentTypes["SampleRelation"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	type?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	sample?: Resolver<IResolversTypes["Sample"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ITopLevelDeviceResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["TopLevelDevice"] = IResolversParentTypes["TopLevelDevice"]
> = {
	device?: Resolver<IResolversTypes["Device"], ParentType, ContextType>;
	path?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISpecificationsGraphElementResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SpecificationsGraphElement"] = IResolversParentTypes["SpecificationsGraphElement"]
> = {
	level?: Resolver<IResolversTypes["Int"], ParentType, ContextType>;
	sample?: Resolver<IResolversTypes["Sample"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISetupDescriptionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SetupDescription"] = IResolversParentTypes["SetupDescription"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	imageResource?: Resolver<IResolversTypes["ResourceImage"], ParentType, ContextType>;
	begin?: Resolver<IResolversTypes["DateTime"], ParentType, ContextType>;
	end?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	setupLabels?: Resolver<Array<IResolversTypes["SetupLabel"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISetupLabelResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SetupLabel"] = IResolversParentTypes["SetupLabel"]
> = {
	propertyPath?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	xPos?: Resolver<IResolversTypes["Float"], ParentType, ContextType>;
	yPos?: Resolver<IResolversTypes["Float"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISampleUsageResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SampleUsage"] = IResolversParentTypes["SampleUsage"]
> = {
	sample?: Resolver<IResolversTypes["Sample"], ParentType, ContextType>;
	timeframes?: Resolver<Array<IResolversTypes["TimeFrame"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ITimeFrameResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["TimeFrame"] = IResolversParentTypes["TimeFrame"]
> = {
	begin?: Resolver<IResolversTypes["DateTime"], ParentType, ContextType>;
	end?: Resolver<Maybe<IResolversTypes["DateTime"]>, ParentType, ContextType>;
	pathFromTopLevelDevice?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IIdentifiedPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["IdentifiedPayload"] = IResolversParentTypes["IdentifiedPayload"]
> = {
	__resolveType: TypeResolveFn<"LatestNotification" | "CurrentUser", ParentType, ContextType>;
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
};

export type ILatestNotificationResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["LatestNotification"] = IResolversParentTypes["LatestNotification"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	payload?: Resolver<Maybe<IResolversTypes["LatestNotificationPayload"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ILatestNotificationPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["LatestNotificationPayload"] = IResolversParentTypes["LatestNotificationPayload"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	notification?: Resolver<IResolversTypes["Notification"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type INotificationResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Notification"] = IResolversParentTypes["Notification"]
> = {
	title?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	text?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	severity?: Resolver<Maybe<IResolversTypes["NotificationSeverity"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ICurrentUserResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["CurrentUser"] = IResolversParentTypes["CurrentUser"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	payload?: Resolver<IResolversTypes["CurrentUserCore"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ICurrentUserCoreResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["CurrentUserCore"] = IResolversParentTypes["CurrentUserCore"]
> = {
	user?: Resolver<IResolversTypes["User"], ParentType, ContextType>;
	timeSetting?: Resolver<Maybe<IResolversTypes["DateOptions"]>, ParentType, ContextType>;
	dataverses?: Resolver<
		IResolversTypes["Connection_UserDataverseConnection"],
		ParentType,
		ContextType
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDateOptionsResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DateOptions"] = IResolversParentTypes["DateOptions"]
> = {
	locale?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	dateStyle?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	timeStyle?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IConnection_UserDataverseConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Connection_UserDataverseConnection"] = IResolversParentTypes["Connection_UserDataverseConnection"]
> = {
	edges?: Resolver<Array<IResolversTypes["Edge_UserDataverseConnection"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IEdge_UserDataverseConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Edge_UserDataverseConnection"] = IResolversParentTypes["Edge_UserDataverseConnection"]
> = {
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	node?: Resolver<IResolversTypes["UserDataverseConnection"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUserDataverseConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UserDataverseConnection"] = IResolversParentTypes["UserDataverseConnection"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	url?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	tokenPreview?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type INameCompositionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["NameComposition"] = IResolversParentTypes["NameComposition"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	variables?: Resolver<
		IResolversTypes["Connection_NameCompositionVariable"],
		ParentType,
		ContextType
	>;
	legacyNameIndex?: Resolver<Maybe<IResolversTypes["Int"]>, ParentType, ContextType>;
	shortIdIndex?: Resolver<Maybe<IResolversTypes["Int"]>, ParentType, ContextType>;
	usageType?: Resolver<Maybe<IResolversTypes["NameCompositionType"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IConnection_NameCompositionVariableResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Connection_NameCompositionVariable"] = IResolversParentTypes["Connection_NameCompositionVariable"]
> = {
	edges?: Resolver<Array<IResolversTypes["Edge_NameCompositionVariable"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IEdge_NameCompositionVariableResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Edge_NameCompositionVariable"] = IResolversParentTypes["Edge_NameCompositionVariable"]
> = {
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	node?: Resolver<IResolversTypes["NameCompositionVariable"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type INameCompositionVariableResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["NameCompositionVariable"] = IResolversParentTypes["NameCompositionVariable"]
> = {
	__resolveType: TypeResolveFn<
		"NameCompositionVariableConstant" | "NameCompositionVariableVariable",
		ParentType,
		ContextType
	>;
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	deletable?: Resolver<IResolversTypes["Boolean"], ParentType, ContextType>;
};

export type INameCompositionVariableConstantResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["NameCompositionVariableConstant"] = IResolversParentTypes["NameCompositionVariableConstant"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	deletable?: Resolver<IResolversTypes["Boolean"], ParentType, ContextType>;
	value?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type INameCompositionVariableVariableResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["NameCompositionVariableVariable"] = IResolversParentTypes["NameCompositionVariableVariable"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	name?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	deletable?: Resolver<IResolversTypes["Boolean"], ParentType, ContextType>;
	alias?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	prefix?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	suffix?: Resolver<Maybe<IResolversTypes["String"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IMonitoredJobsStatusResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["MonitoredJobsStatus"] = IResolversParentTypes["MonitoredJobsStatus"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	statuses?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ITransformationResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Transformation"] = IResolversParentTypes["Transformation"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISearchResultsResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SearchResults"] = IResolversParentTypes["SearchResults"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	search?: Resolver<
		Array<IResolversTypes["SearchResult"]>,
		ParentType,
		ContextType,
		RequireFields<ISearchResultsSearchArgs, "query" | "queryTime" | "first">
	>;
	devices?: Resolver<
		Maybe<IResolversTypes["DeviceConnection"]>,
		ParentType,
		ContextType,
		RequireFields<ISearchResultsDevicesArgs, "query" | "queryTime" | "first">
	>;
	resources?: Resolver<
		Maybe<IResolversTypes["ResourceConnection"]>,
		ParentType,
		ContextType,
		RequireFields<ISearchResultsResourcesArgs, "query" | "queryTime" | "first">
	>;
	samples?: Resolver<
		Maybe<IResolversTypes["SampleConnection"]>,
		ParentType,
		ContextType,
		RequireFields<ISearchResultsSamplesArgs, "query" | "queryTime" | "first">
	>;
	projects?: Resolver<
		Maybe<IResolversTypes["ProjectConnection"]>,
		ParentType,
		ContextType,
		RequireFields<ISearchResultsProjectsArgs, "query" | "queryTime" | "first">
	>;
	users?: Resolver<
		Maybe<IResolversTypes["UserConnection"]>,
		ParentType,
		ContextType,
		RequireFields<ISearchResultsUsersArgs, "query" | "first">
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ISearchResultResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["SearchResult"] = IResolversParentTypes["SearchResult"]
> = {
	node?: Resolver<IResolversTypes["Node"], ParentType, ContextType>;
	score?: Resolver<IResolversTypes["Float"], ParentType, ContextType>;
	repositoryId?: Resolver<Maybe<IResolversTypes["ID"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IConnection_DeviceDefinitionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Connection_DeviceDefinition"] = IResolversParentTypes["Connection_DeviceDefinition"]
> = {
	edges?: Resolver<Array<IResolversTypes["Edge_DeviceDefinition"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IEdge_DeviceDefinitionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Edge_DeviceDefinition"] = IResolversParentTypes["Edge_DeviceDefinition"]
> = {
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	node?: Resolver<IResolversTypes["DeviceDefinition"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IConnection_ImportPresetResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Connection_ImportPreset"] = IResolversParentTypes["Connection_ImportPreset"]
> = {
	edges?: Resolver<Array<IResolversTypes["Edge_ImportPreset"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IEdge_ImportPresetResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Edge_ImportPreset"] = IResolversParentTypes["Edge_ImportPreset"]
> = {
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	node?: Resolver<IResolversTypes["ImportPreset"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type INameCompositionQueryResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["NameCompositionQuery"] = IResolversParentTypes["NameCompositionQuery"]
> = {
	variables?: Resolver<
		IResolversTypes["Connection_NameCompositionVariable"],
		ParentType,
		ContextType
	>;
	composition?: Resolver<IResolversTypes["Connection_NameComposition"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IConnection_NameCompositionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Connection_NameComposition"] = IResolversParentTypes["Connection_NameComposition"]
> = {
	edges?: Resolver<Array<IResolversTypes["Edge_NameComposition"]>, ParentType, ContextType>;
	pageInfo?: Resolver<IResolversTypes["PageInfo"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IEdge_NameCompositionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Edge_NameComposition"] = IResolversParentTypes["Edge_NameComposition"]
> = {
	cursor?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	node?: Resolver<IResolversTypes["NameComposition"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ICheckNameAvailabilityResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["CheckNameAvailability"] = IResolversParentTypes["CheckNameAvailability"]
> = {
	conflictResolution?: Resolver<IResolversTypes["ConflictResolution"], ParentType, ContextType>;
	isAvailable?: Resolver<IResolversTypes["Boolean"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDataverseResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Dataverse"] = IResolversParentTypes["Dataverse"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	title?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IRepositoryMutationResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["RepositoryMutation"] = IResolversParentTypes["RepositoryMutation"]
> = {
	repository?: Resolver<
		IResolversTypes["RepositoryMutation"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationRepositoryArgs, "id">
	>;
	updateTimeSettings?: Resolver<
		IResolversTypes["CurrentUser"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationUpdateTimeSettingsArgs, "input">
	>;
	toCellArray?: Resolver<
		IResolversTypes["JSONString"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationToCellArrayArgs, "resourceId">
	>;
	toGenericTable?: Resolver<
		IResolversTypes["JSONString"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationToGenericTableArgs, "resourceId">
	>;
	toTabularDataArrayBuffer?: Resolver<
		IResolversTypes["ImportWizardStep3Payload"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationToTabularDataArrayBufferArgs, "resourceId" | "deviceId">
	>;
	importRawResourceRequest?: Resolver<
		IResolversTypes["ImportRawResourceRequestResponse"],
		ParentType,
		ContextType
	>;
	importRawResource?: Resolver<
		IResolversTypes["ID"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationImportRawResourceArgs, "input">
	>;
	importImageResource?: Resolver<
		IResolversTypes["ErrorMessageOr_ResourceImage"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationImportImageResourceArgs, "input">
	>;
	createAndRunImportTransformation?: Resolver<
		IResolversTypes["CreateAndRunImportTransformationResponse"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationCreateAndRunImportTransformationArgs, "input">
	>;
	deleteImportPreset?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteImportPresetArgs, "id">
	>;
	deleteResource?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteResourceArgs, "input">
	>;
	addSample?: Resolver<
		IResolversTypes["AddSamplePayload"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddSampleArgs, "input">
	>;
	addSampleRelation?: Resolver<
		IResolversTypes["AddSampleRelationPayload"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddSampleRelationArgs, "input">
	>;
	addSampleAndSampleRelation?: Resolver<
		IResolversTypes["Sample"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddSampleAndSampleRelationArgs, "input">
	>;
	deleteDevice?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteDeviceArgs, "id">
	>;
	upsertDevice?: Resolver<
		Maybe<IResolversTypes["UpsertMutationPayloadDevice"]>,
		ParentType,
		ContextType,
		Partial<IRepositoryMutationUpsertDeviceArgs>
	>;
	requestShortId?: Resolver<
		IResolversTypes["DeviceOrSampleOrError"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationRequestShortIdArgs, "id">
	>;
	addDeviceDefinition?: Resolver<
		IResolversTypes["DeviceDefinition"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddDeviceDefinitionArgs, "input">
	>;
	editDeviceDefinition?: Resolver<
		IResolversTypes["EditDeviceDefinitionResult"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationEditDeviceDefinitionArgs, "input">
	>;
	deleteDeviceDefinition?: Resolver<
		IResolversTypes["DeleteDeviceDefinitionResult"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteDeviceDefinitionArgs, "id">
	>;
	deleteSetupDescription?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteSetupDescriptionArgs, "input">
	>;
	linkImageWithSetupDescription?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationLinkImageWithSetupDescriptionArgs, "input">
	>;
	updateSetupDescriptionTime?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationUpdateSetupDescriptionTimeArgs, "input">
	>;
	addSetupLabel?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddSetupLabelArgs, "input">
	>;
	deleteSetupLabel?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteSetupLabelArgs, "input">
	>;
	makePrimaryDeviceImage?: Resolver<
		IResolversTypes["HasImageResource"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationMakePrimaryDeviceImageArgs, "input">
	>;
	addDeviceImage?: Resolver<
		IResolversTypes["HasImageResource"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddDeviceImageArgs, "input">
	>;
	deleteDeviceImage?: Resolver<
		IResolversTypes["HasImageResource"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteDeviceImageArgs, "input">
	>;
	removeComponent?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationRemoveComponentArgs, "input">
	>;
	addComponent?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddComponentArgs, "input">
	>;
	editComponent?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationEditComponentArgs, "input">
	>;
	swapComponent?: Resolver<
		IResolversTypes["Device"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationSwapComponentArgs, "input">
	>;
	linkToProject?: Resolver<
		IResolversTypes["LinkToProjectPayload"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationLinkToProjectArgs, "input">
	>;
	removeFromProject?: Resolver<
		IResolversTypes["RemoveFromProjectPayload"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationRemoveFromProjectArgs, "input">
	>;
	addProject?: Resolver<
		IResolversTypes["AddProjectPayload"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddProjectArgs, "input">
	>;
	deleteProject?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteProjectArgs, "id">
	>;
	addManualTransformation?: Resolver<
		IResolversTypes["AddManualTransformationPayload"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddManualTransformationArgs, "input">
	>;
	addEditNote?: Resolver<
		Maybe<IResolversTypes["Note"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationAddEditNoteArgs, "input">
	>;
	deleteNote?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteNoteArgs, "id">
	>;
	upsertImportPreset?: Resolver<
		Maybe<IResolversTypes["UpsertMutationPayload_ImportPreset"]>,
		ParentType,
		ContextType,
		Partial<IRepositoryMutationUpsertImportPresetArgs>
	>;
	upsertNameCompositionVariableVariable?: Resolver<
		Maybe<IResolversTypes["UpsertMutationPayload_NameCompositionVariableVariable"]>,
		ParentType,
		ContextType,
		Partial<IRepositoryMutationUpsertNameCompositionVariableVariableArgs>
	>;
	upsertNameCompositionVariableConstant?: Resolver<
		Maybe<IResolversTypes["UpsertMutationPayload_NameCompositionVariableConstant"]>,
		ParentType,
		ContextType,
		Partial<IRepositoryMutationUpsertNameCompositionVariableConstantArgs>
	>;
	deleteNameCompositionVariable?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteNameCompositionVariableArgs, "id">
	>;
	upsertNameComposition?: Resolver<
		Maybe<IResolversTypes["UpsertMutationPayload_NameCompositionPayload"]>,
		ParentType,
		ContextType,
		Partial<IRepositoryMutationUpsertNameCompositionArgs>
	>;
	deleteNameComposition?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteNameCompositionArgs, "id">
	>;
	upsertSample?: Resolver<
		Maybe<IResolversTypes["UpsertMutationPayload_Sample"]>,
		ParentType,
		ContextType,
		Partial<IRepositoryMutationUpsertSampleArgs>
	>;
	repoConfigSetDefaultDeviceNamingStrategy?: Resolver<
		Array<IResolversTypes["NameComposition"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationRepoConfigSetDefaultDeviceNamingStrategyArgs, "id">
	>;
	repoConfigSetDefaultSampleNamingStrategy?: Resolver<
		Array<IResolversTypes["NameComposition"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationRepoConfigSetDefaultSampleNamingStrategyArgs, "id">
	>;
	publishToDataverse?: Resolver<
		Maybe<IResolversTypes["String"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationPublishToDataverseArgs, "input">
	>;
	searchDataverse?: Resolver<
		Array<IResolversTypes["Dataverse"]>,
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationSearchDataverseArgs, "input">
	>;
	upsertUserDataverseConnection?: Resolver<
		Maybe<IResolversTypes["UpsertMutationPayload_UserDataverseConnection"]>,
		ParentType,
		ContextType,
		Partial<IRepositoryMutationUpsertUserDataverseConnectionArgs>
	>;
	deleteUserDataverseConnection?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IRepositoryMutationDeleteUserDataverseConnectionArgs, "id">
	>;
};

export interface IJsonStringScalarConfig
	extends GraphQLScalarTypeConfig<IResolversTypes["JSONString"], any> {
	name: "JSONString";
}

export type IImportWizardStep3PayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportWizardStep3Payload"] = IResolversParentTypes["ImportWizardStep3Payload"]
> = {
	__resolveType: TypeResolveFn<
		"ImportWizardStep3PayloadSuccess" | "ImportWizardError",
		ParentType,
		ContextType
	>;
};

export type IImportWizardStep3PayloadSuccessResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportWizardStep3PayloadSuccess"] = IResolversParentTypes["ImportWizardStep3PayloadSuccess"]
> = {
	data?: Resolver<IResolversTypes["ImportWizardStep3PayloadData"], ParentType, ContextType>;
	warnings?: Resolver<Maybe<Array<IResolversTypes["String"]>>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IImportWizardStep3PayloadDataResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportWizardStep3PayloadData"] = IResolversParentTypes["ImportWizardStep3PayloadData"]
> = {
	metadata?: Resolver<IResolversTypes["JSONString"], ParentType, ContextType>;
	end?: Resolver<IResolversTypes["DateTime"], ParentType, ContextType>;
	begin?: Resolver<IResolversTypes["DateTime"], ParentType, ContextType>;
	tabularData?: Resolver<Array<Array<IResolversTypes["String"]>>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IImportWizardErrorResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportWizardError"] = IResolversParentTypes["ImportWizardError"]
> = {
	errors?: Resolver<Array<IResolversTypes["String"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IImportRawResourceRequestResponseResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportRawResourceRequestResponse"] = IResolversParentTypes["ImportRawResourceRequestResponse"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	url?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IErrorMessageOr_ResourceImageResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ErrorMessageOr_ResourceImage"] = IResolversParentTypes["ErrorMessageOr_ResourceImage"]
> = {
	data?: Resolver<Maybe<IResolversTypes["ResourceImage"]>, ParentType, ContextType>;
	error?: Resolver<Maybe<IResolversTypes["ErrorMessage"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IErrorMessageResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ErrorMessage"] = IResolversParentTypes["ErrorMessage"]
> = {
	message?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ICreateAndRunImportTransformationResponseResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["CreateAndRunImportTransformationResponse"] = IResolversParentTypes["CreateAndRunImportTransformationResponse"]
> = {
	importTaskId?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IAddSamplePayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["AddSamplePayload"] = IResolversParentTypes["AddSamplePayload"]
> = {
	appendedEdge?: Resolver<IResolversTypes["SampleEdge"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IAddSampleRelationPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["AddSampleRelationPayload"] = IResolversParentTypes["AddSampleRelationPayload"]
> = {
	sample1?: Resolver<Maybe<IResolversTypes["Sample"]>, ParentType, ContextType>;
	sample2?: Resolver<Maybe<IResolversTypes["Sample"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUpsertMutationPayloadDeviceResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UpsertMutationPayloadDevice"] = IResolversParentTypes["UpsertMutationPayloadDevice"]
> = {
	edit?: Resolver<Maybe<IResolversTypes["Device"]>, ParentType, ContextType>;
	add?: Resolver<Maybe<IResolversTypes["AddDevicePayload"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IAddDevicePayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["AddDevicePayload"] = IResolversParentTypes["AddDevicePayload"]
> = {
	appendedEdge?: Resolver<IResolversTypes["DeviceEdge"], ParentType, ContextType>;
	appendedEdgeHierarchical?: Resolver<
		IResolversTypes["HierarchicalDeviceListEdge"],
		ParentType,
		ContextType
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDeviceOrSampleOrErrorResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeviceOrSampleOrError"] = IResolversParentTypes["DeviceOrSampleOrError"]
> = {
	__resolveType: TypeResolveFn<"Device" | "Sample" | "Error", ParentType, ContextType>;
};

export type IErrorResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["Error"] = IResolversParentTypes["Error"]
> = {
	message?: Resolver<IResolversTypes["String"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IEditDeviceDefinitionResultResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["EditDeviceDefinitionResult"] = IResolversParentTypes["EditDeviceDefinitionResult"]
> = {
	__resolveType: TypeResolveFn<"DeviceDefinition" | "Error", ParentType, ContextType>;
};

export type IDeleteDeviceDefinitionResultResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DeleteDeviceDefinitionResult"] = IResolversParentTypes["DeleteDeviceDefinitionResult"]
> = {
	__resolveType: TypeResolveFn<"DeletedNode" | "Error", ParentType, ContextType>;
};

export type ILinkToProjectPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["LinkToProjectPayload"] = IResolversParentTypes["LinkToProjectPayload"]
> = {
	node?: Resolver<IResolversTypes["Project"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IRemoveFromProjectPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["RemoveFromProjectPayload"] = IResolversParentTypes["RemoveFromProjectPayload"]
> = {
	deletedProjectId?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IAddProjectPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["AddProjectPayload"] = IResolversParentTypes["AddProjectPayload"]
> = {
	node?: Resolver<IResolversTypes["Project"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IAddManualTransformationPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["AddManualTransformationPayload"] = IResolversParentTypes["AddManualTransformationPayload"]
> = {
	source?: Resolver<IResolversTypes["Resource"], ParentType, ContextType>;
	target?: Resolver<IResolversTypes["ResourceGeneric"], ParentType, ContextType>;
	addEditNote?: Resolver<
		Maybe<IResolversTypes["Note"]>,
		ParentType,
		ContextType,
		RequireFields<IAddManualTransformationPayloadAddEditNoteArgs, "input">
	>;
	deleteNote?: Resolver<
		IResolversTypes["DeletedNode"],
		ParentType,
		ContextType,
		RequireFields<IAddManualTransformationPayloadDeleteNoteArgs, "id">
	>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUpsertMutationPayload_ImportPresetResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UpsertMutationPayload_ImportPreset"] = IResolversParentTypes["UpsertMutationPayload_ImportPreset"]
> = {
	node?: Resolver<IResolversTypes["ImportPreset"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUpsertMutationPayload_NameCompositionVariableVariableResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UpsertMutationPayload_NameCompositionVariableVariable"] = IResolversParentTypes["UpsertMutationPayload_NameCompositionVariableVariable"]
> = {
	node?: Resolver<IResolversTypes["NameCompositionVariableVariable"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUpsertMutationPayload_NameCompositionVariableConstantResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UpsertMutationPayload_NameCompositionVariableConstant"] = IResolversParentTypes["UpsertMutationPayload_NameCompositionVariableConstant"]
> = {
	node?: Resolver<IResolversTypes["NameCompositionVariableConstant"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUpsertMutationPayload_NameCompositionPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UpsertMutationPayload_NameCompositionPayload"] = IResolversParentTypes["UpsertMutationPayload_NameCompositionPayload"]
> = {
	node?: Resolver<IResolversTypes["NameCompositionPayload"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type INameCompositionPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["NameCompositionPayload"] = IResolversParentTypes["NameCompositionPayload"]
> = {
	node?: Resolver<IResolversTypes["NameComposition"], ParentType, ContextType>;
	query?: Resolver<IResolversTypes["NameCompositionQuery"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUpsertMutationPayload_SampleResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UpsertMutationPayload_Sample"] = IResolversParentTypes["UpsertMutationPayload_Sample"]
> = {
	node?: Resolver<IResolversTypes["Sample"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IUpsertMutationPayload_UserDataverseConnectionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["UpsertMutationPayload_UserDataverseConnection"] = IResolversParentTypes["UpsertMutationPayload_UserDataverseConnection"]
> = {
	node?: Resolver<IResolversTypes["UserDataverseConnection"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IRepositorySubscriptionResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["RepositorySubscription"] = IResolversParentTypes["RepositorySubscription"]
> = {
	latestNotification?: SubscriptionResolver<
		IResolversTypes["LatestNotification"],
		"latestNotification",
		ParentType,
		ContextType
	>;
	importTask?: SubscriptionResolver<
		IResolversTypes["ImportTaskResult"],
		"importTask",
		ParentType,
		ContextType
	>;
	downsampleDataBecameReady?: SubscriptionResolver<
		IResolversTypes["DownsampleDataBecameReady"],
		"downsampleDataBecameReady",
		ParentType,
		ContextType
	>;
	sampleAddedOrUpdated?: SubscriptionResolver<
		IResolversTypes["SampleEdge"],
		"sampleAddedOrUpdated",
		ParentType,
		ContextType
	>;
	deviceAddedOrUpdated?: SubscriptionResolver<
		IResolversTypes["DeviceEdge"],
		"deviceAddedOrUpdated",
		ParentType,
		ContextType
	>;
	resourceAddedOrUpdated?: SubscriptionResolver<
		IResolversTypes["ResourceEdge"],
		"resourceAddedOrUpdated",
		ParentType,
		ContextType
	>;
	removedNode?: SubscriptionResolver<
		IResolversTypes["DeletedNodeEdge"],
		"removedNode",
		ParentType,
		ContextType
	>;
};

export type IImportTaskResultResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportTaskResult"] = IResolversParentTypes["ImportTaskResult"]
> = {
	id?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	payload?: Resolver<IResolversTypes["ImportTaskResultPayload"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IImportTaskResultPayloadResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportTaskResultPayload"] = IResolversParentTypes["ImportTaskResultPayload"]
> = {
	__resolveType: TypeResolveFn<
		| "ImportTransformationSuccess"
		| "ImportTransformationWarning"
		| "ImportTransformationError"
		| "ImportTransformationProgress",
		ParentType,
		ContextType
	>;
};

export type IImportTransformationSuccessResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportTransformationSuccess"] = IResolversParentTypes["ImportTransformationSuccess"]
> = {
	ids?: Resolver<Array<Maybe<IResolversTypes["ID"]>>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IImportTransformationWarningResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportTransformationWarning"] = IResolversParentTypes["ImportTransformationWarning"]
> = {
	message?: Resolver<Array<Maybe<IResolversTypes["String"]>>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IImportTransformationErrorResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportTransformationError"] = IResolversParentTypes["ImportTransformationError"]
> = {
	message?: Resolver<Array<Maybe<IResolversTypes["String"]>>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IImportTransformationProgressResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["ImportTransformationProgress"] = IResolversParentTypes["ImportTransformationProgress"]
> = {
	resourceId?: Resolver<Maybe<IResolversTypes["ID"]>, ParentType, ContextType>;
	progress?: Resolver<Maybe<IResolversTypes["Float"]>, ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IDownsampleDataBecameReadyResolvers<
	ContextType = IGraphQLContext,
	ParentType extends IResolversParentTypes["DownsampleDataBecameReady"] = IResolversParentTypes["DownsampleDataBecameReady"]
> = {
	resourceId?: Resolver<IResolversTypes["ID"], ParentType, ContextType>;
	dataPoints?: Resolver<IResolversTypes["Int"], ParentType, ContextType>;
	singleColumn?: Resolver<Maybe<IResolversTypes["Boolean"]>, ParentType, ContextType>;
	resource?: Resolver<IResolversTypes["ResourceTabularData"], ParentType, ContextType>;
	__isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type IResolvers<ContextType = IGraphQLContext> = {
	RepositoryQuery?: IRepositoryQueryResolvers<ContextType>;
	Node?: INodeResolvers<ContextType>;
	Device?: IDeviceResolvers<ContextType>;
	SupportsUsageAsProperty?: ISupportsUsageAsPropertyResolvers<ContextType>;
	Sample?: ISampleResolvers<ContextType>;
	SupportsNotes?: ISupportsNotesResolvers<ContextType>;
	NoteConnection?: INoteConnectionResolvers<ContextType>;
	Connection?: IConnectionResolvers<ContextType>;
	ProjectConnection?: IProjectConnectionResolvers<ContextType>;
	ProjectEdge?: IProjectEdgeResolvers<ContextType>;
	Edge?: IEdgeResolvers<ContextType>;
	DeletedNodeEdge?: IDeletedNodeEdgeResolvers<ContextType>;
	DeletedNode?: IDeletedNodeResolvers<ContextType>;
	HierarchicalDeviceListEdge?: IHierarchicalDeviceListEdgeResolvers<ContextType>;
	HierarchicalDeviceListEntry?: IHierarchicalDeviceListEntryResolvers<ContextType>;
	ComponentWithPathAndTime?: IComponentWithPathAndTimeResolvers<ContextType>;
	PropertyValue?: IPropertyValueResolvers<ContextType>;
	DateTime?: GraphQLScalarType;
	RowEdge?: IRowEdgeResolvers<ContextType>;
	Row?: IRowResolvers<ContextType>;
	DeviceEdge?: IDeviceEdgeResolvers<ContextType>;
	ResourceEdge?: IResourceEdgeResolvers<ContextType>;
	Resource?: IResourceResolvers<ContextType>;
	ResourceTimed?: IResourceTimedResolvers<ContextType>;
	ResourceGeneric?: IResourceGenericResolvers<ContextType>;
	HasProjects?: IHasProjectsResolvers<ContextType>;
	ResourceTabularData?: IResourceTabularDataResolvers<ContextType>;
	HasMetadata?: IHasMetadataResolvers<ContextType>;
	Project?: IProjectResolvers<ContextType>;
	Metadata?: IMetadataResolvers<ContextType>;
	User?: IUserResolvers<ContextType>;
	DeviceConnection?: IDeviceConnectionResolvers<ContextType>;
	PageInfo?: IPageInfoResolvers<ContextType>;
	PageCursors?: IPageCursorsResolvers<ContextType>;
	PageCursor?: IPageCursorResolvers<ContextType>;
	ResourceConnection?: IResourceConnectionResolvers<ContextType>;
	SampleConnection?: ISampleConnectionResolvers<ContextType>;
	SampleEdge?: ISampleEdgeResolvers<ContextType>;
	OriginRepoMetadata?: IOriginRepoMetadataResolvers<ContextType>;
	RemoteRepo?: IRemoteRepoResolvers<ContextType>;
	DeviceDefinition?: IDeviceDefinitionResolvers<ContextType>;
	HasImageResource?: IHasImageResourceResolvers<ContextType>;
	ResourceImage?: IResourceImageResolvers<ContextType>;
	ResourceType?: GraphQLScalarType;
	PropertyDefinition?: IPropertyDefinitionResolvers<ContextType>;
	Specification?: ISpecificationResolvers<ContextType>;
	DeviceDefinitionGraphElement?: IDeviceDefinitionGraphElementResolvers<ContextType>;
	DeviceOrDefinition?: IDeviceOrDefinitionResolvers<ContextType>;
	ImportPreset?: IImportPresetResolvers<ContextType>;
	IBaseNote?: IIBaseNoteResolvers<ContextType>;
	BaseNote?: IBaseNoteResolvers<ContextType>;
	Note?: INoteResolvers<ContextType>;
	ColumnDescription?: IColumnDescriptionResolvers<ContextType>;
	ColumnType?: GraphQLScalarType;
	RowConnection?: IRowConnectionResolvers<ContextType>;
	Data?: IDataResolvers<ContextType>;
	DataSeries?: IDataSeriesResolvers<ContextType>;
	UserEdge?: IUserEdgeResolvers<ContextType>;
	NoteEdge?: INoteEdgeResolvers<ContextType>;
	HierarchicalDeviceListConnection?: IHierarchicalDeviceListConnectionResolvers<ContextType>;
	UserConnection?: IUserConnectionResolvers<ContextType>;
	Property?: IPropertyResolvers<ContextType>;
	SampleRelation?: ISampleRelationResolvers<ContextType>;
	TopLevelDevice?: ITopLevelDeviceResolvers<ContextType>;
	SpecificationsGraphElement?: ISpecificationsGraphElementResolvers<ContextType>;
	SetupDescription?: ISetupDescriptionResolvers<ContextType>;
	SetupLabel?: ISetupLabelResolvers<ContextType>;
	SampleUsage?: ISampleUsageResolvers<ContextType>;
	TimeFrame?: ITimeFrameResolvers<ContextType>;
	IdentifiedPayload?: IIdentifiedPayloadResolvers<ContextType>;
	LatestNotification?: ILatestNotificationResolvers<ContextType>;
	LatestNotificationPayload?: ILatestNotificationPayloadResolvers<ContextType>;
	Notification?: INotificationResolvers<ContextType>;
	CurrentUser?: ICurrentUserResolvers<ContextType>;
	CurrentUserCore?: ICurrentUserCoreResolvers<ContextType>;
	DateOptions?: IDateOptionsResolvers<ContextType>;
	Connection_UserDataverseConnection?: IConnection_UserDataverseConnectionResolvers<ContextType>;
	Edge_UserDataverseConnection?: IEdge_UserDataverseConnectionResolvers<ContextType>;
	UserDataverseConnection?: IUserDataverseConnectionResolvers<ContextType>;
	NameComposition?: INameCompositionResolvers<ContextType>;
	Connection_NameCompositionVariable?: IConnection_NameCompositionVariableResolvers<ContextType>;
	Edge_NameCompositionVariable?: IEdge_NameCompositionVariableResolvers<ContextType>;
	NameCompositionVariable?: INameCompositionVariableResolvers<ContextType>;
	NameCompositionVariableConstant?: INameCompositionVariableConstantResolvers<ContextType>;
	NameCompositionVariableVariable?: INameCompositionVariableVariableResolvers<ContextType>;
	MonitoredJobsStatus?: IMonitoredJobsStatusResolvers<ContextType>;
	Transformation?: ITransformationResolvers<ContextType>;
	SearchResults?: ISearchResultsResolvers<ContextType>;
	SearchResult?: ISearchResultResolvers<ContextType>;
	Connection_DeviceDefinition?: IConnection_DeviceDefinitionResolvers<ContextType>;
	Edge_DeviceDefinition?: IEdge_DeviceDefinitionResolvers<ContextType>;
	Connection_ImportPreset?: IConnection_ImportPresetResolvers<ContextType>;
	Edge_ImportPreset?: IEdge_ImportPresetResolvers<ContextType>;
	NameCompositionQuery?: INameCompositionQueryResolvers<ContextType>;
	Connection_NameComposition?: IConnection_NameCompositionResolvers<ContextType>;
	Edge_NameComposition?: IEdge_NameCompositionResolvers<ContextType>;
	CheckNameAvailability?: ICheckNameAvailabilityResolvers<ContextType>;
	Dataverse?: IDataverseResolvers<ContextType>;
	RepositoryMutation?: IRepositoryMutationResolvers<ContextType>;
	JSONString?: GraphQLScalarType;
	ImportWizardStep3Payload?: IImportWizardStep3PayloadResolvers<ContextType>;
	ImportWizardStep3PayloadSuccess?: IImportWizardStep3PayloadSuccessResolvers<ContextType>;
	ImportWizardStep3PayloadData?: IImportWizardStep3PayloadDataResolvers<ContextType>;
	ImportWizardError?: IImportWizardErrorResolvers<ContextType>;
	ImportRawResourceRequestResponse?: IImportRawResourceRequestResponseResolvers<ContextType>;
	ErrorMessageOr_ResourceImage?: IErrorMessageOr_ResourceImageResolvers<ContextType>;
	ErrorMessage?: IErrorMessageResolvers<ContextType>;
	CreateAndRunImportTransformationResponse?: ICreateAndRunImportTransformationResponseResolvers<ContextType>;
	AddSamplePayload?: IAddSamplePayloadResolvers<ContextType>;
	AddSampleRelationPayload?: IAddSampleRelationPayloadResolvers<ContextType>;
	UpsertMutationPayloadDevice?: IUpsertMutationPayloadDeviceResolvers<ContextType>;
	AddDevicePayload?: IAddDevicePayloadResolvers<ContextType>;
	DeviceOrSampleOrError?: IDeviceOrSampleOrErrorResolvers<ContextType>;
	Error?: IErrorResolvers<ContextType>;
	EditDeviceDefinitionResult?: IEditDeviceDefinitionResultResolvers<ContextType>;
	DeleteDeviceDefinitionResult?: IDeleteDeviceDefinitionResultResolvers<ContextType>;
	LinkToProjectPayload?: ILinkToProjectPayloadResolvers<ContextType>;
	RemoveFromProjectPayload?: IRemoveFromProjectPayloadResolvers<ContextType>;
	AddProjectPayload?: IAddProjectPayloadResolvers<ContextType>;
	AddManualTransformationPayload?: IAddManualTransformationPayloadResolvers<ContextType>;
	UpsertMutationPayload_ImportPreset?: IUpsertMutationPayload_ImportPresetResolvers<ContextType>;
	UpsertMutationPayload_NameCompositionVariableVariable?: IUpsertMutationPayload_NameCompositionVariableVariableResolvers<ContextType>;
	UpsertMutationPayload_NameCompositionVariableConstant?: IUpsertMutationPayload_NameCompositionVariableConstantResolvers<ContextType>;
	UpsertMutationPayload_NameCompositionPayload?: IUpsertMutationPayload_NameCompositionPayloadResolvers<ContextType>;
	NameCompositionPayload?: INameCompositionPayloadResolvers<ContextType>;
	UpsertMutationPayload_Sample?: IUpsertMutationPayload_SampleResolvers<ContextType>;
	UpsertMutationPayload_UserDataverseConnection?: IUpsertMutationPayload_UserDataverseConnectionResolvers<ContextType>;
	RepositorySubscription?: IRepositorySubscriptionResolvers<ContextType>;
	ImportTaskResult?: IImportTaskResultResolvers<ContextType>;
	ImportTaskResultPayload?: IImportTaskResultPayloadResolvers<ContextType>;
	ImportTransformationSuccess?: IImportTransformationSuccessResolvers<ContextType>;
	ImportTransformationWarning?: IImportTransformationWarningResolvers<ContextType>;
	ImportTransformationError?: IImportTransformationErrorResolvers<ContextType>;
	ImportTransformationProgress?: IImportTransformationProgressResolvers<ContextType>;
	DownsampleDataBecameReady?: IDownsampleDataBecameReadyResolvers<ContextType>;
};
