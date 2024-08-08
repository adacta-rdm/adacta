import {
	EuiButton,
	EuiFilterButton,
	EuiFlexGroup,
	EuiFormRow,
	EuiIcon,
	EuiPopover,
	EuiSpacer,
} from "@elastic/eui";
import moment from "moment/moment";
import { useState } from "react";

import { DatePickerRange } from "~/apps/desktop-app/src/components/datepicker/DatePicker";

interface IDateSearchFilter {
	startDate: Date | undefined;
	endDate: Date | undefined;
	setStartDate: (date: Date | undefined) => void;
	setEndDate: (date: Date | undefined) => void;
	showIcon?: boolean;
	customLabel?: string;
	description?: string;
}
export function DateSearchFilter({
	startDate,
	endDate,
	setStartDate,
	setEndDate,
	showIcon,
	customLabel,
	description,
}: IDateSearchFilter) {
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const filterIsActive = startDate !== undefined || endDate !== undefined;

	const button = (
		<EuiFilterButton
			hasActiveFilters={filterIsActive}
			onClick={() => setIsPopoverOpen(!isPopoverOpen)}
			iconType={"arrowDown"}
		>
			<EuiFlexGroup alignItems={"center"} gutterSize={"s"}>
				{customLabel ?? "Date"}
				{showIcon && (
					<EuiIcon
						type={"calendar"}
						className="eui-alignMiddle"
						color={filterIsActive ? "success" : "text"}
					/>
				)}
			</EuiFlexGroup>
		</EuiFilterButton>
	);
	return (
		<EuiPopover button={button} isOpen={isPopoverOpen} closePopover={() => setIsPopoverOpen(false)}>
			<EuiFormRow label="Date range" helpText={description}>
				<DatePickerRange
					startDate={moment(startDate)}
					endDate={moment(endDate)}
					rangeValueStart={startDate}
					rangeValueEnd={endDate}
					onChangeRangeStart={(e) => {
						setStartDate(e);
					}}
					onChangeRangeEnd={(e) => {
						setEndDate(e);
					}}
				/>
			</EuiFormRow>
			<EuiSpacer size={"s"} />
			<EuiFlexGroup justifyContent={"flexEnd"}>
				<EuiButton
					size={"s"}
					type={"reset"}
					onClick={() => {
						setStartDate(undefined);
						setEndDate(undefined);
					}}
				>
					Clear
				</EuiButton>
			</EuiFlexGroup>
		</EuiPopover>
	);
}
