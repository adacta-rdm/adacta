import {
	EuiDatePicker,
	EuiFlexGroup,
	EuiFlexItem,
	EuiIcon,
	EuiLink,
	EuiText,
	EuiTextAlign,
} from "@elastic/eui";
import type { EuiDatePickerProps } from "@elastic/eui/src/components/date_picker/date_picker";
import moment from "moment";
import React from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import type { DatePickerQuery } from "@/relay/DatePickerQuery.graphql";

interface IPropsPure extends IProps<Date | undefined> {
	locale: string;
}

const query = graphql`
	query DatePickerQuery {
		currentUser {
			payload {
				timeSetting {
					locale
				}
			}
		}
	}
`;

// TValue is either Date or Date | undefined
interface IProps<TValue> {
	value: TValue;
	/**
	 *  Enable special styling if the date picker is part of a EuiDatePickerRange
	 */
	partOfRange?: boolean;
}

type DatePickerProps = Omit<
	EuiDatePickerProps,
	"selected" | "onChange" | "value" | "locale" | "dateFormat" | "timeFormat"
>;

type TProps<TValue> = IProps<TValue> &
	DatePickerProps & { onChange: (date: NonNullable<TValue>) => void };

type TPropsClearable<TValue> = IProps<TValue> &
	DatePickerProps & { onChange: (date: TValue) => void };

type TPropsPure = IPropsPure &
	DatePickerProps & { onChange: (date: Date | undefined) => void; allowClear?: boolean };

export function DatePicker(props: TProps<Date | undefined>) {
	const settings = useLazyLoadQuery<DatePickerQuery>(query, {});

	return (
		<DatePickerPure
			{...props}
			locale={settings.currentUser.payload.timeSetting?.locale ?? "en-US"}
			onChange={(date) => {
				if (date) {
					props.onChange(date);
				}
			}}
		/>
	);
}

export function DatePickerClearable(props: TPropsClearable<Date | undefined>) {
	const settings = useLazyLoadQuery<DatePickerQuery>(query, {});

	return (
		<DatePickerPure
			{...props}
			allowClear={true}
			locale={settings.currentUser.payload.timeSetting?.locale ?? "en-US"}
		/>
	);
}

