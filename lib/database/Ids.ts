import type { Opaque } from "type-fest";

export type IDeviceDefinitionId = Opaque<string, "DEVICE_DEFINITION">;
export type IDeviceId = Opaque<string, "DEVICE">;
export type IIdPoolId = Opaque<string, "ID_POOL">;
export type IImportPresetId = Opaque<string, "IMPORT_PRESET">;
export type INameCompositionId = Opaque<string, "NAME_COMPOSITION">;
export type INameCompositionVariableId = Opaque<string, "NAME_COMPOSITION_VARIABLE">;
export type INoteId = Opaque<string, "NOTE">;
export type IProjectId = Opaque<string, "PROJECT">;
export type IPropertyId = Opaque<string, "PROPERTY">;
export type IRepositorySettingId = Opaque<string, "REPOSITORY_SETTING">;
export type IResourceId = Opaque<string, "RESOURCE">;
export type ISampleId = Opaque<string, "SAMPLE">;
export type ISampleRelationId = Opaque<string, "SAMPLE_RELATION">;
export type ITransformationId = Opaque<string, "TRANSFORMATION">;
export type IUserId = Opaque<string, "USER">;

/**
 * Maps the GraphQL __typename to their respective ID types.
 * Note: This is only required for types that are not part of CouchDB or types that are named
 * differently than the "type" field of the CouchDB document.
 */
export interface IIdTypeMap {
	// Register types from auth-server (prisma)
	User: IUserId;
	RemoteRepo: IRepositorySettingId;

	// Register alias types from auth-server
	AuthenticatedUser: IUserId;

	// Register types from repo-server (MikroORM)
	Note: INoteId;

	// Register alias types from repo-server
	ResourceGeneric: IResourceId;
	ResourceImage: IResourceId;
	ResourceImportPreset: IResourceId;
	ResourceTabularData: IResourceId;

	// Register MikroORM types
	NameComposition: INameCompositionId;
	NameCompositionVariable: INameCompositionVariableId;
	NameCompositionVariableStatic: INameCompositionVariableId;
	NameCompositionVariableVariable: INameCompositionVariableId;
}
