import {
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSpacer,
	EuiSuperSelect,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useFragment } from "react-relay";
import type { ArrayElement } from "type-fest/source/internal";

import { NoteComparison } from "./NoteComparison";
import { DateTime } from "../../datetime/DateTime";
import type { INote } from "../IExistingNote";

import type { NoteRevisions$data, NoteRevisions$key } from "@/relay/NoteRevisions.graphql";
import { createDate, createMaybeDate } from "~/lib/createDate";

type TComparison = [INoteWithAdditionalInfo, INoteWithAdditionalInfo];

// Union type for data returned from GraphQL (either current/toplevel note or an older revision)
type TGraphQLNoteInfo = NoteRevisions$data | ArrayElement<NoteRevisions$data["revisions"]>;

interface INoteWithAdditionalInfo extends INote {
	creationTimestamp: Date;
	metadata: TGraphQLNoteInfo["metadata"];
}

interface IProps {
	note: NoteRevisions$key;

	onClose: () => void;
}

export function NoteRevisions(props: IProps) {
	const data = useFragment(
		graphql`
			fragment NoteRevisions on Note {
				caption
				text
				begin
				end
				metadata {
					creationTimestamp
					creator {
						name
					}
				}
				revisions {
					text
					caption
					begin
					end
					metadata {
						creationTimestamp
						creator {
							name
						}
					}
				}
			}
		`,
		props.note
	);

	// Helper function (mainly) to convert information about the current note and older revisions
	// to a common type
	const graphqlToNote = (data: TGraphQLNoteInfo): INoteWithAdditionalInfo => {
		const { caption, text, begin, end } = data;
		return {
			caption,
			text,
			begin: createMaybeDate(begin),
			end: createMaybeDate(end),
			creationTimestamp: createDate(data.metadata.creationTimestamp),
			metadata: data.metadata,
		};
	};

	// Add all revisions
	const revisions: INoteWithAdditionalInfo[] = data.revisions.map((r) => graphqlToNote(r));
	// Note itself
	revisions.push(graphqlToNote(data));

	function getRevisionCandidate(note: INoteWithAdditionalInfo): TComparison {
		const i = revisions.findIndex(
			// Identify revision based on creationTimestamp
			(n) => n.creationTimestamp.getTime() === note.creationTimestamp.getTime()
		);

		return [revisions[i - 1], revisions[i]];
	}

	const [index, setIndex] = useState(0);
	// + 1 since the index is based on the sliced version of the revisions
	const comparison = getRevisionCandidate(revisions[index + 1]);

	return (
		<>
			<EuiModal onClose={props.onClose}>
				<EuiModalHeader>
					<EuiModalHeaderTitle>Change History</EuiModalHeaderTitle>
				</EuiModalHeader>

				<EuiModalBody>
					<EuiFormRow label={"Change"}>
						<EuiSuperSelect
							valueOfSelected={String(index)}
							onChange={(value) => {
								const index = Number(value);
								setIndex(index);
							}}
							options={revisions.slice(1).map((r, index) => ({
								value: String(index),
								inputDisplay: (
									<>
										<DateTime date={r.creationTimestamp} /> {r.metadata.creator.name}
									</>
								),
							}))}
						/>
					</EuiFormRow>
					<EuiSpacer size={"xl"} />
					{comparison !== undefined && (
						<NoteComparison revisionA={comparison[0]} revisionB={comparison[1]} />
					)}
				</EuiModalBody>

				<EuiModalFooter></EuiModalFooter>
			</EuiModal>
		</>
	);
}
