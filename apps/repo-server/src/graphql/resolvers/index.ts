import { CurrentUser } from "./CurrentUser";
import { Device } from "./Device";
import { DeviceDefinition } from "./DeviceDefinition";
import { EditDeviceDefinitionResult } from "./EditDeviceDefinitionResult";
import { HasImageResource } from "./HasImageResource";
import { HasProjects } from "./HasProjects";
import { ImportPreset } from "./ImportPreset";
import { NameComposition } from "./NameComposition";
import { NameCompositionQuery } from "./NameCompositionQuery";
import { NameCompositionVariable } from "./NameCompositionVariable";
import { NameCompositionVariableConstant } from "./NameCompositionVariableConstant";
import { NameCompositionVariableVariable } from "./NameCompositionVariableVariable";
import { Node } from "./Node";
import { Note } from "./Note";
import { Project } from "./Project";
import { Property } from "./Property";
import { PropertyValue } from "./PropertyValue";
import { RepositoryMutation } from "./RepositoryMutation";
import { RepositoryQuery } from "./RepositoryQuery";
import { RepositorySubscription } from "./RepositorySubscription";
import { Resource } from "./Resource";
import { ResourceGeneric } from "./ResourceGeneric";
import { ResourceImage } from "./ResourceImage";
import { ResourceTabularData } from "./ResourceTabularData";
import { ResourceTimed } from "./ResourceTimed";
import { Sample } from "./Sample";
import { SearchResults } from "./SearchResults";
import { User } from "./User";
import type { IResolvers } from "../generated/resolvers";

export const resolvers: IResolvers = {
	RepositoryQuery,
	RepositoryMutation,
	RepositorySubscription,
	NameCompositionQuery,
	//
	HasImageResource,
	HasProjects,
	EditDeviceDefinitionResult,
	NameCompositionVariable,
	//
	CurrentUser,
	Device,
	DeviceDefinition,
	NameComposition,
	NameCompositionVariableVariable,
	NameCompositionVariableConstant,
	Node,
	Note,
	Project,
	Property,
	PropertyValue,
	Resource,
	ResourceGeneric,
	ResourceTimed,
	ResourceTabularData,
	ResourceImage,
	ImportPreset,
	Sample,
	SearchResults,
	User,
};
