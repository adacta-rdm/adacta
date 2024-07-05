import assert from "assert";

import {
	EuiButton,
	EuiButtonEmpty,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSuperSelect,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import { useRepositoryIdVariable } from "../../../services/router/UseRepoId";
import { DateTime } from "../../datetime/DateTime";

import type { RemoveComponentModalQuery } from "@/relay/RemoveComponentModalQuery.graphql";
import { createDate, createMaybeDate } from "~/lib/createDate";

const RemoveComponentModalGraphQLQuery = graphql`
	query RemoveComponentModalQuery(
		$repositoryId: ID!
		$topLevelDeviceId: ID!
		$pathFromTopLevelDevice: [String!]!
	) {
		repository(id: $repositoryId) {
			device(id: $topLevelDeviceId) {
				name
				componentsInSlot(path: $pathFromTopLevelDevice) {
					component {
						__typename
						... on Device {
							id
							name
						}
						... on Sample {
							id
							name
						}
					}
					installDate
					removeDate
				}
			}
		}
	}
`;

interface IProps {
	topLevelDeviceId: string;
	pathFromTopLevelDevice: string[];
	onClose: () => void;
	onSubmit: (componentID: string, start: Date, end?: Date) => void;
}

export function RemoveComponentModal(props: IProps) {
	const repositoryIdVariable = useRepositoryIdVariable();
	const data = useLazyLoadQuery<RemoveComponentModalQuery>(
		RemoveComponentModalGraphQLQuery,
		{
			topLevelDeviceId: props.topLevelDeviceId,
			pathFromTopLevelDevice: props.pathFromTopLevelDevice,
			...repositoryIdVariable,
		}
		// { fetchPolicy: "network-only" }
	);

	const [usageIndex, setUsageIndex] = useState<number>(0);

	const { device } = data.repository;

	return (
		<EuiModal maxWidth={"90vw"} onClose={props.onClose} style={{ minWidth: "600px" }}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Remove component from {device.name}</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiFormRow fullWidth label="Usage to remove" display="columnCompressed">
					<EuiSuperSelect
						fullWidth
						options={device.componentsInSlot.map(({ component, installDate, removeDate }, i) => {
							assert(component.__typename !== "%other");
							return {
								value: String(i),
								inputDisplay: (
									<>
										{component.name} <DateTime date={createDate(installDate)} /> -{" "}
										{removeDate ? <DateTime date={createDate(removeDate)} /> : "now"}
									</>
								),
							};
						})}
						valueOfSelected={String(usageIndex)}
						onChange={(i) => setUsageIndex(Number(i))}
						hasDividers
					/>
				</EuiFormRow>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButtonEmpty onClick={props.onClose}>Cancel</EuiButtonEmpty>
				<EuiButton
					fill
					onClick={() => {
						const componentInSlot = device.componentsInSlot[usageIndex];
						assert(componentInSlot.component.__typename !== "%other");
						props.onSubmit(
							componentInSlot.component.id,
							createDate(componentInSlot.installDate),
							createMaybeDate(componentInSlot.removeDate)
						);
					}}
				>
					Remove selected usage
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
