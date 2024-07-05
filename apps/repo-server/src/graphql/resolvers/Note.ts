import { metadata } from "./utils/metadata";
import type { IResolvers } from "../generated/resolvers";

import { createIDatetime, createMaybeIDatetime } from "~/lib/createDate";

export const Note: IResolvers["Note"] = {
	async text({ id }, _, { services: { el }, schema: { Note } }) {
		const note = await el.one(Note, id, "note");
		return note.text;
	},

	async caption({ id }, _, { services: { el }, schema: { Note } }) {
		const note = await el.one(Note, id, "note");
		return note.caption;
	},

	async begin({ id }, _, { services: { el }, schema: { Note } }) {
		const note = await el.one(Note, id, "note");
		if (!("begin" in note)) {
			throw new Error("Time information not found");
		}
		return createMaybeIDatetime(note.begin);
	},

	async end({ id }, _, { services: { el }, schema: { Note } }) {
		const note = await el.one(Note, id, "note");
		if (!("end" in note)) {
			throw new Error("Time information not found");
		}
		return createMaybeIDatetime(note.end);
	},

	async revisions({ id }, _, ctx) {
		const note = await ctx.services.el.one(ctx.schema.Note, id);

		const m = await metadata({ id }, _, ctx);

		const revisions = note.history.map((item) => ({
			text: item.text,
			caption: item.caption,
			metadata: {
				...m,
				creationTimestamp: createIDatetime(item.metadata.metadataCreationTimestamp),
			},
		}));

		return revisions;
	},

	metadata,
};
