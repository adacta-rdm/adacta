import { EuiCallOut, EuiCodeBlock, EuiSpacer } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { DeleteResource } from "./DeleteResource";
import { ResourceFileDownloadButton } from "./ResourceFileDownloadButton";
import { ResourceHierarchyNavigation } from "./ResourceHierarchyNavigation";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { TabbedPageLayout } from "../layout/TabbedPageLayout";
import { OriginRepoIndicator } from "../originRepo/OriginRepoIndicator";
import { ProjectEditorAsHeaderElement } from "../project/projectEditor/ProjectEditorAsHeaderElement";

import type { ResourceGeneric_data$key } from "@/relay/ResourceGeneric_data.graphql";
import { ResourceFileImportButton } from "~/apps/desktop-app/src/components/resource/ResourceFileImportButton";
import { UserLink } from "~/apps/desktop-app/src/components/user/UserLink";

export function ResourceGeneric(props: { data: ResourceGeneric_data$key }) {
	const { router, repositoryId } = useRepoRouterHook();
	const data = useFragment<ResourceGeneric_data$key>(
		graphql`
			fragment ResourceGeneric_data on ResourceGeneric {
				id
				name
				parent {
					id
				}
				children {
					edges {
						node {
							name
							# eslint-disable-next-line relay/unused-fields
							subName
							id
						}
					}
				}
				rawFileMetadata {
					type
					preview
				}
				uploadDeviceId
				metadata {
					creator {
						...UserLink
					}
				}
				...ProjectEditorAsHeaderElement
				...OriginRepoIndicator
			}
		`,
		props.data
	);

	return (
		<TabbedPageLayout
			pageHeader={{
				pageTitle: (
					<>
						Resource {data.name} <OriginRepoIndicator metadata={data} />
					</>
				),
				description: (
					<>
						ID: {data.id}
						<br />
						Created by: <UserLink user={data.metadata.creator} />
						<ProjectEditorAsHeaderElement data={data} />
					</>
				),
				rightSideItems: [
					<ResourceHierarchyNavigation
						key="navigation"
						parentResource={data.parent}
						childResources={data.children.edges.map((e) => e.node)}
					/>,
					<DeleteResource
						key={"delete"}
						buttonStyle={"button"}
						disabled={data.children.edges.length > 0}
						resourceId={data.id}
						connections={[]}
						onResourceDeleted={() =>
							router.push("/repositories/:repositoryId/resources/", { repositoryId })
						}
						size={"s"}
					/>,
					<ResourceFileDownloadButton key="download" resourceId={data.id} fileName={data.name} />,
					<ResourceFileImportButton
						key="import"
						resourceId={data.id}
						uploadDeviceId={data.uploadDeviceId}
						fileType={data.rawFileMetadata?.type ?? undefined}
					/>,
				],
				tabs: [
					{
						label: "Overview",
						isSelected: true,
						id: "overview",
						content: (
							<>
								<EuiCallOut color="primary" title="Note: Raw resource">
									This is an untouched raw resource just as it was imported into Adacta. To see the
									full resource use the export button above.
								</EuiCallOut>
								<EuiSpacer />
								<EuiCodeBlock whiteSpace="pre">{`${data.rawFileMetadata?.preview}\n...`}</EuiCodeBlock>
							</>
						),
					},
				],
			}}
		/>
	);
}
