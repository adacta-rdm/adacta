import React from "react";
import { graphql, useFragment, useLazyLoadQuery } from "react-relay";

import { RawEntry } from "./entry/RawEntry";
import { RawTabularMergedEntry } from "./entry/RawTabularMergedEntry";
import type { IResourceComparisonOptions } from "./entry/ResourceEntryContextMenu";
import type { PropsWithConnections } from "../../../interfaces/PropsWithConnections";

import type { ResourceListEntryFragment$key } from "@/relay/ResourceListEntryFragment.graphql";
import type { ResourceListEntryLazyQuery } from "@/relay/ResourceListEntryLazyQuery.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";

interface IProps {
	resource: ResourceListEntryFragment$key;
	level: number;

	parents: string[];

	comparison?: IResourceComparisonOptions;

	showContextMenu?: boolean;
}

interface IPropsAdditionalLazy {
	repositoryId: string;
	resourceId: string;
}

type IPropsLazy = Omit<IProps, "resource"> & IPropsAdditionalLazy;

export function ResourceListEntry(props: PropsWithConnections<IProps>) {
	const data = useFragment(
		graphql`
			fragment ResourceListEntryFragment on Resource {
				... on ResourceGeneric {
					id
					__typename
					children {
						__id
						edges {
							node {
								__typename
								id
								... on ResourceTabularData {
									...RawTabularMergedEntryFragment
								}
							}
						}
					}
					...RawEntryFragment
				}
				... on ResourceTabularData {
					id
					__typename
					...RawTabularMergedEntryFragment
				}
			}
		`,
		props.resource
	);

	if (data.__typename === "ResourceGeneric") {
		const tabularDataChildren = data.children?.edges.filter(
			(e) => e.node?.__typename === "ResourceTabularData"
		);

		// If all children can be merged pull them up into a RawTabularMergedEntry
		if (
			tabularDataChildren.length > 0 &&
			tabularDataChildren.length == data.children?.edges.length
		) {
			return (
				<>
					{data.children?.edges.flatMap((e) => {
						if (e.node?.__typename === "ResourceTabularData") {
							return (
								<RawTabularMergedEntry
									key={e.node.id}
									resource={e.node}
									level={props.level}
									connections={[...props.connections, data.children.__id]}
									parents={[...props.parents, data.id]}
									comparison={props.comparison}
									showContextMenu={props.showContextMenu}
								/>
							);
						}
						return [];
					})}
				</>
			);
		} else {
			return (
				<RawEntry
					resource={data}
					level={props.level}
					connections={[...props.connections, data.children.__id]}
					comparison={props.comparison}
					showContextMenu={props.showContextMenu}
				/>
			);
		}
	}

	if (data.__typename === "ResourceTabularData") {
		return (
			<RawTabularMergedEntry
				resource={data}
				level={props.level}
				connections={props.connections}
				parents={[...props.parents, data.id]}
				comparison={props.comparison}
				showContextMenu={props.showContextMenu}
			/>
		);
	}

	throw new Error("Could not render resource: Unexpected resource constellation");
}

export function ResourceListEntryLazy(props: PropsWithConnections<IPropsLazy>) {
	const resource = useLazyLoadQuery<ResourceListEntryLazyQuery>(
		graphql`
			query ResourceListEntryLazyQuery($repositoryId: ID!, $resourceId: ID!) {
				repository(id: $repositoryId) {
					resource(id: $resourceId) {
						...ResourceListEntryFragment
					}
				}
			}
		`,
		{ repositoryId: props.repositoryId, resourceId: props.resourceId }
	);
	assertDefined(resource.repository.resource);
	return (
		<ResourceListEntry
			resource={resource.repository.resource}
			level={props.level}
			connections={props.connections}
			parents={[...props.parents, props.resourceId]}
			comparison={props.comparison}
			showContextMenu={props.showContextMenu}
		/>
	);
}
