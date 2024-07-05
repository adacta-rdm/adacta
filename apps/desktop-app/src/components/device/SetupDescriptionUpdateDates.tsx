import { EuiButton, EuiFormRow, EuiSwitch } from "@elastic/eui";
import React, { useState } from "react";

import { DatePicker } from "../datepicker/DatePicker";

export function SetupDescriptionUpdateDates(props: {
	initialBegin?: Date;
	initialEnd?: Date;
	submitDisabled?: boolean;
	onSubmit: (imageBegin: Date, imageEnd?: Date) => void;
}) {
	const [imageBegin, setImageBegin] = useState<Date>(
		props.initialBegin ?? new Date(Date.now() - 24 * 60 * 60 * 1000)
	);
	const [imageEnd, setImageEnd] = useState<Date>(props.initialEnd ?? new Date());
	const [imageOpenEnd, setImageOpenEnd] = useState(!props.initialEnd);

	const timesInvalid = imageBegin >= imageEnd && !imageOpenEnd;

	return (
		<>
			<EuiFormRow fullWidth label="Start date">
				<DatePicker
					preventOpenOnFocus={true}
					showTimeSelect
					value={imageBegin}
					isInvalid={timesInvalid}
					onChange={(e) => {
						setImageBegin(e);
					}}
				/>
			</EuiFormRow>
			<EuiFormRow fullWidth label="End date">
				<DatePicker
					showTimeSelect
					disabled={imageOpenEnd}
					value={imageEnd}
					isInvalid={timesInvalid}
					onChange={(e) => {
						setImageEnd(e);
					}}
				/>
			</EuiFormRow>
			<EuiFormRow fullWidth label="Not removed yet">
				<EuiSwitch
					label={"Is setup image still the current one?"}
					checked={imageOpenEnd}
					onChange={(e) => setImageOpenEnd(e.target.checked)}
				/>
			</EuiFormRow>
			<EuiFormRow>
				<EuiButton
					disabled={imageBegin >= imageEnd || props.submitDisabled}
					onClick={() => {
						props.onSubmit(imageBegin, imageOpenEnd ? undefined : imageEnd);
					}}
				>
					Save
				</EuiButton>
			</EuiFormRow>
		</>
	);
}
