import { eq } from "drizzle-orm";

import { paginateDocuments } from "./paginateDocuments";
import type { IGraphQLContext } from "../../IGraphQLContext";
import type { INote, INoteConnection } from "../../generated/resolvers";

import type { IDeviceId, ISampleId } from "~/lib/database/Ids";
import type { ResolverReturnType } from "~/lib/utils/types";

export async function notes(
	{ id }: { id: IDeviceId | ISampleId },
	_: unknown,
	{ services: { el }, schema: { Note } }: IGraphQLContext
): Promise<ResolverReturnType<INoteConnection>> {
	const notes = await el.find(Note, (t) => eq(t.itemId, id));

	return paginateDocuments<INote>(notes.map(({ id }) => ({ id })));
}
