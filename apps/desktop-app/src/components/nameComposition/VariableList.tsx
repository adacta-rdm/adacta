import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer } from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { BuildingBlock } from "./BuildingBlock";
import type { IUpdateExistingConstant } from "./UpsertConstant";
import { UpsertConstant } from "./UpsertConstant";
import type { IUpdateExistingVariable } from "./UpsertVariable";
import { UpsertVariable } from "./UpsertVariable";
import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useRepositoryId } from "../../services/router/UseRepoId";

import type { VariableList$key } from "@/relay/VariableList.graphql";

interface IProps {
	data: VariableList$key;
}

export function VariableList(props: PropsWithConnections<IProps>) {
	const repositoryId = useRepositoryId();
	const [showAddConstant, setShowAddConstant] = useState<boolean>(false);
	const [showAddVariable, setShowAddVariable] = useState<boolean>(false);

	const [showUpdateConstant, setShowUpdateConstant] = useState<IUpdateExistingConstant | undefined>(
		undefined
	);

	const [showUpdateVariable, setShowUpdateVariable] = useState<IUpdateExistingVariable | undefined>(
		undefined
	);

	const [deleteVariable] = useMutation(
		graphql`
			mutation VariableListDeleteVariableMutation(
				$id: ID!
				$connections: [ID!]!
				$repositoryId: ID!
			) {
				repository(id: $repositoryId) {
					deleteNameCompositionVariable(id: $id) {
						deletedId @deleteEdge(connections: $connections)
					}
				}
			}
		`
	);

	const data = useFragment(
		graphql`
			fragment VariableList on Connection_NameCompositionVariable {
				edges {
					node {
						id
						name
						...BuildingBlock
					}
				}
			}
		`,
		props.data
	);

	return (
		<>
			<EuiFlexGroup>
				<EuiFlexItem>
					<EuiButton onClick={() => setShowAddConstant(true)}>Add Constant</EuiButton>
				</EuiFlexItem>
				<EuiFlexItem>
					<EuiButton onClick={() => setShowAddVariable(true)}>Add Variable</EuiButton>
				</EuiFlexItem>
			</EuiFlexGroup>

			{showAddConstant && (
				<UpsertConstant onClose={() => setShowAddConstant(false)} connections={props.connections} />
			)}
			{showUpdateConstant && (
				<UpsertConstant
					onClose={() => setShowUpdateConstant(undefined)}
					existingConstant={showUpdateConstant}
					connections={props.connections}
				/>
			)}
			{showAddVariable && (
				<UpsertVariable onClose={() => setShowAddVariable(false)} connections={props.connections} />
			)}
			{showUpdateVariable && (
				<UpsertVariable
					onClose={() => setShowUpdateVariable(undefined)}
					existingVariable={showUpdateVariable}
					connections={props.connections}
				/>
			)}

			<EuiSpacer />
			<EuiFlexGroup direction={"column"}>
				{data.edges.flatMap(({ node }) => {
					return (
						<EuiFlexItem>
							<BuildingBlock
								data={node}
								onEdit={({ type, value }) => {
									const common = { id: value.id, name: value.name };
									if (type === "constant") {
										setShowUpdateConstant({ ...common, value: value.value });
									} else if (type === "variable") {
										setShowUpdateVariable({
											...common,
											alias: value.alias,
											prefix: value.prefix,
											suffix: value.suffix,
										});
									}
								}}
								onDelete={() => {
									deleteVariable({
										variables: {
											id: node.id,
											connections: props.connections,
											repositoryId,
										},
									});
								}}
							/>
						</EuiFlexItem>
					);
				})}
			</EuiFlexGroup>
		</>
	);
}
