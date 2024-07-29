CREATE SCHEMA "SQL_SCHEMA_PLACEHOLDER";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."Device" (
	"device_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"short_id" varchar(255),
	"device_definition_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"image_resources" uuid[] NOT NULL,
	"setup_description" jsonb NOT NULL,
	"specifications" jsonb,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', name || ' ' || short_id)) STORED,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp,
	CONSTRAINT "Device_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinition" (
	"device_definition_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"name" varchar(255) NOT NULL,
	"image_resource_ids" uuid[] NOT NULL,
	"acceptsUnit" varchar[] NOT NULL,
	"parent_device_definition_ids" uuid[],
	"specifications" jsonb,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp,
	CONSTRAINT "DeviceDefinition_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinitionPaths" (
	"ancestor_id" uuid NOT NULL,
	"descendant_id" uuid NOT NULL,
	"depth" integer NOT NULL,
	CONSTRAINT "DeviceDefinitionPaths_ancestor_id_descendant_id_pk" PRIMARY KEY("ancestor_id","descendant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinitionSpecification" (
	"name" varchar(255) NOT NULL,
	"value" varchar(2000) NOT NULL,
	"owner_id" uuid NOT NULL,
	CONSTRAINT "DeviceDefinitionSpecification_owner_id_name_pk" PRIMARY KEY("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."DeviceSpecification" (
	"name" varchar(255) NOT NULL,
	"value" varchar(2000) NOT NULL,
	"owner_id" uuid NOT NULL,
	CONSTRAINT "DeviceSpecification_owner_id_name_pk" PRIMARY KEY("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."IdPool" (
	"id_pool_id" uuid PRIMARY KEY NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"digits" integer NOT NULL,
	"alphabet" varchar(255) NOT NULL,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."ImportPreset" (
	"import_preset_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"name" varchar(255),
	"device_ids" uuid[] NOT NULL,
	"preset" jsonb NOT NULL,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp,
	CONSTRAINT "ImportPreset_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."NameComposition" (
	"name_composition_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"legacy_name_index" integer,
	"short_id_index" integer,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."NameCompositionVariable" (
	"name_composition_variable_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" varchar(255),
	"alias" text[],
	"prefix" varchar(255),
	"suffix" varchar(255),
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."NameCompositionVariableUsage" (
	"name_composition_id" uuid NOT NULL,
	"variable_id" uuid NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."Note" (
	"note_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"item_id" uuid NOT NULL,
	"note" jsonb NOT NULL,
	"history" jsonb NOT NULL,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp,
	CONSTRAINT "Note_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."Project" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"name" varchar(255) NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', name)) STORED,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp,
	CONSTRAINT "Project_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."ProjectToDevice" (
	"project_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	CONSTRAINT "ProjectToDevice_project_id_device_id_pk" PRIMARY KEY("project_id","device_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."ProjectToResource" (
	"project_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	CONSTRAINT "ProjectToResource_project_id_resource_id_pk" PRIMARY KEY("project_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."ProjectToSample" (
	"project_id" uuid NOT NULL,
	"sample_id" uuid NOT NULL,
	CONSTRAINT "ProjectToSample_project_id_sample_id_pk" PRIMARY KEY("project_id","sample_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."Property" (
	"property_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"owner_device_id" uuid NOT NULL,
	"begin" timestamp NOT NULL,
	"end" timestamp,
	"name" varchar(255) NOT NULL,
	"device_id" uuid,
	"sample_id" uuid,
	CONSTRAINT "Property_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."RepositoryConfigEntry" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."Resource" (
	"resource_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"name" varchar(255) NOT NULL,
	"attachment" jsonb NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', name)) STORED,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp,
	CONSTRAINT "Resource_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."Sample" (
	"sample_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"name" varchar(255) NOT NULL,
	"specifications" jsonb,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', name)) STORED,
	CONSTRAINT "Sample_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."SampleSpecification" (
	"name" varchar(255) NOT NULL,
	"value" varchar(2000) NOT NULL,
	"owner_id" uuid NOT NULL,
	CONSTRAINT "SampleSpecification_owner_id_name_pk" PRIMARY KEY("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."SampleToSample" (
	"sample_to_sample_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"sample1" uuid NOT NULL,
	"sample2" uuid NOT NULL,
	"begin" timestamp,
	"relation_type" varchar(255) NOT NULL,
	CONSTRAINT "SampleToSample_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."Transformation" (
	"transformation_id" uuid PRIMARY KEY NOT NULL,
	"couch_id" uuid,
	"name" varchar NOT NULL,
	"preset_id" uuid,
	"input" jsonb NOT NULL,
	"output" jsonb NOT NULL,
	CONSTRAINT "Transformation_couch_id_unique" UNIQUE("couch_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Device" ADD CONSTRAINT "Device_device_definition_id_DeviceDefinition_device_definition_id_fk" FOREIGN KEY ("device_definition_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinition"("device_definition_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Device" ADD CONSTRAINT "Device_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinition" ADD CONSTRAINT "DeviceDefinition_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinitionPaths" ADD CONSTRAINT "DeviceDefinitionPaths_ancestor_id_DeviceDefinition_device_definition_id_fk" FOREIGN KEY ("ancestor_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinition"("device_definition_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinitionPaths" ADD CONSTRAINT "DeviceDefinitionPaths_descendant_id_DeviceDefinition_device_definition_id_fk" FOREIGN KEY ("descendant_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinition"("device_definition_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinitionSpecification" ADD CONSTRAINT "DeviceDefinitionSpecification_owner_id_DeviceDefinition_device_definition_id_fk" FOREIGN KEY ("owner_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinition"("device_definition_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."DeviceSpecification" ADD CONSTRAINT "DeviceSpecification_owner_id_Device_device_id_fk" FOREIGN KEY ("owner_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Device"("device_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."IdPool" ADD CONSTRAINT "IdPool_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."ImportPreset" ADD CONSTRAINT "ImportPreset_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."NameComposition" ADD CONSTRAINT "NameComposition_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."NameCompositionVariable" ADD CONSTRAINT "NameCompositionVariable_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."NameCompositionVariableUsage" ADD CONSTRAINT "NameCompositionVariableUsage_name_composition_id_NameComposition_name_composition_id_fk" FOREIGN KEY ("name_composition_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."NameComposition"("name_composition_id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."NameCompositionVariableUsage" ADD CONSTRAINT "NameCompositionVariableUsage_variable_id_NameCompositionVariable_name_composition_variable_id_fk" FOREIGN KEY ("variable_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."NameCompositionVariable"("name_composition_variable_id") ON DELETE no action ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Note" ADD CONSTRAINT "Note_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Project" ADD CONSTRAINT "Project_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."ProjectToDevice" ADD CONSTRAINT "ProjectToDevice_project_id_Project_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Project"("project_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."ProjectToDevice" ADD CONSTRAINT "ProjectToDevice_device_id_Device_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Device"("device_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."ProjectToResource" ADD CONSTRAINT "ProjectToResource_project_id_Project_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Project"("project_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."ProjectToResource" ADD CONSTRAINT "ProjectToResource_resource_id_Resource_resource_id_fk" FOREIGN KEY ("resource_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Resource"("resource_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."ProjectToSample" ADD CONSTRAINT "ProjectToSample_project_id_Project_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Project"("project_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."ProjectToSample" ADD CONSTRAINT "ProjectToSample_sample_id_Sample_sample_id_fk" FOREIGN KEY ("sample_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Sample"("sample_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Property" ADD CONSTRAINT "Property_owner_device_id_Device_device_id_fk" FOREIGN KEY ("owner_device_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Device"("device_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Property" ADD CONSTRAINT "Property_device_id_Device_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Device"("device_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Property" ADD CONSTRAINT "Property_sample_id_Sample_sample_id_fk" FOREIGN KEY ("sample_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Sample"("sample_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Resource" ADD CONSTRAINT "Resource_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Sample" ADD CONSTRAINT "Sample_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."SampleSpecification" ADD CONSTRAINT "SampleSpecification_owner_id_Sample_sample_id_fk" FOREIGN KEY ("owner_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Sample"("sample_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."SampleToSample" ADD CONSTRAINT "SampleToSample_sample1_Sample_sample_id_fk" FOREIGN KEY ("sample1") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Sample"("sample_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."SampleToSample" ADD CONSTRAINT "SampleToSample_sample2_Sample_sample_id_fk" FOREIGN KEY ("sample2") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Sample"("sample_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Transformation" ADD CONSTRAINT "Transformation_preset_id_ImportPreset_import_preset_id_fk" FOREIGN KEY ("preset_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."ImportPreset"("import_preset_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_device" ON "SQL_SCHEMA_PLACEHOLDER"."Device" USING gin ("search");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_project" ON "SQL_SCHEMA_PLACEHOLDER"."Project" USING gin ("search");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_resource" ON "SQL_SCHEMA_PLACEHOLDER"."Resource" USING gin ("search");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_sample" ON "SQL_SCHEMA_PLACEHOLDER"."Sample" USING gin ("search");