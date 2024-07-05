import React from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import type { LazyUserNameLoaderQuery } from "@/relay/LazyUserNameLoaderQuery.graphql";

interface IProps {
	userId: string;
}

/**
 * Lazily loads the name a Repository using the ID
 */
export function LazyUserNameLoader(props: IProps) {
	const data = useLazyLoadQuery<LazyUserNameLoaderQuery>(
		graphql`
			query LazyUserNameLoaderQuery($id: ID!) {
				user(id: $id) {
					name
				}
			}
		`,
		{ id: props.userId }
	);

	const name = data.user?.name;
	return <>{name}</>;
}
