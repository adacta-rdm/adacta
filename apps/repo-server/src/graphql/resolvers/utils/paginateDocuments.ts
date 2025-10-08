import type {
	IUserDataverseConnection,
	IDevice,
	IDeviceDefinition,
	IHierarchicalDeviceListEntry,
	IImportPreset,
	INameComposition,
	INameCompositionVariable,
	INote,
	IProject,
	IResource,
	ISample,
} from "../../generated/resolvers";

import type { ResolverReturnType } from "~/lib/utils/types";

export async function paginateDocuments<
	// NOTE: This type needs to be based on the generated schema types, not the entities/documents!
	TDoc extends
		| IUserDataverseConnection
		| IImportPreset
		| IDevice
		| IDeviceDefinition
		| IHierarchicalDeviceListEntry
		| INameComposition
		| INameCompositionVariable
		| INote
		| IProject
		| IResource
		| ISample
>(docs: ResolverReturnType<TDoc[]>, count?: number | null, cursor?: string | null) {
	const length = docs.length;
	// Show the `first` number of elements after `after`.
	const first: number = count ?? length;
	const after: number = cursor ? +cursor : 0;
	const numberOfPages = Math.ceil(length / first);

	const edges: { cursor: string; node: ResolverReturnType<TDoc> }[] = [];

	// Iterate over `first` elements, but at most until the end of the data
	const end = Math.min(after + first, length);
	for (let i = after; i < end; ++i) {
		edges.push({
			node: docs[i],
			cursor: String(i + after),
		});
	}

	const around: { pageNumber: number; cursor: string }[] = [];
	for (let i = -3; around.length <= 7; ++i) {
		const cursor = after + i * first;
		const pageNumber = cursor / first;
		if (pageNumber < 0) continue;
		if (pageNumber > numberOfPages) break;
		around.push({ pageNumber, cursor: cursor.toString() });
	}

	return {
		count: length,
		edges: await Promise.all(edges),
		pageInfo: {
			hasPreviousPage: false,
			hasNextPage: length > after + first,
			startCursor: after.toString(),
			endCursor: Math.min(after + first, length).toString(),
			cursors: {
				first: {
					pageNumber: 0,
					cursor: "0",
				},
				last: {
					pageNumber: numberOfPages - 1,
					cursor: (Math.floor(length / first) * first).toString(),
				},
				around,
			},
		},
	};
}
