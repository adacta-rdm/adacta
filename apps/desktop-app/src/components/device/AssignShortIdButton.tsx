import { EuiButton, EuiButtonEmpty, EuiButtonIcon } from "@elastic/eui";
import React from "react";
import { graphql, useMutation } from "react-relay";

import { useService } from "../../services/ServiceProvider";
import { useRepositoryId } from "../../services/router/UseRepoId";
import { ToasterService } from "../../services/toaster/ToasterService";

import type { AssignShortIdButtonMutation } from "@/relay/AssignShortIdButtonMutation.graphql";

export function AssignShortIdButton(props: {
	currentShortId?: string;
	deviceId: string;

	buttonStyle?: "icon" | "link";
	size?: "s";
}) {
	const repositoryId = useRepositoryId();
	const toaster = useService(ToasterService);

	const [commitRequestShortId] = useMutation<AssignShortIdButtonMutation>(graphql`
		mutation AssignShortIdButtonMutation($repositoryId: ID!, $deviceId: ID!) {
			repository(id: $repositoryId) {
				requestShortId(id: $deviceId) {
					... on Device {
						__typename
						id
						shortId
					}
					... on Error {
						__typename
						message
					}
				}
			}
		}
	`);

	const requestShortId = () => {
		commitRequestShortId({
			variables: { repositoryId, deviceId: props.deviceId },
			onCompleted: (data) => {
				if (data.repository.requestShortId.__typename === "Error") {
					toaster.addToast("Error", data.repository.requestShortId.message, "danger");
				}
			},
		});
	};

	if (props.buttonStyle === "icon") {
		return (
			<EuiButtonIcon
				iconType={"lettering"}
				disabled={!!props.currentShortId}
				onClick={() => requestShortId()}
				aria-label={"Assign Short ID"}
			/>
		);
	} else if (props.buttonStyle === "link") {
		return (
			<EuiButtonEmpty
				onClick={() => requestShortId()}
				disabled={!!props.currentShortId}
				size={props.size}
			>
				Assign Short ID
			</EuiButtonEmpty>
		);
	} else {
		return (
			<EuiButton
				onClick={() => requestShortId()}
				disabled={!!props.currentShortId}
				size={props.size}
			>
				Assign Short ID
			</EuiButton>
		);
	}
}
