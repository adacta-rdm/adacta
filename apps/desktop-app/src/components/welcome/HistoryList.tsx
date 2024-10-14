import {
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	EuiListGroup,
	EuiListGroupItem,
	EuiSkeletonRectangle,
} from "@elastic/eui";
import React, { Suspense } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRepositoryIdMaybe } from "../../services/router/UseRepoId";
import { DeviceLink } from "../device/DeviceLink";
import { ProjectLink } from "../project/ProjectLink";
import { ResourceLink } from "../resource/ResourceLink";
import { SampleLink } from "../sample/SampleLink";

import type {
	HistoryListFragment$data,
	HistoryListFragment$key,
} from "@/relay/HistoryListFragment.graphql";
import type { HistoryListQuery } from "@/relay/HistoryListQuery.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";

const HistoryListFragmentGraphQL = graphql`
	fragment HistoryListFragment on Node {
		id
		__typename
		... on Project {
			...ProjectLinkFragment
		}
		... on Device {
			...DeviceLink
		}
		... on Sample {
			...SampleLink
		}
		... on Resource {
			...ResourceLink
		}
	}
`;

const HistoryListGraphQLQuery = graphql`
	query HistoryListQuery($ids: [ID!]!) {
		nodes(ids: $ids) {
			id
			...HistoryListFragment
		}
	}
`;

interface IHistoryEntry {
	id: string;
	repositoryId: string;
}

export interface IFavoriteOption {
	ids: IHistoryEntry[];
	makeFavorite: (id: IHistoryEntry) => void;
	removeFavorite: (id: IHistoryEntry) => void;
}

interface IProps {
	ids: IHistoryEntry[];

	favorites?: IFavoriteOption;
}

function HistoryListRaw({ ids, favorites }: IProps) {
	const repositoryId = useRepositoryIdMaybe();
	const data = useLazyLoadQuery<HistoryListQuery>(HistoryListGraphQLQuery, {
		ids: ids.filter((i) => i.repositoryId === repositoryId).map((i) => i.id),
	});

	if (!repositoryId) {
		return (
			<EuiListGroup maxWidth={false}>
				<EuiListGroupItem
					label={
						<EuiFlexGroup gutterSize={"xs"} alignItems={"center"}>
							<EuiFlexItem>
								<i>History not available in this view.</i>
							</EuiFlexItem>
						</EuiFlexGroup>
					}
				/>
			</EuiListGroup>
		);
	}

	return (
		<EuiListGroup maxWidth={false}>
			{data.nodes.map((item) =>
				// For some reason this element can become null (e.g. right after an import)
				// I'm not sure why this happens, but this check avoids a crash and the component rerenders
				// shortly after with the correct data
				item !== null ? (
					<HistoryListItem key={item.id} item={item} ids={ids} favorites={favorites} />
				) : null
			)}
		</EuiListGroup>
	);
}

function HistoryListItem(props: {
	item: HistoryListFragment$key;
	favorites?: IFavoriteOption;
	ids: IHistoryEntry[];
}) {
	const { favorites, ids } = props;
	const element: HistoryListFragment$data | null = useFragment(
		HistoryListFragmentGraphQL,
		props.item
	);

	const historyEntryElement = ids.find((i) => i.id === element.id);
	const isFavorite = favorites?.ids.find((i) => i.id === element.id);
	const repositoryId = ids.find((i) => i.id === element.id)?.repositoryId;

	const renderElement = () => {
		assertDefined(repositoryId);

		switch (element.__typename) {
			case "Project":
				return <ProjectLink prependIcon={true} data={element} repositoryId={repositoryId} />;
			case "Device":
				return <DeviceLink prependIcon={true} data={element} repositoryId={repositoryId} />;
			case "Sample":
				return <SampleLink prependIcon={true} sample={element} repositoryId={repositoryId} />;
			case "ResourceGeneric":
			case "ResourceTabularData":
				return <ResourceLink prependIcon={true} resource={element} repositoryId={repositoryId} />;
			default:
				return null;
		}
	};

	return (
		<EuiListGroupItem
			key={`historyList-${element.id}-${isFavorite ? 1 : 0}`}
			label={
				<EuiFlexGroup gutterSize={"xs"} alignItems={"center"}>
					{favorites && (
						<EuiFlexItem grow={false}>
							<EuiButtonIcon
								iconType={isFavorite ? "starFilledSpace" : "starEmptySpace"}
								aria-label={"Add to favorites"}
								onClick={() => {
									if (historyEntryElement) {
										if (!isFavorite) {
											favorites.makeFavorite(historyEntryElement);
										} else {
											favorites.removeFavorite(historyEntryElement);
										}
									}
								}}
							/>
						</EuiFlexItem>
					)}
					<EuiFlexItem>{renderElement()}</EuiFlexItem>
				</EuiFlexGroup>
			}
		/>
	);
}

/**
 * Wrapper for the HistoryListRaw component that renders a loading skeleton while the data is being fetched
 */
export function HistoryList(props: IProps) {
	return (
		<>
			<Suspense
				fallback={
					<EuiListGroup gutterSize={"s"}>
						{Array.from({ length: props.ids.length }).map((_, index) => (
							<EuiSkeletonRectangle key={index} height={32} width={"100%"} />
						))}
					</EuiListGroup>
				}
			>
				<HistoryListRaw ids={props.ids} favorites={props.favorites} />
			</Suspense>
		</>
	);
}
