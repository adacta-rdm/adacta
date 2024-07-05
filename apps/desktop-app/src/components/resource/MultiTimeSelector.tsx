import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiRange } from "@elastic/eui";
import React, { useEffect, useState } from "react";

import { secondsToHMS } from "../../utils/secondsToHMS";

interface IProps {
	value: number;
	onChange: (value: number) => void;
}

export function MultiTimeSelector(props: IProps) {
	const { value, onChange } = props;

	const [hour, min, sec] = secondsToHMS(value);
	const [_hour, _setHour] = useState(hour);
	const [_min, _setMin] = useState(min);
	const [_sec, _setSec] = useState(sec);

	useEffect(() => {
		const time = _sec + _min * 60 + _hour * 60 * 60;
		if (time !== value) {
			onChange(time);
		}
	}, [_hour, _min, _sec, value, onChange]);

	return (
		<EuiFlexGroup>
			<EuiFlexItem>
				<EuiFormRow label={"Hours"}>
					<EuiRange
						min={0}
						max={24}
						step={1}
						value={_hour}
						onChange={(e: any) => {
							// EUI Types are strange for this onChange handler and don't provide a
							// value for some event types
							// TODO: Check why this is the case
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							_setHour(Number(e.target.value));
						}}
						showLabels
						showInput={true}
					/>
				</EuiFormRow>
			</EuiFlexItem>
			<EuiFlexItem>
				<EuiFormRow label={"Minutes"}>
					<EuiRange
						min={0}
						max={59}
						step={1}
						value={_min}
						onChange={(e: any) => {
							// EUI Types are strange for this onChange handler and don't provide a
							// value for some event types
							// TODO: Check why this is the case
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							_setMin(Number(e.target.value));
						}}
						showLabels
						showInput={true}
					/>
				</EuiFormRow>
			</EuiFlexItem>
			<EuiFlexItem>
				<EuiFormRow label={"Seconds"}>
					<EuiRange
						min={0}
						max={59}
						step={1}
						value={_sec}
						onChange={(e: any) => {
							// EUI Types are strange for this onChange handler and don't provide a
							// value for some event types
							// TODO: Check why this is the case
							// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
							_setSec(Number(e.target.value));
						}}
						showLabels
						showInput={true}
					/>
				</EuiFormRow>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
