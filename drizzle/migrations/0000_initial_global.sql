CREATE SCHEMA IF NOT EXISTS "adacta_global";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adacta_global"."User" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"mikroORMId" uuid,
	"firstName" text NOT NULL,
	"lastName" text NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"salt" text NOT NULL,
	"locale" text NOT NULL,
	"dateStyle" varchar NOT NULL,
	"timeStyle" varchar NOT NULL,
	CONSTRAINT "User_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "User_mikroORMId_unique" UNIQUE("mikroORMId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adacta_global"."UserRepository" (
	"user_id" uuid NOT NULL,
	"repository_name" varchar(255) NOT NULL,
	CONSTRAINT "UserRepository_user_id_repository_name_pk" PRIMARY KEY("user_id","repository_name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "adacta_global"."UserRepository" ADD CONSTRAINT "UserRepository_user_id_User_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "adacta_global"."User"("user_id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "adacta_global"."User" ("email");