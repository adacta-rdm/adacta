import { EuiFieldText, EuiInputPopover } from "@elastic/eui";
import React, { useState } from "react";

type TInputMode = "date" | "time" | "combined";

export function DateFormatStringInput(props: {
	value: string;
	onChange: (e: string) => void;
	inputMode: TInputMode;
}) {
	const [isPopoverOpen, setPopoverOpen] = useState(false);
	return (
		<EuiInputPopover
			input={
				<EuiFieldText
					value={props.value}
					onChange={(e) => props.onChange(e.target.value)}
					onFocus={() => setPopoverOpen(true)}
					onBlur={() => setPopoverOpen(false)}
				/>
			}
			isOpen={isPopoverOpen}
			closePopover={() => setPopoverOpen(false)}
		>
			<TokenExplanation inputMode={props.inputMode} />
		</EuiInputPopover>
	);
}

function TokenExplanation(props: { inputMode: TInputMode }) {
	// YYYY	2014	4 or 2 digit year. Note: Only 4 digit can be parsed on strict mode
	// YY	14	2 digit year
	// Y	-25	Year with any number of digits and sign
	// Q	1..4	Quarter of year. Sets month to first month in quarter.
	// 	M MM	1..12	Month number
	// MMM MMMM	Jan..December	Month name in locale set by moment.locale()
	// D DD	1..31	Day of month
	// Do	1st..31st	Day of month with ordinal

	const dateTokens = [
		{ token: "YYYY", example: "2025", description: "4 digit year" },
		{ token: "YY", example: "25", description: "2 digit year" },
		{ token: "M MM", example: "1..12", description: "Month number" },
		{ token: "D DD", example: "1..31", description: "Day of month" },
		{ token: "Do", example: "1st..31st", description: "Day of month with ordinal" },
	];

	// H HH	0..23	Hours (24 hour time)
	// h hh	1..12	Hours (12 hour time used with a A.)
	// k kk	1..24	Hours (24 hour time from 1 to 24)
	// a A	am pm	Post or ante meridiem (Note the one character a p are also considered valid)
	// m mm	0..59	Minutes
	// s ss	0..59	Seconds
	// S SS SSS ... SSSSSSSSS	0..999999999	Fractional seconds
	// Z ZZ	+12:00	Offset from UTC as +-HH:mm, +-HHmm, or Z
	const timeTokens = [
		{
			token: "H HH",
			example: "0..23",
			description: "Hours (24 hour time)",
		},
		{
			token: "h hh",
			example: "1..12",
			description: "Hours (12 hour time used with a A.)",
		},
		{
			token: "a A",
			example: "am pm",
			description: "Post or ante meridiem (Note the one character a p are also considered valid)",
		},
		{
			token: "m mm",
			example: "0..59",
			description: "Minutes",
		},
		{
			token: "s ss",
			example: "0..59",
			description: "Seconds",
		},
		{
			token: "S SSS",
			example: "0...999",
			description: "Fractional seconds",
		},
	];

	return (
		<div className="relative overflow-x-auto sm:rounded-lg">
			<table className="w-full text-sm text-left rtl:text-right text-gray-500 ">
				<thead className="text-xs text-gray-700 uppercase bg-gray-50 ">
					<tr>
						<th scope="col" className="px-6 py-3">
							Token
						</th>
						<th scope="col" className="px-6 py-3">
							Example
						</th>
						<th scope="col" className="px-6 py-3">
							Description
						</th>
					</tr>
				</thead>
				<tbody>
					{props.inputMode === "combined" && (
						<tr className="odd:bg-white  even:bg-gray-50  border-b  border-gray-200">
							<td colSpan={3} className={"px-4 py-4 font-bold text-gray-900 whitespace-nowrap"}>
								Date Tokens
							</td>
						</tr>
					)}
					{props.inputMode !== "time" &&
						dateTokens.map((token) => (
							<tr
								key={token.token}
								className="odd:bg-white  even:bg-gray-50  border-b  border-gray-200"
							>
								<th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap ">
									{token.token}
								</th>
								<td className="px-6 py-4">{token.example}</td>
								<td className="px-6 py-4">{token.description}</td>
							</tr>
						))}
					{props.inputMode === "combined" && (
						<tr className="odd:bg-white  even:bg-gray-50  border-b  border-gray-200">
							<td colSpan={3} className={"px-4 py-4 font-bold text-gray-900 whitespace-nowrap"}>
								Time Tokens
							</td>
						</tr>
					)}
					{props.inputMode !== "date" &&
						timeTokens.map((token) => (
							<tr
								key={token.token}
								className="odd:bg-white  even:bg-gray-50  border-b  border-gray-200"
							>
								<th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap ">
									{token.token}
								</th>
								<td className="px-6 py-4">{token.example}</td>
								<td className="px-6 py-4">{token.description}</td>
							</tr>
						))}
				</tbody>
			</table>
		</div>
	);
}
