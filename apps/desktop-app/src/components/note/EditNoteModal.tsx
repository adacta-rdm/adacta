import {
	EuiButton,
	EuiButtonEmpty,
	EuiFieldText,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSwitch,
} from "@elastic/eui";
import React, { useState } from "react";

import type { IExistingNote } from "./IExistingNote";
import { DatePicker } from "../datepicker/DatePicker";
import { AdactaMarkdownEditor } from "../markdown/AdactaMarkdownEditor";

interface IProps {
	isLoading: boolean;

	// Properties for editing an existing property
	existingNote?: IExistingNote;

	onClose: () => void;
	onSubmit: (caption: string, text: string, begin: Date, end?: Date) => void;
}

export function EditNoteModal(props: IProps) {
	const [caption, setCaption] = useState(props.existingNote?.caption ?? "");
	const [text, setText] = useState(props.existingNote?.text ?? "");
	const [begin, setBegin] = useState(props.existingNote?.begin ?? new Date());
	const [end, setEnd] = useState(
		props.existingNote?.end ?? new Date(new Date().getTime() + 1000 * 60 * 60 * 24)
	);
	const [isOpenEnd, setIsOpenEnd] = useState(props.existingNote?.end === undefined);

	const dateRangeInvalid = end !== undefined && begin >= end && !isOpenEnd;

	const submit = () => {
		props.onSubmit(caption, text, begin, isOpenEnd ? undefined : end);
	};

	return (
		<EuiModal maxWidth={"90vw"} onClose={props.onClose} style={{ minWidth: "600px" }}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>
					{props.existingNote === undefined ? "Add" : "Edit"} Note
				</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiFormRow fullWidth label="Caption">
					<EuiFieldText value={caption} onChange={(e) => setCaption(e.target.value)} />
				</EuiFormRow>
				<EuiFormRow fullWidth label={"Text"} id={"textLabel"}>
					<AdactaMarkdownEditor
						aria-labelledby={"textLabel"}
						value={text}
						onChange={(text) => setText(text)}
					/>
				</EuiFormRow>
				<EuiFormRow fullWidth label="Begin">
					<DatePicker
						fullWidth
						showTimeSelect
						value={begin}
						onChange={(date) => {
							setBegin(date);
						}}
						adjustDateOnChange={false}
						//injectTimes={generateTimestamps()}
						isInvalid={dateRangeInvalid}
					/>
				</EuiFormRow>
				<EuiFormRow fullWidth label="End date">
					<EuiSwitch
						label={"Specify an end date"}
						checked={!isOpenEnd}
						onChange={(e) => {
							setIsOpenEnd(!e.target.checked);
						}}
					/>
				</EuiFormRow>
				<EuiFormRow fullWidth label="End">
					<DatePicker
						fullWidth
						disabled={isOpenEnd}
						showTimeSelect
						value={end}
						onChange={(date) => {
							setEnd(date);
						}}
						isInvalid={dateRangeInvalid}
					/>
				</EuiFormRow>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButtonEmpty onClick={props.onClose} isDisabled={props.isLoading}>
					Cancel
				</EuiButtonEmpty>
				<EuiButton fill onClick={submit} disabled={!caption || !text} isLoading={props.isLoading}>
					{props.existingNote === undefined ? "Add" : "Save"} Note
				</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
