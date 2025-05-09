// @generated
import type { GraphQLClient, RequestOptions } from "graphql-request";
import gql from "graphql-tag";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
type GraphQLClientRequestHeaders = RequestOptions["requestHeaders"];
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
	 * Gather basic information about the file to be imported.
	 * Does not require additional user input
	 */
	gamryToStep1: IErrorMessageOr_GamryMetadataStep1;
	/**
	 * Gather more detailed information about the file to be imported (including information about
	 * date + time if possible)
	 */
	gamryToStep2: IErrorMessageOr_GamryMetadataStep2;
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
	type?: InputMaybe<IImportTransformationType>;
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

export type IRepositoryQueryGamryToStep1Args = {
	resourceId: Scalars["ID"];
};

export type IRepositoryQueryGamryToStep2Args = {
	resourceId: Scalars["ID"];
	timezone: Scalars["String"];
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
		rawFileMetadata: IResourceMetadata;
	};

export type IResourceGenericProjectsArgs = {
	first?: InputMaybe<Scalars["Int"]>;
	after?: InputMaybe<Scalars["String"]>;
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
		type: IImportTransformationType;
		metadata: IMetadata;
		devices: Array<IDevice>;
		displayName?: Maybe<Scalars["String"]>;
		presetJSON: Scalars["String"];
		columns: Array<Scalars["String"]>;
	};

export enum IImportTransformationType {
	Csv = "CSV",
	Gamry = "GAMRY",
}

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

export type IResourceMetadata = {
	__typename?: "ResourceMetadata";
	type?: Maybe<Scalars["String"]>;
	preview: Scalars["String"];
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
};

