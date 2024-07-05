import { EuiFlexGroup, EuiFlexItem } from "@elastic/eui";
import React from "react";
import { graphql, useFragment } from "react-relay";

import { ProjectEditor } from "./ProjectEditor";

import type { ProjectEditorAsHeaderElement$key } from "@/relay/ProjectEditorAsHeaderElement.graphql";

export function ProjectEditorAsHeaderElement(props: {
	data: ProjectEditorAsHeaderElement$key;
	listOnly?: boolean;
}) {
	const data = useFragment(
		graphql`
			fragment ProjectEditorAsHeaderElement on HasProjects {
				...ProjectEditor
			}
		`,
		props.data
	);

	return (
		<EuiFlexGroup>
			<EuiFlexItem grow={false}>Projects:</EuiFlexItem>
			<EuiFlexItem>
				<ProjectEditor data={data} listOnly={props.listOnly} />
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
