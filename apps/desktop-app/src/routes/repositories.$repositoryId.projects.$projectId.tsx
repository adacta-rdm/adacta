import { EuiSkeletonText } from "@elastic/eui";
import React, { Suspense } from "react";
import { loadQuery } from "react-relay";

import { ListPageLoading } from "../components/layout/ListPageLoading";
import { Project, ProjectGraphqlQuery } from "../components/project/Project";

import type { ProjectQuery } from "@/relay/ProjectQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.projects.$projectId";

function getData({ match, relayEnvironment }: GetDataArgs) {
	return loadQuery<ProjectQuery>(relayEnvironment, ProjectGraphqlQuery, {
		projectId: match.params.projectId,
		repositoryId: match.params.repositoryId,
	});
}

export default function Route(props: Props<typeof getData>) {
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
