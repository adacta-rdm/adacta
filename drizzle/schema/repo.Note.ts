import type { Metadata } from "~/drizzle/DrizzleSchema";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { customJsonb } from "~/drizzle/schemaHelpers/customJsonb";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import type { IDeviceId, INoteId, ISampleId } from "~/lib/database/Ids";

type TNote = INote | ITimedNote;
type TNoteHistory = TNote & { metadata: Metadata };

interface INote {
	caption: string;
	text: string;
}

interface ITimedNote extends INote {
	begin: Date;
	end?: Date;
}

export function Note(schemas: IPgSchemas) {
	return schemas.repo.table("Note", {
		id: idType<INoteId>("note_id").primaryKey().notNull(),
		couchId: idType<string>("couch_id").unique(),
		itemId: idType<IDeviceId | ISampleId>("item_id").notNull(),
		note: customJsonb("note").$type<TNote>().notNull(),
		history: customJsonb("history").notNull().$type<TNoteHistory[]>(),

		...metadata(schemas),
	});
}
