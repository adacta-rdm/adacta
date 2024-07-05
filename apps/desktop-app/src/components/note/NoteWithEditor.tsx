import React, { useState } from "react";
import { useFragment, useMutation } from "react-relay";
import { graphql } from "react-relay";

import { EditNoteModal } from "./EditNoteModal";
import type { IExistingNote } from "./IExistingNote";
import { Note } from "./Note";
import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useRepositoryId } from "../../services/router/UseRepoId";

import type { NoteWithEditorAddOrEditMutation } from "@/relay/NoteWithEditorAddOrEditMutation.graphql";
import type { NoteWithEditorDeleteMutation } from "@/relay/NoteWithEditorDeleteMutation.graphql";
import type { NoteWithEditorFragment$key } from "@/relay/NoteWithEditorFragment.graphql";
import { createIDatetime, createMaybeDate, createMaybeIDatetime } from "~/lib/createDate";

interface IProps {
	thingId: string;

	note: NoteWithEditorFragment$key;

	onDelete?: () => void;
}

export function NoteWithEditor(props: PropsWithConnections<IProps, true>) {
	const connections = props.connections ?? [];
	const repositoryId = useRepositoryId();
	const data = useFragment(
		graphql`
			fragment NoteWithEditorFragment on Note {
				...Note

				id
				caption
				text

				begin
				end
			}
		`,

		props.note
	);
	const [showModal, setShowModal] = useState(false);

	const existingNote: IExistingNote = {
		id: data.id,
		caption: data.caption,
		text: data.text,
		begin: createMaybeDate(data.begin),
		end: createMaybeDate(data.end),
	};

	const [commitAddOrEditMutation, inFlight] = useMutation<NoteWithEditorAddOrEditMutation>(graphql`
		mutation NoteWithEditorAddOrEditMutation(
			$input: AddEditNoteInput!
			$repositoryId: ID!
			$connections: [ID!]!
		) {
			repository(id: $repositoryId) {
				addEditNote(input: $input)
					@appendNode(connections: $connections, edgeTypeName: "NoteEdge") {
					...Note
				}
			}
		}
	`);

	const [deleteMutation] = useMutation<NoteWithEditorDeleteMutation>(graphql`
		mutation NoteWithEditorDeleteMutation($noteId: ID!, $repositoryId: ID!, $connections: [ID!]!) {
			repository(id: $repositoryId) {
				deleteNote(id: $noteId) {
					deletedId @deleteEdge(connections: $connections)
				}
			}
		}
	`);

	return (
		<>
			<Note
				note={data}
				editNote={() => {
					setShowModal(true);
				}}
				deleteNote={(id) => {
					deleteMutation({
						variables: {
							connections,
							repositoryId,
							noteId: id,
						},
						onCompleted: () => {
							if (props.onDelete) props.onDelete();
						},
					});
				}}
				offerHistory={true}
			/>
			{showModal && (
				<EditNoteModal
					isLoading={inFlight}
					onClose={() => setShowModal(false)}
					existingNote={existingNote}
					onSubmit={(caption, text, begin, end) => {
						commitAddOrEditMutation({
							onCompleted: () => setShowModal(false),
							variables: {
								connections,
								repositoryId,
								input: {
									id: existingNote.id,
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
		</>
	);
}
