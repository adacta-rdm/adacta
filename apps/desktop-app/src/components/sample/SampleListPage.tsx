import {
	EuiButton,
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPageTemplate,
	EuiSpacer,
} from "@elastic/eui";
import React, { createContext, Suspense, useState } from "react";
import type { RefetchFnDynamic } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";

import type { SampleList$key } from "@/relay/SampleList.graphql";
import type {
	SampleListFragment,
	SampleListFragment$variables,
} from "@/relay/SampleListFragment.graphql";
import type { SampleListQuery } from "@/relay/SampleListQuery.graphql";
import { AdactaPageTemplate } from "~/apps/desktop-app/src/components/layout/AdactaPageTemplate";
import { ManageNameCompositionButton } from "~/apps/desktop-app/src/components/nameComposition/ManageNameCompositionButton";
import { SampleList, SampleListLoading } from "~/apps/desktop-app/src/components/sample/SampleList";
import {
	getStoredSelectedSearchItems,
	SearchBar,
} from "~/apps/desktop-app/src/components/search/list/SearchBar";
import { EDocId } from "~/apps/desktop-app/src/interfaces/EDocId";
import { useService } from "~/apps/desktop-app/src/services/ServiceProvider";
import { DocFlyoutService } from "~/apps/desktop-app/src/services/toaster/FlyoutService";
import { mergeGraphQLVariables } from "~/lib/utils/mergeGraphQLVariables";

export function SampleListPage(props: { queryRef: PreloadedQuery<SampleListQuery> }) {
	const [sampleAddDialogOpen, setSampleAddDialogOpen] = useState(false);

	const docFlyoutService = useService(DocFlyoutService);

	const [refetch, setRefetch] = useState<RefetchFnDynamic<SampleListFragment, SampleList$key>>();
	const [sampleListVariables, setSampleListVariables] = useState<
		Partial<SampleListFragment$variables>
	>({ filter: getStoredSelectedSearchItems("sampleList") });

	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Samples</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiButtonIcon
								aria-label={"Open Documentation"}
								color="text"
								iconType="questionInCircle"
								onClick={() => docFlyoutService.showDoc(EDocId.SAMPLES)}
							/>
						</EuiFlexItem>
					</EuiFlexGroup>
				}
				rightSideItems={[
					<EuiButton fill key="add" onClick={() => setSampleAddDialogOpen(true)}>
						Add sample
					</EuiButton>,
					<ManageNameCompositionButton key={"manageNameComposition"} />,
				]}
			/>
			<EuiPageTemplate.Section>
				<SampleListPageContext.Provider
					value={{
						refetch: (newVars: Partial<SampleListFragment$variables>) => {
							const mergedVariables = mergeGraphQLVariables(sampleListVariables, newVars);
							setSampleListVariables(mergedVariables);
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
						filterFields={["Creator", "Project"]}
						preservationId={"sampleList"}
						searchBarContext={SampleListPageContext}
					/>
					<EuiSpacer />
					<Suspense fallback={<SampleListLoading />}>
						<SampleList
							sampleAddDialogOpen={sampleAddDialogOpen}
							setSampleAddDialogOpen={setSampleAddDialogOpen}
							queryRef={props.queryRef}
							setRefetch={setRefetch}
						/>
					</Suspense>
				</SampleListPageContext.Provider>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}

interface ISampleListPageContext {
	refetch?: (newVars: Partial<SampleListFragment$variables>) => void;
}

export const SampleListPageContext = createContext<ISampleListPageContext>({});
