import { createContext, useContext } from "react";
import type { GraphQLTaggedNode } from "react-relay";

import type { DateTimeQuery$data } from "@/relay/DateTimeQuery.graphql";
import type { FreeComponentSelectionQuery$data } from "@/relay/FreeComponentSelectionQuery.graphql";

//export type LazyLoadMockFetchFunction<TQuery extends OperationType> = (variables: TQuery["variables"]) => TQuery["response"];
// export type LazyLoadMockDescription<TQuery extends OperationType> = [GraphQLTaggedNode, TQuery["response"]][];
export type LazyLoadMockDescription = [
	GraphQLTaggedNode,
	FreeComponentSelectionQuery$data | DateTimeQuery$data
][];
export function useFragment(fragmentInput: any, fragmentRef: any): any {
	return fragmentRef;
}

const returnValues = new Map();

export function setLazyLoadQueryReturnValue(query: any, data: () => any) {
	returnValues.set(query, data);
}

export const LazyLoadQueryContext = createContext<LazyLoadMockDescription>([]);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useLazyLoadQuery(query: any, variables: any) {
	const queryValues = useContext(LazyLoadQueryContext);

	for (const [q, data] of queryValues) {
		if (q === query) return data;
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
	const name = "params" in query ? query.params.name : "";

	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	throw new Error(`useLazyLoadQuery-Mock: No return value registered for Query ${name}`);
}
