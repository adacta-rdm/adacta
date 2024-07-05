import { EuiComboBox, EuiFormRow } from "@elastic/eui";
import moment from "moment-timezone";
import React from "react";

interface IProps {
	timezone: string;
	setTimezone: (timezone: string) => void;
}

export function TimezoneSelection(props: IProps) {
	const options = moment.tz.names();

	const { timezone, setTimezone } = props;

	return (
		<EuiFormRow>
			<EuiComboBox
				fullWidth
				isClearable={false}
				singleSelection={{ asPlainText: true }}
				options={options.map((o) => ({ label: o }))}
				onChange={(e) => {
					if (e.length > 0) {
						setTimezone(e[0].label);
					}
				}}
				selectedOptions={[{ label: timezone }]}
			/>
		</EuiFormRow>
	);
}
