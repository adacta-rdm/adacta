CREATE TABLE IF NOT EXISTS "adacta_global"."UserDataverseConnection" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"url" text NOT NULL,
	"token" text NOT NULL,
	"metadata_creator_id" uuid NOT NULL,
	"metadata_creation_timestamp" timestamp NOT NULL,
	"metadata_deleted_at" timestamp,
	CONSTRAINT "UserDataverseConnection_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adacta_global"."UserDataverseConnection" ADD CONSTRAINT "UserDataverseConnection_metadata_creator_id_User_user_id_fk" FOREIGN KEY ("metadata_creator_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;