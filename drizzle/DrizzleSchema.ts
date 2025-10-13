import type { PgSchema } from "drizzle-orm/pg-core";
import { pgSchema } from "drizzle-orm/pg-core";

import { User } from "./schema/global.User";
import { Device } from "./schema/repo.Device";
import { DeviceDefinition } from "./schema/repo.DeviceDefinition";
import { DeviceDefinitionPaths } from "./schema/repo.DeviceDefinitionPaths";
import { IdPool } from "./schema/repo.IdPool";
import { ImportPreset } from "./schema/repo.ImportPreset";
import { NameComposition } from "./schema/repo.NameComposition";
import { NameCompositionVariable } from "./schema/repo.NameCompositionVariable";
import { NameCompositionVariableUsage } from "./schema/repo.NameCompositionVariableUsage";
import { Note } from "./schema/repo.Note";
import { Project } from "./schema/repo.Project";
import { ProjectToDevice } from "./schema/repo.ProjectToDevice";
import { ProjectToResource } from "./schema/repo.ProjectToResource";
import { ProjectToSample } from "./schema/repo.ProjectToSample";
import { Property } from "./schema/repo.Property";
import { RepositoryConfigEntry } from "./schema/repo.RepositoryConfigEntry";
import { Resource } from "./schema/repo.Resource";
import { Sample } from "./schema/repo.Sample";
import { SampleToSample } from "./schema/repo.SampleToSample";
import {
	DeviceDefinitionSpecification,
	DeviceSpecification,
	SampleSpecification,
} from "./schema/repo.Specification";
import { Transformation } from "./schema/repo.Transformation";

import { UserDataverseConnection } from "~/drizzle/schema/global.UserDataverseConnection";
import { UserRepository } from "~/drizzle/schema/global.UserRepository";

export class DrizzleGlobalSchema {
	public global = pgSchema("adacta_global");
	public User = User(this);
	public UserRepository = UserRepository(this);
	public UserDataverseConnection = UserDataverseConnection(this);
}

export class DrizzleSchema extends DrizzleGlobalSchema {
	public static fromSchemaName(schemaName: string): DrizzleSchema {
		return new DrizzleSchema(pgSchema(schemaName));
	}

	constructor(public repo: PgSchema) {
		super();
	}

	public Device = Device(this);
	public DeviceDefinition = DeviceDefinition(this);
	public IdPool = IdPool(this);
	public ImportPreset = ImportPreset(this);
	public NameComposition = NameComposition(this);
	public NameCompositionVariable = NameCompositionVariable(this);
	public NameCompositionVariableUsage = NameCompositionVariableUsage(this);
	public Note = Note(this);
	public Project = Project(this);
	public ProjectToDevice = ProjectToDevice(this);
	public ProjectToResource = ProjectToResource(this);
	public ProjectToSample = ProjectToSample(this);
	public Property = Property(this);
	public RepositoryConfigEntry = RepositoryConfigEntry(this);
	public Resource = Resource(this);
	public Sample = Sample(this);
	public SampleToSample = SampleToSample(this);
	public Transformation = Transformation(this);
	public DeviceDefinitionPaths = DeviceDefinitionPaths(this);

	public DeviceSpecification = DeviceSpecification(this);
	public DeviceDefinitionSpecification = DeviceDefinitionSpecification(this);
	public SampleSpecification = SampleSpecification(this);
}

/**
 * Some entities have an id that encodes the type of the entity within it. This is particularly useful for GraphQL,
 * so we can deduce the table to query based on the id.
 *
 * This object maps the type id to the entity name.
 */
export const entityByTypeId = {
	0: "Project",
	1: "IdPool",
	2: "NameComposition",
	3: "NameCompositionVariable",
	4: "Sample",
	5: "Resource",
	6: "DeviceDefinition",
	7: "Device",
	8: "Property",
	9: "Note",
	10: "Transformation",
	11: "SampleToSample",
	12: "ImportPreset",

	254: "UserDataverseConnection",
	255: "User",
} as const satisfies Record<number, DrizzleEntityName>;

type EntityPK = { id: string } | { key: string };

/**
 * Names of all entities in the schema.
 */
type DrizzleEntityName = keyof Omit<DrizzleSchema, "repo" | "global">;

/**
 * A union of all tables in the schema. Takes a type parameter to select only certain types.
 *
 * Examples:
 *
 * type AllTables = DrizzleTable;
 * type DeviceTable = DrizzleTable<"Device">;
 * type SampleAndDeviceTable = DrizzleTable<"Sample" | "Device">;
 */
export type DrizzleTable<T extends DrizzleEntityName = DrizzleEntityName> = DrizzleSchema[T];

export type DrizzleEntity<T extends DrizzleEntityName = DrizzleEntityName> =
	DrizzleTable<T>["$inferInsert"];

/**
 * Names of all entities in the schema that have a primary key, not a composite key.
 */
export type DrizzleEntityNamePK = {
	[K in DrizzleEntityName]: DrizzleEntity<K> extends EntityPK ? K : never;
}[DrizzleEntityName];

/**
 * Names of all entities in the schema that a primary key named id which encodes the type of the entity.
 */
export type DrizzleEntityNameId = (typeof entityByTypeId)[keyof typeof entityByTypeId];

// TODO: Infer using return type of `metadata` function
export type Metadata = Pick<
	DrizzleEntity<"IdPool">,
	"metadataCreatorId" | "metadataCreationTimestamp" | "metadataDeletedAt"
>;
