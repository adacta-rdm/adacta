import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText } from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import React, { useState } from "react";
import { graphql, useFragment } from "react-relay";

import type { IExistingNote } from "./IExistingNote";
import { NoteRevisions } from "./comparison/NoteRevisions";
import { AdactaMarkdownFormat } from "../markdown/AdactaMarkdownFormat";

import type { Note$key } from "@/relay/Note.graphql";
import { createMaybeDate } from "~/lib/createDate";

interface IProps {
	note: Note$key;

	editNote?: (note: IExistingNote) => void;
	deleteNote?: (id: string) => void;

	offerHistory?: boolean;
}

export function Note(props: IProps) {
	const data = useFragment(
		graphql`
			fragment Note on Note {
				__typename
				id
				caption
				text
				begin
				end
				revisions {
					text
					caption
					begin
					end
				}
				...NoteRevisions
			}
		`,
		props.note
	);

	const { id, caption, text, begin, end } = data;

	const [showHistory, setShowHistory] = useState(false);

	return (
		<>
			<EuiText size="s">
				<h2>{caption}</h2>
			</EuiText>
			<AdactaMarkdownFormat>{text}</AdactaMarkdownFormat>
			<EuiSpacer size={"s"} />

			<EuiFlexGroup justifyContent={"flexEnd"}>
				{props.editNote && (
					<EuiFlexItem grow={false}>
						<EuiLink
							onClick={() => {
								assertDefined(props.editNote);
								props.editNote({
									id,
									caption,
									text,
									begin: createMaybeDate(begin),
									end: createMaybeDate(end),
								});
							}}
						>
							Edit
						</EuiLink>
					</EuiFlexItem>
				)}
				{props.deleteNote && (
					<EuiFlexItem grow={false}>
						<EuiLink
							onClick={() => {
								assertDefined(props.deleteNote);
								props.deleteNote(id);
							}}
						>
							Delete
						</EuiLink>
					</EuiFlexItem>
				)}
				{props.offerHistory && data.revisions.length > 0 && (
					<EuiFlexItem grow={false}>
						<EuiLink
							onClick={() => {
								setShowHistory(true);
							}}
						>
							Show changes
						</EuiLink>
					</EuiFlexItem>
				)}
			</EuiFlexGroup>
			{showHistory && <NoteRevisions note={data} onClose={() => setShowHistory(false)} />}
		</>
	);
}
