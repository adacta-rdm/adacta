import { EuiButton } from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useMutation } from "react-relay";

import { EditNoteModal } from "./EditNoteModal";
import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useRepositoryId } from "../../services/router/UseRepoId";

import type { AddNoteMutation } from "@/relay/AddNoteMutation.graphql";
import { createIDatetime, createMaybeIDatetime } from "~/lib/createDate";

interface IProps {
	thingId: string;
}

export function AddNote(props: PropsWithConnections<IProps>) {
	const [commitAddOrEditMutation, inFlight] = useMutation<AddNoteMutation>(graphql`
		mutation AddNoteMutation($input: AddEditNoteInput!, $repositoryId: ID!, $connections: [ID!]!) {
			repository(id: $repositoryId) {
				addEditNote(input: $input)
					@appendNode(connections: $connections, edgeTypeName: "NoteEdge") {
					...Note
				}
			}
		}
	`);
	const repositoryId = useRepositoryId();
	const [showModal, setShowModal] = useState(false);

	const onClose = () => setShowModal(false);

	return (
		<>
			{showModal && (
				<EditNoteModal
					isLoading={inFlight}
					onClose={() => onClose()}
					existingNote={undefined}
					onSubmit={(caption, text, begin, end) => {
						commitAddOrEditMutation({
							onCompleted: () => onClose(),
							variables: {
								connections: props.connections,
								repositoryId,
								input: {
									id: undefined,
									caption,
									text,
									begin: createIDatetime(begin),
									end: createMaybeIDatetime(end),
									thingId: props.thingId,
								},
							},
						});
					}}
				/>
			)}
			<EuiButton onClick={() => setShowModal(true)}>Add Note</EuiButton>
		</>
	);
}
