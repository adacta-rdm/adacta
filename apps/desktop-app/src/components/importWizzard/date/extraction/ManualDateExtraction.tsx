import {
	EuiButtonIcon,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiToolTip,
} from "@elastic/eui";
import React from "react";

import { DatePicker } from "../../../datepicker/DatePicker";

export interface IDateState {
	date?: Date;
	setDate: (date: Date) => void;
}

export function ManualDateExtraction(props: {
	disabled?: boolean;

	state?: {
		begin: IDateState;
		end: IDateState;
	};

	turnFirstColumnIntoXColumn?: () => void;
}) {
	return (
		<EuiFlexGroup>
			<EuiFlexItem>
				<EuiFormRow label={"Begin of recording"}>
					<DateDisplay disabled={props.disabled} date={props.state?.begin} />
				</EuiFormRow>
			</EuiFlexItem>
			<EuiFlexItem>
				<EuiFormRow label={"End of recording"}>
					<DateDisplay disabled={props.disabled} date={props.state?.end} />
				</EuiFormRow>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}

function DateDisplay(props: {
	date?: IDateState;
	disabled?: boolean;
	turnFirstColumnIntoXColumn?: () => void;
}) {
	if (props.disabled) {
		return (
			<EuiToolTip
				content={
					"Automatically detected from date time data. Requires a non-date independent variable column to set manually. Click the button to turn first column into an independent variable of type number."
				}
			>
				<EuiFieldText
					value={"Determined by values in date column"}
					disabled={true}
					append={
						props.turnFirstColumnIntoXColumn ? (
							<EuiButtonIcon
								onClick={props.turnFirstColumnIntoXColumn}
								iconType={"visTable"}
								title={"Turn first column into independent variable of the type number"}
								aria-label={"Turn first column into independent variable of the type number"}
							/>
						) : undefined
					}
				/>
			</EuiToolTip>
		);
	} else if (props.date?.date) {
		return <DatePicker value={props.date.date} onChange={props.date.setDate} />;
	}

	return <></>;
}
