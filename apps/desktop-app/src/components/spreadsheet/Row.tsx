import React from "react";

import type { ICellValue } from "./Cell";
import { Cell } from "./Cell";

export type IRowData = {
	headerCell: boolean;
	selected: boolean;
	clickable: boolean;
	value: ICellValue;
}[];

interface IRowProps {
	data: IRowData;
	getBackgroundColor?: (columnIndex: number) => string;
	onClick?: (column: number, shift: boolean, cmdOrCtrl: boolean) => void;

	/**
	 * If set to true there is an artificial header column on the far left.
	 * In this case there is an offset which needs to be subtracted from the index
	 */
	artificialHeaderColumns?: boolean;

	isLoading?: boolean;
}

export function Row({
	data,
	onClick,
	getBackgroundColor,
	artificialHeaderColumns,
	isLoading,
}: IRowProps) {
	const isHeaderRow = Object.values(data)
		.map(({ headerCell }) => headerCell)
		.every((h) => h);
	return (
		<div
			style={{ display: "flex", width: "fit-content" }}
			className={isHeaderRow ? "euiDataGridHeader" : "euiDataGridRow"}
		>
			{Object.values(data).map(({ selected, value, clickable, headerCell }, i) => (
				<Cell
					key={i}
					data={value}
					selected={selected}
					clickable={clickable}
					headerCell={headerCell}
					backgroundColor={
						getBackgroundColor ? getBackgroundColor(artificialHeaderColumns ? i - 1 : i) : undefined
					}
					onClick={(shift, cmdOrCtrl) => {
						if (onClick) onClick(i, shift, cmdOrCtrl);
					}}
					isLoading={isLoading}
				/>
			))}
		</div>
	);
}
