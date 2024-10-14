import {
	EuiAvatar,
	EuiCallOut,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPageTemplate,
	EuiPanel,
	EuiSpacer,
	EuiStat,
	EuiTab,
	EuiTabs,
	EuiTitle,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";

import { isKnownAsResourceToUser } from "../../utils/isKnownAsResourceToUser";
import { DeviceTable } from "../device/list/flat/DeviceTable";
import { AdactaPageTemplate } from "../layout/AdactaPageTemplate";
import { ProjectTable } from "../project/ProjectTable";
import { ResourceListTable } from "../resource/list/ResourceListTable";
import { SampleTable } from "../sample/SampleTable";

import type { UserProfileQuery } from "@/relay/UserProfileQuery.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";
import { isNonNullish } from "~/lib/assert/isNonNullish";

export const UserProfileGraphQLQuery = graphql`
	query UserProfileQuery($userId: ID!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			user(id: $userId) {
				id
				name
				createdDevices {
					__id
					edges {
						...DeviceTable_devices
					}
				}
				createdResources {
					__id
					edges {
						node {
							__typename
							...ResourceListTableFragment
						}
					}
				}
				createdSamples {
					edges {
						node {
							id
							...SampleTable_samples
						}
					}
				}
				createdProjects {
					edges {
						node {
							__typename
							...ProjectTable
						}
					}
				}
			}
		}
	}
`;

function TabTemplate(props: { name: string; children: React.ReactNode }) {
	return (
		<>
			<EuiSpacer />
			<EuiTitle>
				<h2>{props.name}</h2>
			</EuiTitle>
			<EuiSpacer />
			{props.children}
		</>
	);
}

export function UserProfile(props: { queryRef: PreloadedQuery<UserProfileQuery> }) {
	const { repository: data } = usePreloadedQuery(UserProfileGraphQLQuery, props.queryRef);
	assertDefined(data.user, "UserProfile: User does not exist.");

	type TTabIds = "Devices" | "Resources" | "Samples" | "Projects";

	//const createdDevices = data.user.createdDevices;
	const createdDevices = data.user.createdDevices.edges;
	const createdResources = data.user.createdResources.edges
		.map((e) => e.node)
		// Filter expressions are split to allow type guard to kick in :(
		.filter(isNonNullish)
		.filter(isKnownAsResourceToUser);
	const createdSamples = data.user.createdSamples.edges.map((e) => e.node);
	const createdProjects = data.user.createdProjects.edges.map((e) => e.node);

	let body = undefined;

	let initialTab: TTabIds | undefined = undefined;

	if (createdDevices.length > 0) {
		initialTab = "Devices";
	} else if (createdResources.length > 0) {
		initialTab = "Resources";
	} else if (createdSamples.length > 0) {
		initialTab = "Samples";
	} else if (createdProjects.length > 0) {
		initialTab = "Projects";
	}

	const [showTabId, setShowTabId] = useState<TTabIds | undefined>(initialTab);

	if (showTabId === "Devices") {
		body = (
			<TabTemplate name={"Devices"}>
				<DeviceTable
					devices={createdDevices}
					connections={[data.user.createdDevices.__id]}
					disableActions
				/>
			</TabTemplate>
		);
	} else if (showTabId === "Resources") {
		body = (
			<TabTemplate name={"Resources"}>
				<ResourceListTable
					resources={createdResources}
					connections={[data.user.createdResources.__id]}
				/>
			</TabTemplate>
		);
	} else if (showTabId === "Samples") {
		body = (
			<TabTemplate name={"Samples"}>
				<SampleTable samples={createdSamples} connectionId={undefined} disableActions />
			</TabTemplate>
		);
	} else if (showTabId === "Projects") {
		body = (
			<TabTemplate name={"Projects"}>
				<ProjectTable projects={createdProjects} connections={[]} />
			</TabTemplate>
		);
	}

	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={data.user.name}
				description={`ID: ${data.user.id}`}
				rightSideItems={[
					<EuiAvatar key="avatar" color="#fbf9ee" size="xl" name={data.user.name} />,
				]}
			/>
			<EuiPageTemplate.Section>
				<EuiCallOut title={"Statistics and data refer to the current repository"}>
					The statistics and data displayed here relate to the currently selected repository. To
					view statistics for other repositories, select the appropriate repository.
				</EuiCallOut>
				<EuiSpacer />
				<EuiFlexGroup>
					<EuiFlexItem>
						<EuiPanel>
							<EuiStat
								title={createdDevices.length}
								description="Created devices"
								textAlign="right"
								titleColor="secondary"
							/>
						</EuiPanel>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiPanel>
							<EuiStat
								title={createdResources.length}
								description="Created resources"
								textAlign="right"
								titleColor="accent"
							/>
						</EuiPanel>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiPanel>
							<EuiStat
								title={createdSamples.length}
								description="Created samples"
								textAlign="right"
								titleColor="primary"
							/>
						</EuiPanel>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiPanel>
							<EuiStat
								title={createdProjects.length}
								description="Created projects"
								textAlign="right"
								titleColor="danger"
							/>
						</EuiPanel>
					</EuiFlexItem>
				</EuiFlexGroup>
				{createdDevices.length +
					createdResources.length +
					createdSamples.length +
					createdProjects.length >
					0 && (
					<>
						<EuiSpacer />
						<EuiPanel>
							<EuiTabs>
								{createdDevices.length > 0 && (
									<EuiTab onClick={() => setShowTabId("Devices")}>Devices</EuiTab>
								)}
								{createdResources.length > 0 && (
									<EuiTab onClick={() => setShowTabId("Resources")}>Resources</EuiTab>
								)}
								{createdSamples.length > 0 && (
									<EuiTab onClick={() => setShowTabId("Samples")}>Samples</EuiTab>
								)}
								{createdProjects.length > 0 && (
									<EuiTab onClick={() => setShowTabId("Projects")}>Projects</EuiTab>
								)}
							</EuiTabs>
							{body}
						</EuiPanel>
					</>
				)}
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
