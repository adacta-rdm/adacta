import { EuiSkeletonText } from "@elastic/eui";
import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { ListPageLoading } from "../components/layout/ListPageLoading";
import { Project, ProjectGraphqlQuery } from "../components/project/Project";

import type { ProjectQuery } from "@/relay/ProjectQuery.graphql";

export function getData({ match, relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<ProjectQuery>(relayEnvironment, ProjectGraphqlQuery, {
		projectId: match.params.projectId,
		repositoryId: match.params.repositoryId,
	});
}

export default function (props: IRouteComponentProps<typeof getData>) {
	return (
		<Suspense
			fallback={
				<ListPageLoading
					pageTitle={
						<>
							Project: <EuiSkeletonText />
						</>
					}
				/>
			}
		>
			<Project queryRef={props.data} />
		</Suspense>
	);
}
