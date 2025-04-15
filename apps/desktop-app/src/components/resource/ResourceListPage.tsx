import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPageTemplate, EuiSpacer } from "@elastic/eui";
import React, { createContext, Suspense, useState } from "react";
import type { RefetchFnDynamic } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";

import type { ResourceList$key } from "@/relay/ResourceList.graphql";
import type {
	ResourceListFragment,
	ResourceListFragment$variables,
} from "@/relay/ResourceListFragment.graphql";
import type { ResourceListQuery } from "@/relay/ResourceListQuery.graphql";
import { AdactaPageTemplate } from "~/apps/desktop-app/src/components/layout/AdactaPageTemplate";
import {
	ResourceList,
	ResourceListLoading,
} from "~/apps/desktop-app/src/components/resource/ResourceList";
import {
	getStoredSelectedSearchItems,
	SearchBar,
} from "~/apps/desktop-app/src/components/search/list/SearchBar";
import { EDocId } from "~/apps/desktop-app/src/interfaces/EDocId";
import { useService } from "~/apps/desktop-app/src/services/ServiceProvider";
import { DocFlyoutService } from "~/apps/desktop-app/src/services/toaster/FlyoutService";
import { mergeGraphQLVariables } from "~/lib/utils/mergeGraphQLVariables";

export function ResourceListPage(props: { queryRef: PreloadedQuery<ResourceListQuery> }) {
	const docFlyoutService = useService(DocFlyoutService);

	const [refetch, setRefetch] =
		useState<RefetchFnDynamic<ResourceListFragment, ResourceList$key>>();
	const [resourceListVariables, setResourceListVariables] = useState<
		Partial<ResourceListFragment$variables>
	>({
		filter: getStoredSelectedSearchItems("resourcesList"),
	});

	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Resources</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiButtonIcon
								aria-label={"Open Documentation"}
								color="text"
								iconType="questionInCircle"
								onClick={() => docFlyoutService.showDoc(EDocId.RESOURCES)}
							/>
						</EuiFlexItem>
					</EuiFlexGroup>
				}
			/>
			<EuiPageTemplate.Section>
				<ResourceListPageContext.Provider
					value={{
						refetch: (newVars: Partial<ResourceListFragment$variables>) => {
							const mergedVariables = mergeGraphQLVariables(resourceListVariables, newVars);
							setResourceListVariables(mergedVariables);
							if (refetch) {
								refetch(mergedVariables, {
									fetchPolicy: "store-and-network",
								});
							}
						},
					}}
				>
					<SearchBar
						freeTextSearch={true}
						filterFields={["Project", "Creator"]}
						preservationId={"resourcesList"}
						searchBarContext={ResourceListPageContext}
					/>
					<EuiSpacer />

					<Suspense fallback={<ResourceListLoading />}>
						<ResourceList queryRef={props.queryRef} setRefetch={setRefetch} />
					</Suspense>
				</ResourceListPageContext.Provider>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}

interface IResourceListPageContext {
	refetch?: (newVars: Partial<ResourceListFragment$variables>) => void;
}

export const ResourceListPageContext = createContext<IResourceListPageContext>({});
