import { EuiFlexGroup, EuiFlexItem, EuiHeader, EuiTab, EuiTabs } from "@elastic/eui";
import React from "react";

import { resolveLocation } from "./utils/resolveLocation";
import type { IRouteComponentPropsWithChildren, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { RedirectException } from "../RedirectException";
import type { AdactaIconTypes } from "../components/icons/AdactaIcon";
import { AdactaIcon } from "../components/icons/AdactaIcon";
import { useRouter } from "../hooks/useRouter";
import type { RouterArgs } from "../routes";

export function getData({ match, graphQLHeaders }: IRouteGetDataFunctionArgs) {
	const repositoryId = match.params.repositoryId;
	// Check whether the headers required to perform graphql queries are present.
	if (!graphQLHeaders.authToken) {
		throw new RedirectException("/login");
	}
	if (!graphQLHeaders.repositoryId) {
		graphQLHeaders.repositoryId = repositoryId;
	}

	// Check whether the headers required to perform graphql queries are present.
	// If not, redirect to the login page
	// This must happen synchronously, otherwise sub routes will attempt to load and will fail due to the
	// missing headers
	return { repositoryId };
}

export default function (props: IRouteComponentPropsWithChildren<typeof getData>) {
	const { repositoryId } = props.data;

	return (
		<>
			<EuiHeader position="fixed">
				<EuiFlexGroup alignItems={"flexEnd"} direction={"row"}>
					<EuiFlexItem>
						<EuiFlexGroup alignItems={"center"} direction={"column"} gutterSize={"xl"}>
							<EuiFlexItem>
								<EuiTabs>
									<AdactaNavigationTab
										name={"Devices"}
										iconType={"Device"}
										route={["/repositories/:repositoryId/devices/", { repositoryId }]}
									/>
									<AdactaNavigationTab
										name={"Samples"}
										iconType={"Sample"}
										route={["/repositories/:repositoryId/samples/", { repositoryId }]}
									/>
									<AdactaNavigationTab
										name={"Resources"}
										iconType={"Resource"}
										route={["/repositories/:repositoryId/resources/", { repositoryId }]}
									/>
									<AdactaNavigationTab
										name={"Projects"}
										iconType={"Project"}
										route={["/repositories/:repositoryId/projects/", { repositoryId }]}
									/>
								</EuiTabs>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiHeader>
			{props.children}
		</>
	);
}

function AdactaNavigationTab({
	name,
	iconType,
	route,
}: {
	name: string;
	iconType: AdactaIconTypes;
	route: RouterArgs;
}) {
	const { match, router } = useRouter();
	const tabIsActive = router.isActive(match, { pathname: resolveLocation(...route) });

	return (
		<EuiTab onClick={() => router.push(...route)} isSelected={tabIsActive}>
			<EuiFlexGroup alignItems={"center"} gutterSize={"s"}>
				<EuiFlexItem grow={false}>
					<AdactaIcon type={iconType} size={"s"} />
				</EuiFlexItem>
				<EuiFlexItem grow={false}>{name}</EuiFlexItem>
			</EuiFlexGroup>
		</EuiTab>
	);
}
