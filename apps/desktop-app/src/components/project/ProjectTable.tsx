import type { EuiBasicTableColumn } from "@elastic/eui";
import { EuiBasicTable, EuiLink } from "@elastic/eui";
import React from "react";
import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { useRepositoryId } from "../../services/router/UseRepoId";
import { DeleteWithConfirmation } from "../utils/DeleteWithConfirmation";

import type { ProjectTable$key } from "@/relay/ProjectTable.graphql";
import type { ProjectTableDeleteProjectMutation } from "@/relay/ProjectTableDeleteProjectMutation.graphql";
import type { ArrayElementType } from "~/lib/interface/ArrayElementType";

interface IProps {
	projects: ProjectTable$key;
}

const ProjectTableGraphQLFragment = graphql`
	fragment ProjectTable on Project @relay(plural: true) {
		id
		name
		contents {
			__typename
		}
	}
`;

export function ProjectTable(props: PropsWithConnections<IProps>) {
	const projects = useFragment(ProjectTableGraphQLFragment, props.projects);
	const { router } = useRepoRouterHook();

	const repositoryId = useRepositoryId();
	const [deleteProjectMutation] = useMutation<ProjectTableDeleteProjectMutation>(graphql`
		mutation ProjectTableDeleteProjectMutation($id: ID!, $repositoryId: ID!, $connections: [ID!]!) {
			repository(id: $repositoryId) {
				deleteProject(id: $id) {
					deletedId @deleteEdge(connections: $connections)
				}
			}
		}
	`);

	const columns: EuiBasicTableColumn<ArrayElementType<typeof projects>>[] = [
		{
			field: "name",
			name: "Name",
			render: function nameColumn(_, item) {
				return (
					<EuiLink
						onClick={() =>
							router.push("/repositories/:repositoryId/projects/:projectId", {
								repositoryId,
								projectId: item.id,
							})
						}
					>
						{item.name}
					</EuiLink>
				);
			},
		},
		{
			field: "items",
			name: "Number of items",
			render: function itemsColumn(_, item) {
				return <>{item.contents.length}</>;
			},
		},
		{
			field: "actions",
			name: "Actions",
			align: "right",
			render: function actionsColumn(_, item) {
				return (
					<DeleteWithConfirmation
						onClick={() => {
							deleteProjectMutation({
								variables: {
									repositoryId,
									connections: props.connections,
									id: item.id,
								},
							});
						}}
						confirmationText={`Are you sure you want to delete the project ${item.name}?`}
						disableReason={
							item.contents.length > 0 ? "This project still contains items" : undefined
						}
					/>
				);
			},
		},
	];

	return <EuiBasicTable items={[...projects]} rowHeader="name" columns={columns} />;
}
