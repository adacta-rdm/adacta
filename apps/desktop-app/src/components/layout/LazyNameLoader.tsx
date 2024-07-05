import React from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import type { LazyNameLoaderQuery } from "@/relay/LazyNameLoaderQuery.graphql";

interface IProps {
	thingId: string;
}

/**
 * Lazily loads the name of "things" using only the ID
 */
export function LazyNameLoader(props: IProps) {
	const data = useLazyLoadQuery<LazyNameLoaderQuery>(
		graphql`
			query LazyNameLoaderQuery($id: ID!) {
				node(id: $id) {
					... on Device {
						name
					}
					... on Sample {
						name
					}
					... on Resource {
						name
					}
					... on Project {
						name
					}
				}
			}
		`,
		{ id: props.thingId }
	);

	return <>{data.node?.name}</>;
}
