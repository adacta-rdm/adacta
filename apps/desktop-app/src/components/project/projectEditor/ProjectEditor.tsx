import {
	EuiBadge,
	EuiButton,
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSelect,
	EuiSpacer,
} from "@elastic/eui";
import type { EuiSelectOption } from "@elastic/eui/src/components/form/select/select";
import { assertDefined } from "@omegadot/assert";
import type { ReactElement } from "react";
import React, { useState } from "react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";
import type { RecordSourceSelectorProxy } from "relay-runtime";

import { ProjectEditorAdd } from "./ProjectEditorAdd";
import { useRepoRouterHook } from "../../../services/router/RepoRouterHook";
import { useRepositoryIdVariable } from "../../../services/router/UseRepoId";
import { ShowIfUserCanEdit } from "../../originRepo/ShowIfUserCanEdit";

import type { ProjectEditor$key } from "@/relay/ProjectEditor.graphql";
import type { ProjectEditorAddProjectMutation } from "@/relay/ProjectEditorAddProjectMutation.graphql";
import type {
	ProjectEditorLinkProjectMutation,
	ProjectEditorLinkProjectMutation$data,
} from "@/relay/ProjectEditorLinkProjectMutation.graphql";
import type { ProjectEditorQuery } from "@/relay/ProjectEditorQuery.graphql";
import type {
	ProjectEditorRemoveProjectMutation,
	ProjectEditorRemoveProjectMutation$data,
} from "@/relay/ProjectEditorRemoveProjectMutation.graphql";

