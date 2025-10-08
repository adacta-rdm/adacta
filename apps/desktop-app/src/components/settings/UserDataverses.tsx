import type { EuiBasicTableColumn } from "@elastic/eui";
import { EuiButtonIcon } from "@elastic/eui";
import { EuiSpacer } from "@elastic/eui";
import { EuiButton, EuiModalFooter } from "@elastic/eui";
import { EuiFieldPassword } from "@elastic/eui";
import { EuiFieldText } from "@elastic/eui";
import { EuiFormRow, EuiModalBody } from "@elastic/eui";
import { EuiModalHeader, EuiModalHeaderTitle } from "@elastic/eui";
import { EuiModal } from "@elastic/eui";
import { EuiBasicTable } from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { UserDataverses$key } from "@/relay/UserDataverses.graphql";
import type { UserDataversesDeleteMutation } from "@/relay/UserDataversesDeleteMutation.graphql";
import type { UserDataversesMutation } from "@/relay/UserDataversesMutation.graphql";
import { connectionToArray } from "~/apps/desktop-app/src/utils/connectionToArray";
import type { ArrayElementType } from "~/lib/interface/ArrayElementType";

const UserDataversesGraphQLFragment = graphql`
	fragment UserDataverses on CurrentUser {
		payload {
			dataverses {
				__id
				# Used by connectionToArray
				# eslint-disable-next-line relay/unused-fields
				edges {
					node {
						__typename
						name
						id
						url
						tokenPreview
					}
				}
			}
		}
	}
`;

interface IProps {
	currentUser: UserDataverses$key;
}

export function UserDataverses(props: IProps) {
	const currentUser = useFragment(UserDataversesGraphQLFragment, props.currentUser);
	const dataverses = connectionToArray(currentUser.payload.dataverses);

	const [modal, setModal] = useState<
		undefined | { type: "new" } | { type: "edit"; data: UserDataverseConnection & { id: string } }
	>(undefined);

	const [mutate] = useMutation<UserDataversesMutation>(graphql`
		mutation UserDataversesMutation(
			$insert: Insert_UserDataverseConnectionInput
			$update: Update_UserDataverseConnectionInput
			$connections: [ID!]!
		) {
			upsertUserDataverseConnection(insert: $insert, update: $update) {
				node @appendNode(edgeTypeName: "Edge_UserDataverseConnection", connections: $connections) {
					__typename
					name
					id
					url
					tokenPreview
				}
			}
		}
	`);

	const [deleteDataverse] = useMutation<UserDataversesDeleteMutation>(graphql`
		mutation UserDataversesDeleteMutation($id: ID!, $connections: [ID!]!) {
			deleteUserDataverseConnection(id: $id) {
				deletedId @deleteEdge(connections: $connections)
			}
		}
	`);

	type Row = ArrayElementType<typeof dataverses>;
	const columns: EuiBasicTableColumn<Row>[] = [
		{
			field: "name",
			name: "Name",
		},
		{
			field: "url",
			name: "URL",
		},
		{
			field: "tokenPreview",
			name: "Token",
		},
		{
			name: "",
			render: (row: Row) => {
				return (
					<>
						<EuiButtonIcon
							iconType={"pencil"}
							onClick={() => {
								setModal({
									type: "edit",
									data: { id: row.id, url: row.url, name: row.name, token: "" },
								});
							}}
						></EuiButtonIcon>
						<EuiButtonIcon
							iconType={"trash"}
							aria-label="Delete"
							color="danger"
							onClick={() => {
								deleteDataverse({
									variables: {
										id: row.id,
										connections: [currentUser.payload.dataverses.__id],
									},
								});
							}}
						/>
					</>
				);
			},
		},
	];

	return (
		<>
			{modal !== undefined && (
				<CreateModal
					onClose={() => {
						setModal(undefined);
					}}
					initialValues={modal.type === "edit" ? modal.data : undefined}
					onSave={(dataverse) => {
						if (modal?.type === "new") {
							mutate({
								variables: {
									insert: { input: dataverse },
									connections: [currentUser.payload.dataverses.__id],
								},
							});
						} else if (modal?.type === "edit") {
							mutate({
								variables: {
									update: { id: modal.data.id, input: dataverse },
									connections: [currentUser.payload.dataverses.__id],
								},
							});
						}
					}}
				/>
			)}
			<EuiBasicTable items={dataverses} columns={columns} />
			<EuiSpacer />
			<EuiButton
				onClick={() => {
					setModal({ type: "new" });
				}}
			>
				Add Dataverse Connection
			</EuiButton>
		</>
	);
}

/**
 * Validates the URL and removes the trailing slash if it exists.
 */
const validateURL = (url: string) => {
	try {
		new URL(url);
		if (url.endsWith("/")) {
			return url.slice(0, -1);
		}
		return url;
	} catch (e) {
		return undefined;
	}
};

type UserDataverseConnection = {
	name: string;
	url: string;
	token: string;
};
function CreateModal(props: {
	onClose: () => void;
	onSave: (data: UserDataverseConnection) => void;
	initialValues?: UserDataverseConnection;
}) {
	const [name, setName] = useState(props.initialValues?.name ?? "");
	const [url, setUrl] = useState(props.initialValues?.url ?? "");
	const [token, setToken] = useState("");

	const validatedURL = validateURL(url);

	return (
		<EuiModal onClose={props.onClose}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Configure Dataverse Connection</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiFormRow label={"Name"}>
					<EuiFieldText value={name} onChange={(e) => setName(e.target.value)} />
				</EuiFormRow>
				<EuiFormRow
					label={"URL"}
					helpText={"Enter the URL of your Dataverse instance, e.g. https://dataverse.harvard.edu"}
				>
					<EuiFieldText
						value={url}
						onChange={(e) => {
							setUrl(e.target.value);
						}}
						isInvalid={url !== "" && validatedURL === undefined}
					/>
				</EuiFormRow>
				<EuiFormRow label={"Token"}>
					<EuiFieldPassword
						value={token}
						onChange={(e) => {
							// It looks like the token often contains whitespace when copied, so we trim it here.
							setToken(e.target.value.trim());
						}}
						placeholder={
							props.initialValues !== undefined ? "Leave empty to keep the old token" : undefined
						}
					/>
				</EuiFormRow>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButton onClick={props.onClose}>Cancel</EuiButton>
				<EuiButton
					disabled={
						name === "" ||
						(token === "" && props.initialValues === undefined) || // Empty token is allowed for existing dataverses (old token remains unchanged)
						validatedURL === undefined
					}
					fill
					onClick={() => {
						if (validatedURL !== undefined) {
							props.onSave({ name, url: validatedURL, token });
							props.onClose();
						}
					}}
				>
					Save
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
