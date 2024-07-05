CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinitionPaths" (
	"ancestor_id" uuid NOT NULL,
	"descendant_id" uuid NOT NULL,
	"depth" integer NOT NULL,
	CONSTRAINT "DeviceDefinitionPaths_ancestor_id_descendant_id_pk" PRIMARY KEY("ancestor_id","descendant_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinitionSpecification" (
	"name" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"owner_id" uuid NOT NULL,
	CONSTRAINT "DeviceDefinitionSpecification_owner_id_name_pk" PRIMARY KEY("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."DeviceSpecification" (
	"name" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"owner_id" uuid NOT NULL,
	CONSTRAINT "DeviceSpecification_owner_id_name_pk" PRIMARY KEY("owner_id","name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "SQL_SCHEMA_PLACEHOLDER"."SampleSpecification" (
	"name" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"owner_id" uuid NOT NULL,
	CONSTRAINT "SampleSpecification_owner_id_name_pk" PRIMARY KEY("owner_id","name")
);
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
 ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."SampleSpecification" ADD CONSTRAINT "SampleSpecification_owner_id_Sample_sample_id_fk" FOREIGN KEY ("owner_id") REFERENCES "SQL_SCHEMA_PLACEHOLDER"."Sample"("sample_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."DeviceDefinition" ALTER COLUMN "parent_device_definition_ids" DROP NOT NULL -- Manually added