export function ProjectEditor(props: { data: ProjectEditor$key; listOnly?: boolean }) {
	const { router, repositoryId } = useRepoRouterHook();
	const repositoryIdVariable = useRepositoryIdVariable();
	const data = useLazyLoadQuery<ProjectEditorQuery>(
		graphql`
			query ProjectEditorQuery($repositoryId: ID!) {
				repository(id: $repositoryId) {
					projects {
						__id
						edges {
							node {
								id
								name
							}
						}
					}
				}
			}
		`,
		{ ...repositoryIdVariable }
	);
	const allProjects = data.repository;

	const [linkProjectMutation] = useMutation<ProjectEditorLinkProjectMutation>(graphql`
		mutation ProjectEditorLinkProjectMutation(
			$connections: [ID!]!
			$input: LinkToProjectInput!
			$repositoryId: ID!
		) {
			repository(id: $repositoryId) {
				linkToProject(input: $input) {
					node @appendNode(connections: $connections, edgeTypeName: "Project") {
						id
						name
					}
				}
			}
		}
	`);

	const [addProjectMutation] = useMutation<ProjectEditorAddProjectMutation>(graphql`
		mutation ProjectEditorAddProjectMutation(
			$connections: [ID!]!
			$input: AddProjectInput!
			$repositoryId: ID!
		) {
			repository(id: $repositoryId) {
				addProject(input: $input) {
					node @appendNode(connections: $connections, edgeTypeName: "Project") {
						id
						name
					}
				}
			}
		}
	`);

	const [removeProjectMutation] = useMutation<ProjectEditorRemoveProjectMutation>(graphql`
		mutation ProjectEditorRemoveProjectMutation(
			$connections: [ID!]!
			$input: RemoveFromProjectInput!
			$repositoryId: ID!
		) {
			repository(id: $repositoryId) {
				removeFromProject(input: $input) {
					deletedProjectId @deleteEdge(connections: $connections)
				}
			}
		}
	`);

	// const [assignedProjects, refetch] = useRefetchableFragment(
	// 	graphql`
	// 		fragment ProjectEditor on HasProjects
	// 		@refetchable(queryName: "ProjectEditorProjects")
	// 		@argumentDefinitions(first: { type: "Int!" }, after: { type: "String" }) {
	// 			projects(first: $first, after: $after) @connection(key: "ProjectEditor_projects") {
	// 				__id
	// 				edges {
	// 					node {
	// 						id
	// 						name
	// 					}
	// 				}
	// 			}
	// 		}
	// 	`,
	// 	props.data
	// );

	const assignedProjects = useFragment(
		graphql`
			fragment ProjectEditor on HasProjects
			@argumentDefinitions(first: { type: "Int" }, after: { type: "String" }) {
				id
				projects(first: $first, after: $after) @connection(key: "ProjectEditor_projects") {
					__id
					edges {
						node {
							id
							name
						}
					}
				}
				...ShowIfUserCanEdit
			}
		`,
		props.data
	);

	// Get the connection ID using the `__id` field
	const allProjectsConnectionId = allProjects.projects.__id;
	const assignedProjectsConnectionId = assignedProjects.projects.__id;

	const assignedIds = assignedProjects.projects.edges.flatMap((e) =>
		e.node !== null ? e.node.id : []
	);
	const allProjectsDropdown: EuiSelectOption[] = allProjects.projects.edges
		.flatMap((e) =>
			e.node !== null
				? {
						id: e.node.id,
						text: e.node.name,
				  }
				: []
		)
		.filter((p) => !assignedIds.includes(p.id));

	allProjectsDropdown.unshift({ id: "", text: "" });

	const [selectedId, setSelectedId] = useState(allProjectsDropdown[0]?.id ?? undefined);
	const [editProjectAssignment, setEditProjectAssignment] = useState(false);
	const [addProjectMode, setAddProjectMode] = useState(false);

	const closeModal = () => setEditProjectAssignment(false);

	/**
	 * Some changes (assigning a project to a thing, removing a project from a thing) will modify
	 * what is part of the project. To reflect these changes everywhere in the UI these operations
	 * need to invalidate the store entry for that project.
	 */
	function projectInvalidator(id: string) {
		return (
			store: RecordSourceSelectorProxy<
				ProjectEditorLinkProjectMutation$data | ProjectEditorRemoveProjectMutation$data
			>
		) => {
			const project = store.get(id);
			if (project != null) {
				project.invalidateRecord();
			}
		};
	}

	function linkProject(id: string) {
		linkProjectMutation({
			variables: {
				connections: [assignedProjectsConnectionId],
				input: { projectId: id, id: assignedProjects.id },
				...repositoryIdVariable,
			},
			updater: projectInvalidator(id),
		});
	}

	function addProject(name: string) {
		addProjectMutation({
			variables: {
				// Add into both connections
				connections: [assignedProjectsConnectionId, allProjectsConnectionId],
				input: { name, id: assignedProjects.id },
				...repositoryIdVariable,
			},
			onCompleted: () => {
				setAddProjectMode(false);
			},
		});
	}

	function removeProject(id: string) {
		removeProjectMutation({
			variables: {
				connections: [assignedProjectsConnectionId],
				input: { projectId: id, id: assignedProjects.id },
				...repositoryIdVariable,
			},
			updater: projectInvalidator(id),
		});
	}

	let modal: undefined | ReactElement = undefined;
	if (editProjectAssignment) {
		const projectList = (
			<EuiFlexGroup direction={"column"} style={{ display: "inline" }}>
				{assignedProjects.projects.edges.flatMap((e) =>
					e.node !== null ? (
						<EuiFlexItem key={e.node.id}>
							<EuiFlexGroup justifyContent={"spaceBetween"}>
								<EuiFlexItem grow={false}>
									<EuiBadge>{e.node.name}</EuiBadge>
								</EuiFlexItem>
								<EuiFlexItem grow={false}>
									<EuiButtonIcon
										aria-label={"Remove project"}
										iconType={"cross"}
										onClick={() => {
											assertDefined(e.node?.id);
											removeProject(e.node?.id);
										}}
									/>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
					) : (
						[]
					)
				)}
			</EuiFlexGroup>
		);

		const assignProject = (
			<EuiFlexGroup>
				<EuiFlexItem>
					<EuiSelect
						options={allProjectsDropdown}
						onChange={(e) => setSelectedId(e.target.value)}
						value={selectedId}
					/>
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiButton
						disabled={selectedId === ""}
						onClick={() => {
							const id = allProjectsDropdown.find((project) => project.text === selectedId)?.id;
							if (id) {
								linkProject(id);
							}
						}}
					>
						Assign project
					</EuiButton>
				</EuiFlexItem>
			</EuiFlexGroup>
		);

		modal = (
			<EuiModal onClose={closeModal}>
				<EuiModalHeader>
					<EuiModalHeaderTitle>Edit project assignment</EuiModalHeaderTitle>
				</EuiModalHeader>

				<EuiModalBody>
					{addProjectMode ? (
						<ProjectEditorAdd
							onAdd={(name) => {
								addProject(name);
							}}
						/>
					) : (
						<>
							{projectList}
							<EuiSpacer />
							{allProjectsDropdown.length > 1 && assignProject}
						</>
					)}
				</EuiModalBody>

				<EuiModalFooter>
					{!addProjectMode && (
						<EuiButton onClick={() => setAddProjectMode(true)}>Add new project</EuiButton>
					)}
					<EuiButton onClick={closeModal} fill>
						Close
					</EuiButton>
				</EuiModalFooter>
			</EuiModal>
		);
	}

	return (
		<>
			{modal}
			<EuiFlexGroup>
				{assignedProjects.projects.edges.length > 0 ? (
					assignedProjects.projects.edges.flatMap((e) =>
						e.node !== null ? (
							<EuiFlexItem
								key={e.node.id}
								grow={false}
								onClick={() => {
									assertDefined(e.node?.id);
									router.push("/repositories/:repositoryId/projects/:projectId", {
										repositoryId,
										projectId: e.node.id,
									});
								}}
							>
								<EuiBadge>{e.node.name}</EuiBadge>
							</EuiFlexItem>
						) : (
							[]
						)
					)
				) : (
					<>No project assigned</>
				)}

				{!props.listOnly && (
					<ShowIfUserCanEdit metadata={assignedProjects}>
						<EuiFlexItem>
							<EuiButtonIcon
								aria-label={"Edit project"}
								iconType={"documentEdit"}
								onClick={() => setEditProjectAssignment(true)}
							/>
						</EuiFlexItem>
					</ShowIfUserCanEdit>
				)}
			</EuiFlexGroup>
		</>
	);
}
