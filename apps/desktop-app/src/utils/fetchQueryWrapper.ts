import { fetchQuery } from "react-relay";
import type { GraphQLTaggedNode } from "relay-runtime/lib/query/RelayModernGraphQLTag";
import type { Environment } from "relay-runtime/lib/store/RelayStoreTypes";
import type {
	CacheConfig,
	FetchQueryFetchPolicy,
	OperationType,
} from "relay-runtime/lib/util/RelayRuntimeTypes";

/**
 * Promisified version of fetchQuery.
 * fetchQuery from relay returns an Observable. The reason behind this is that it is possible to
 * return multiple responses from a single query (e.g. when using
 * [@defer](https://relay.dev/docs/glossary/#defer)).
 * This function is meant to be used when you are sure that the query will only return a single
 * response.
 */
export function fetchQueryWrapper<T extends OperationType>(
	environment: Environment,
	taggedNode: GraphQLTaggedNode,
	variables: T["variables"],
	cacheConfig?: {
		networkCacheConfig?: CacheConfig | null | undefined;
		fetchPolicy?: FetchQueryFetchPolicy | null | undefined;
	} | null
): Promise<T["response"]> {
	return new Promise((resolve, reject) => {
		fetchQuery(environment, taggedNode, variables, cacheConfig).subscribe({
			error: reject,
			next: resolve,
		});
	});
}
