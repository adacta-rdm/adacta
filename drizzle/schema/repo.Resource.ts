import { index, varchar } from "drizzle-orm/pg-core";

import type {
	IResourceDocumentAttachmentImage,
	IResourceDocumentAttachmentRaw,
	IResourceDocumentAttachmentTabularData,
} from "~/apps/repo-server/interface/IResourceDocumentAttachment";
import type { IPgSchemas } from "~/drizzle/schemaHelpers/IPgSchemas";
import { customJsonb } from "~/drizzle/schemaHelpers/customJsonb";
import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import { tsvector } from "~/drizzle/schemaHelpers/tsvector";
import type { IResourceId } from "~/lib/database/Ids";

export function Resource(schemas: IPgSchemas) {
	/**
	 * Represents some virtual item, such as numeric data, an image, text, or - generally speaking - a
	 * sequence of bytes. The resource's `kind` describes how to interpret the underlying set of bytes.
	 *
	 * Resources can be transformed into other resources, resulting in a parent-child relationship
	 * between the two. Taking into account that transformed resources can again be transformed,
	 * resources represent a tree structure with the root resource corresponding to the original,
	 * unmodified data as it was imported by the user.
	 *
	 * It is strongly recommended to import only data that has not been manually altered and instead
	 * perform any required transformations within adacta.
	 *
	 * A strong benefit of describing resources and their transformations in a tree structure is that
	 * this allows to trace back to the origin of the resource or data. Furthermore, this approach
	 * allows us to easily extend the program to be able to deal with other data formats.
	 */
	return schemas.repo.table(
		"Resource",
		{
			id: idType<IResourceId>("resource_id").primaryKey().notNull(),

			/**
			 * The couch_id is the unique identifier of the document in the CouchDB database.
			 */
			couchId: idType<string>("couch_id").unique(),

			/**
			 * A textual label.
			 */
			name: varchar("name", { length: 255 }).notNull(),

			/**
			 * Metadata of the resource contents.
			 */
			attachment: customJsonb("attachment").$type<IResourceDocumentAttachment>().notNull(),

			search: tsvector("search", { sources: ["name"] }),

			...metadata(schemas),
		},
		(t) => ({
			idx_search: index("idx_search_resource").using("gin", t.search),
		})
	);
}

export type IResourceDocumentAttachment =
	| IResourceDocumentAttachmentRaw
	| IResourceDocumentAttachmentTabularData
	| IResourceDocumentAttachmentImage;