export type IDateOptions = {
	__typename?: "DateOptions";
	locale: Scalars["String"];
	dateStyle: Scalars["String"];
	timeStyle: Scalars["String"];
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

export type IErrorMessageOr_GamryMetadataStep1 = {
	__typename?: "ErrorMessageOr_GamryMetadataStep1";
	data?: Maybe<IGamryMetadataStep1>;
	error?: Maybe<IErrorMessage>;
};

export type IGamryMetadataStep1 = {
	__typename?: "GamryMetadataStep1";
	tableHeaders: Array<Scalars["String"]>;
	units: Array<Scalars["String"]>;
	/**
	 * If the file contains a start time + T/Time column the time can be calculated without further
	 * user input.
	 */
	absoluteTimeInFile: Scalars["Boolean"];
};

export type IErrorMessage = {
	__typename?: "ErrorMessage";
	message: Scalars["String"];
};

export type IErrorMessageOr_GamryMetadataStep2 = {
	__typename?: "ErrorMessageOr_GamryMetadataStep2";
	data?: Maybe<IGamryMetadataStep2>;
	error?: Maybe<IErrorMessage>;
};

export type IGamryMetadataStep2 = {
	__typename?: "GamryMetadataStep2";
	tables: Array<IGamryTableExtended>;
	absoluteTime?: Maybe<IGamryTime>;
};

export type IGamryTableExtended = {
	__typename?: "GamryTableExtended";
	headers: Array<Scalars["String"]>;
	units: Array<Scalars["String"]>;
	min: Array<Maybe<Scalars["Float"]>>;
	max: Array<Maybe<Scalars["Float"]>>;
};

export type IGamryTime = {
	__typename?: "GamryTime";
	begin: Scalars["DateTime"];
	end: Scalars["DateTime"];
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

export type ICreateAndRunImportTransformationInput = {
	type: IImportTransformationType;
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
	presetType: IImportTransformationType;
	deviceId: Array<Scalars["ID"]>;
	name: Scalars["String"];
	presetJson: Scalars["String"];
};

export type IUpdate_ImportPresetInput = {
	id: Scalars["ID"];
	input: IPartial_ImportPresetInput;
};

export type IPartial_ImportPresetInput = {
	presetType?: InputMaybe<IImportTransformationType>;
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

export type IAddDeviceDefinitionMutationVariables = Exact<{
	input: IAddDeviceDefinitionInput;
}>;

export type IAddDeviceDefinitionMutation = {
	__typename?: "RepositoryMutation";
	addDeviceDefinition: { __typename?: "DeviceDefinition"; id: string };
};

export type IAddDeviceMutationVariables = Exact<{
	input: IInsert_DeviceInput;
}>;

export type IAddDeviceMutation = {
	__typename?: "RepositoryMutation";
	upsertDevice?: {
		__typename?: "UpsertMutationPayloadDevice";
		add?: {
			__typename?: "AddDevicePayload";
			appendedEdge: {
				__typename?: "DeviceEdge";
				node: { __typename?: "Device"; id: string; name: string };
			};
		} | null;
	} | null;
};

export type IAddComponentMutationVariables = Exact<{
	input: IAddComponentInput;
}>;

export type IAddComponentMutation = {
	__typename?: "RepositoryMutation";
	addComponent: { __typename: "Device" };
};

export type IAddDeviceImageMutationVariables = Exact<{
	input: IAddDeviceImageInput;
}>;

export type IAddDeviceImageMutation = {
	__typename?: "RepositoryMutation";
	addDeviceImage: { __typename: "Device" } | { __typename: "DeviceDefinition" };
};

export type IImportRawResourceRequestMutationVariables = Exact<{ [key: string]: never }>;

export type IImportRawResourceRequestMutation = {
	__typename?: "RepositoryMutation";
	importRawResourceRequest: {
		__typename?: "ImportRawResourceRequestResponse";
		id: string;
		url: string;
	};
};

export type IImportRawResourceMutationVariables = Exact<{
	input: IImportRawResourceInput;
}>;

export type IImportRawResourceMutation = {
	__typename?: "RepositoryMutation";
	importRawResource: string;
};

export type IImportImageResourceMutationVariables = Exact<{
	input: IImportImageResourceInput;
}>;

export type IImportImageResourceMutation = {
	__typename?: "RepositoryMutation";
	importImageResource: {
		__typename?: "ErrorMessageOr_ResourceImage";
		data?: { __typename?: "ResourceImage"; id: string } | null;
		error?: { __typename?: "ErrorMessage"; message: string } | null;
	};
};

export type ICreateAndRunImportTransformationMutationVariables = Exact<{
	input: ICreateAndRunImportTransformationInput;
}>;

export type ICreateAndRunImportTransformationMutation = {
	__typename?: "RepositoryMutation";
	createAndRunImportTransformation: {
		__typename: "CreateAndRunImportTransformationResponse";
		importTaskId: string;
	};
};

export type IImportTaskSubscriptionVariables = Exact<{ [key: string]: never }>;

export type IImportTaskSubscription = {
	__typename?: "RepositorySubscription";
	importTask: {
		__typename?: "ImportTaskResult";
		id: string;
		payload:
			| { __typename: "ImportTransformationSuccess"; ids: Array<string | null> }
			| { __typename: "ImportTransformationWarning" }
			| { __typename: "ImportTransformationError"; message: Array<string | null> }
			| { __typename: "ImportTransformationProgress"; progress?: number | null };
	};
};

export type IAddProjectMutationVariables = Exact<{
	input: IAddProjectInput;
}>;

export type IAddProjectMutation = {
	__typename?: "RepositoryMutation";
	addProject: { __typename?: "AddProjectPayload"; node: { __typename?: "Project"; id: string } };
};

export type ILinkProjectMutationVariables = Exact<{
	input: ILinkToProjectInput;
}>;

export type ILinkProjectMutation = {
	__typename?: "RepositoryMutation";
	linkToProject: { __typename: "LinkToProjectPayload" };
};

export type IAddSampleMutationVariables = Exact<{
	input: IAddSampleInput;
}>;

export type IAddSampleMutation = {
	__typename?: "RepositoryMutation";
	addSample: {
		__typename?: "AddSamplePayload";
		appendedEdge: { __typename?: "SampleEdge"; node: { __typename?: "Sample"; id: string } };
	};
};

export type ILinkImageWithSetupDescriptionMutationVariables = Exact<{
	input: ILinkImageWithSetupDescriptionInput;
}>;

export type ILinkImageWithSetupDescriptionMutation = {
	__typename?: "RepositoryMutation";
	linkImageWithSetupDescription: { __typename: "Device" };
};

export type IAddSetupLabelMutationVariables = Exact<{
	input: IAddSetupLabelInput;
}>;

export type IAddSetupLabelMutation = {
	__typename?: "RepositoryMutation";
	addSetupLabel: { __typename: "Device" };
};

export const AddDeviceDefinitionDocument = gql`
	mutation AddDeviceDefinition($input: AddDeviceDefinitionInput!) {
		addDeviceDefinition(input: $input) {
			id
		}
	}
`;
export const AddDeviceDocument = gql`
	mutation AddDevice($input: Insert_DeviceInput!) {
		upsertDevice(insert: $input) {
			add {
				appendedEdge {
					node {
						id
						name
					}
				}
			}
		}
	}
`;
export const AddComponentDocument = gql`
	mutation AddComponent($input: AddComponentInput!) {
		addComponent(input: $input) {
			__typename
		}
	}
`;
export const AddDeviceImageDocument = gql`
	mutation AddDeviceImage($input: AddDeviceImageInput!) {
		addDeviceImage(input: $input) {
			__typename
		}
	}
`;
export const ImportRawResourceRequestDocument = gql`
	mutation ImportRawResourceRequest {
		importRawResourceRequest {
			id
			url
		}
	}
`;
export const ImportRawResourceDocument = gql`
	mutation ImportRawResource($input: ImportRawResourceInput!) {
		importRawResource(input: $input)
	}
`;
export const ImportImageResourceDocument = gql`
	mutation ImportImageResource($input: ImportImageResourceInput!) {
		importImageResource(input: $input) {
			data {
				id
			}
			error {
				message
			}
		}
	}
`;
export const CreateAndRunImportTransformationDocument = gql`
	mutation CreateAndRunImportTransformation($input: CreateAndRunImportTransformationInput!) {
		createAndRunImportTransformation(input: $input) {
			__typename
			importTaskId
		}
	}
`;
export const ImportTaskDocument = gql`
	subscription ImportTask {
		importTask {
			id
			payload {
				__typename
				... on ImportTransformationError {
					message
				}
				... on ImportTransformationProgress {
					progress
				}
				... on ImportTransformationSuccess {
					ids
				}
			}
		}
	}
`;
export const AddProjectDocument = gql`
	mutation AddProject($input: AddProjectInput!) {
		addProject(input: $input) {
			node {
				id
			}
		}
	}
`;
export const LinkProjectDocument = gql`
	mutation LinkProject($input: LinkToProjectInput!) {
		linkToProject(input: $input) {
			__typename
		}
	}
`;
export const AddSampleDocument = gql`
	mutation AddSample($input: AddSampleInput!) {
		addSample(input: $input) {
			appendedEdge {
				node {
					id
				}
			}
		}
	}
`;
export const LinkImageWithSetupDescriptionDocument = gql`
	mutation LinkImageWithSetupDescription($input: LinkImageWithSetupDescriptionInput!) {
		linkImageWithSetupDescription(input: $input) {
			__typename
		}
	}
`;
export const AddSetupLabelDocument = gql`
	mutation AddSetupLabel($input: AddSetupLabelInput!) {
		addSetupLabel(input: $input) {
			__typename
		}
	}
`;

export type SdkFunctionWrapper = <T>(
	action: (requestHeaders?: Record<string, string>) => Promise<T>,
	operationName: string,
	operationType?: string,
	variables?: any
) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) =>
	action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
	return {
		AddDeviceDefinition(
			variables: IAddDeviceDefinitionMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IAddDeviceDefinitionMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IAddDeviceDefinitionMutation>(AddDeviceDefinitionDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"AddDeviceDefinition",
				"mutation",
				variables
			);
		},
		AddDevice(
			variables: IAddDeviceMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IAddDeviceMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IAddDeviceMutation>(AddDeviceDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"AddDevice",
				"mutation",
				variables
			);
		},
		AddComponent(
			variables: IAddComponentMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IAddComponentMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IAddComponentMutation>(AddComponentDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"AddComponent",
				"mutation",
				variables
			);
		},
		AddDeviceImage(
			variables: IAddDeviceImageMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IAddDeviceImageMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IAddDeviceImageMutation>(AddDeviceImageDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"AddDeviceImage",
				"mutation",
				variables
			);
		},
		ImportRawResourceRequest(
			variables?: IImportRawResourceRequestMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IImportRawResourceRequestMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IImportRawResourceRequestMutation>(
						ImportRawResourceRequestDocument,
						variables,
						{ ...requestHeaders, ...wrappedRequestHeaders }
					),
				"ImportRawResourceRequest",
				"mutation",
				variables
			);
		},
		ImportRawResource(
			variables: IImportRawResourceMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IImportRawResourceMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IImportRawResourceMutation>(ImportRawResourceDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"ImportRawResource",
				"mutation",
				variables
			);
		},
		ImportImageResource(
			variables: IImportImageResourceMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IImportImageResourceMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IImportImageResourceMutation>(ImportImageResourceDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"ImportImageResource",
				"mutation",
				variables
			);
		},
		CreateAndRunImportTransformation(
			variables: ICreateAndRunImportTransformationMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<ICreateAndRunImportTransformationMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<ICreateAndRunImportTransformationMutation>(
						CreateAndRunImportTransformationDocument,
						variables,
						{ ...requestHeaders, ...wrappedRequestHeaders }
					),
				"CreateAndRunImportTransformation",
				"mutation",
				variables
			);
		},
		ImportTask(
			variables?: IImportTaskSubscriptionVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IImportTaskSubscription> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IImportTaskSubscription>(ImportTaskDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"ImportTask",
				"subscription",
				variables
			);
		},
		AddProject(
			variables: IAddProjectMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IAddProjectMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IAddProjectMutation>(AddProjectDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"AddProject",
				"mutation",
				variables
			);
		},
		LinkProject(
			variables: ILinkProjectMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<ILinkProjectMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<ILinkProjectMutation>(LinkProjectDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"LinkProject",
				"mutation",
				variables
			);
		},
		AddSample(
			variables: IAddSampleMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IAddSampleMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IAddSampleMutation>(AddSampleDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"AddSample",
				"mutation",
				variables
			);
		},
		LinkImageWithSetupDescription(
			variables: ILinkImageWithSetupDescriptionMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<ILinkImageWithSetupDescriptionMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<ILinkImageWithSetupDescriptionMutation>(
						LinkImageWithSetupDescriptionDocument,
						variables,
						{ ...requestHeaders, ...wrappedRequestHeaders }
					),
				"LinkImageWithSetupDescription",
				"mutation",
				variables
			);
		},
		AddSetupLabel(
			variables: IAddSetupLabelMutationVariables,
			requestHeaders?: GraphQLClientRequestHeaders
		): Promise<IAddSetupLabelMutation> {
			return withWrapper(
				(wrappedRequestHeaders) =>
					client.request<IAddSetupLabelMutation>(AddSetupLabelDocument, variables, {
						...requestHeaders,
						...wrappedRequestHeaders,
					}),
				"AddSetupLabel",
				"mutation",
				variables
			);
		},
	};
}
export type Sdk = ReturnType<typeof getSdk>;