function DatePickerPure(props: TPropsPure) {
	const { value, onChange, partOfRange, ...rest } = props;

	// Get locale data from Moment.js
	const data = moment.localeData(props.locale);
	// LTS: Time (with seconds)
	// L: Date (in local format)
	// See: https://momentjs.com/docs/#/parsing/string-format/
	const timeFormat = data.longDateFormat("LTS");
	const dateFormat = `${data.longDateFormat("L")}`;

	const showTime = props.showTimeSelect == undefined ? true : props.showTimeSelect;

	return props.partOfRange ? (
		//Only return the date picker if it is part of a range. Styling and layout is then handled by the parent component
		<EuiDatePicker
			{...rest}
			preventOpenOnFocus={true}
			showTimeSelect={showTime}
			selected={value ? moment(value) : undefined}
			onChange={(e) => {
				// The event argument becomes null when the input field of the date picker is completely
				// cleared.
				if (e) {
					props.onChange(e.toDate());
				}
			}}
			locale={props.locale}
			dateFormat={dateFormat}
			timeFormat={showTime ? timeFormat : undefined}
		/>
	) : (
		<EuiFlexGroup>
			<EuiFlexItem grow={false}>
				<EuiFlexGroup direction={"column"} gutterSize={"xs"}>
					<EuiFlexItem>
						<EuiDatePicker
							{...rest}
							preventOpenOnFocus={true}
							showTimeSelect={showTime}
							selected={value ? moment(value) : undefined}
							onChange={(e) => {
								// The event argument becomes null when the input field of the date picker is completely
								// cleared.
								if (e) {
									props.onChange(e.toDate());
								}
							}}
							locale={props.locale}
							dateFormat={dateFormat}
							timeFormat={showTime ? timeFormat : undefined}
						/>
					</EuiFlexItem>
					{!props.disabled && (
						<EuiFlexItem>
							<EuiTextAlign textAlign={partOfRange ? "center" : "right"}>
								<EuiFlexGroup>
									{props.allowClear && (
										<EuiFlexItem>
											<EuiText size={"xs"}>
												<EuiLink onClick={() => props.onChange(undefined)}>Clear</EuiLink>
											</EuiText>
										</EuiFlexItem>
									)}
									<EuiFlexItem>
										<UserCurrentDateLink showTime={showTime} onChangeTime={onChange} />
									</EuiFlexItem>
								</EuiFlexGroup>
							</EuiTextAlign>
						</EuiFlexItem>
					)}
				</EuiFlexGroup>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}

type TPropsRange = Omit<
	TProps<Date | undefined> & {
		rangeValueStart: Date;
		rangeValueEnd: Date;
		onChangeRangeStart: (start: Date) => void;
		onChangeRangeEnd: (end: Date) => void;
	},
	"value" | "onChange" | "aria-label"
>;

/**
 * A date picker range component that allows the user to select a start and end date.
 * The component also provides a link to set the current date or time.
 * EuiDatePickerRange is not used because it does not allow to set the current date or time
 * and shoving "Use current time" link into EuiDatePickerRange does not work because the height of the parent component does not increase
 * @param props
 * @constructor
 */
export function DatePickerRange(props: TPropsRange) {
	const { rangeValueStart, rangeValueEnd, onChangeRangeStart, onChangeRangeEnd, ...rest } = props;

	const showTime = props.showTimeSelect == undefined ? true : props.showTimeSelect;
	const datesAreInvalid = rangeValueStart > rangeValueEnd;

	return (
		<EuiFlexGroup direction={"column"} gutterSize={"xs"}>
			<EuiFlexGroup alignItems={"center"} gutterSize={"none"}>
				<EuiFlexItem grow={5}>
					<DatePicker
						aria-label={"Start date"}
						value={rangeValueStart}
						onChange={onChangeRangeStart}
						partOfRange={true}
						isInvalid={datesAreInvalid}
						{...rest}
					/>
				</EuiFlexItem>
				<EuiFlexItem grow={1}>
					<EuiFlexGroup justifyContent={"spaceAround"} gutterSize={"none"}>
						<EuiIcon type={"sortRight"} />
					</EuiFlexGroup>
				</EuiFlexItem>
				<EuiFlexItem grow={5}>
					<DatePicker
						aria-label={"End date"}
						value={rangeValueEnd}
						onChange={onChangeRangeEnd}
						isInvalid={datesAreInvalid}
						partOfRange={true}
						{...rest}
					/>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiFlexGroup alignItems={"center"} gutterSize={"none"}>
				<EuiFlexItem grow={5}>
					<EuiTextAlign textAlign={"center"}>
						<UserCurrentDateLink showTime={showTime} onChangeTime={onChangeRangeStart} />
					</EuiTextAlign>
				</EuiFlexItem>
				<EuiFlexItem grow={1} />
				<EuiFlexItem grow={5}>
					<EuiTextAlign textAlign={"center"}>
						<UserCurrentDateLink showTime={showTime} onChangeTime={onChangeRangeEnd} />
					</EuiTextAlign>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiFlexGroup>
	);
}

/**
 * A link that sets the current date or time when clicked.
 */
function UserCurrentDateLink({
	showTime,
	onChangeTime,
}: {
	showTime: boolean;
	onChangeTime: (date: Date) => void;
}) {
	return (
		<EuiText size={"xs"}>
			<EuiLink
				onClick={() => {
					if (showTime) {
						onChangeTime(new Date());
					} else {
						const d = new Date();
						// setUTCHours(0, 0, 0, 0) sets the time to
						// 00:00:00.000 in UTC.
						// Additional timezone offsets may be
						// applied while parsing the time string
						d.setUTCHours(0, 0, 0, 0);

						onChangeTime(d);
					}
				}}
			>
				Use current {showTime ? "time" : "date"}
			</EuiLink>
		</EuiText>
	);
}
