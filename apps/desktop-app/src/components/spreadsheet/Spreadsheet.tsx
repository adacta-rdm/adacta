import { assertDefined } from "@omegadot/assert";
import lodash from "lodash";
import React, { useEffect, useState } from "react";

import type { ICellValue } from "./Cell";
import type { IRowData } from "./Row";
import { Row } from "./Row";
import { indexToLetter } from "./indexToLetter";
import { skipIndices } from "./skipIndices";

export type ISpreadSheetRows = ISpreadSheetRow[];
type ISpreadSheetRow = ICellValue[];

interface ISpreadsheetHeaderOptions {
	/**
	 * Adds a header row (A,B,C, ... , AA, AB, AC, ...) as known from spreadsheet calculation
	 * programs
	 */
	artificialHeaderRows?: boolean;

	/**
	 * Adds a header column (1,2,3,...) as known from spreadsheet calculation programs
	 */
	artificialHeaderColumns?: boolean;

	/**
	 * The column with the artificial headers usually starts with 1,2,3,...
	 *
	 * In some cases, however, the first rows do not actually contain any data but metadata
	 * (e.g. a unit or a column type). In this case, the elements from this parameter can
	 * be used for the labels of the first rows.
	 */
	artificialHeadersColumnFirstRows?: string[];

	headerRows?: number[];
	headerColumns?: number[];
}

interface ISpreadsheetProps {
	rows: ISpreadSheetRows;
	headerOptions: ISpreadsheetHeaderOptions;
	invalidColumns?: number[];
	warningColumns?: number[];

	/**
	 * If set to true it is only possible to select a single row
	 */
	disableMultiRowSelection?: boolean;

	/**
	 * If set to true it is only possible to select a single column
	 */
	disableMultiColumnSelection?: boolean;

	/**
	 * Callback which gets triggered if the selected columns change
	 * @param columns Array of indices of selected columns (headers are ignored while counting)
	 * @param columnsGlobal Array of indices of selected columns (headers are counted)
	 */
	onSelectedColumnsChange?: (columns: number[], columnsGlobal: number[]) => void;

	/**
	 * Callback which gets triggered if the selected rows change
	 * @param columns Array of indices of selected rows (headers are ignored while counting)
	 * @param columnsGlobal Array of indices of selected rows (headers are counted)
	 */
	onSelectedRowsChange?: (rows: number[], rowsGlobal: number[]) => void;

	/**
	 * Selects the background color based on the row index number and column index number
	 * @param rowIndex Selected row number
	 * @param columnIndex Selected column number
	 * Returns a string naming the color for the selected cell
	 */
	getBackgroundColor?: (rowIndex: number, columnIndex: number) => string;

	/**
	 * Specifies which columns are selected
	 */
	selectedColumns?: number[];

	/**
	 * Spec
	 */
	isLoading?: boolean;
}

enum ExtensionDirection {
	UP,
	DOWN,
}

export function Spreadsheet(props: ISpreadsheetProps) {
	const {
		rows,
		onSelectedColumnsChange,
		onSelectedRowsChange,
		invalidColumns,
		warningColumns,
		headerOptions,
		disableMultiRowSelection,
		disableMultiColumnSelection,
		getBackgroundColor,
	} = props;
	const [selectedColumns, setSelectedColumns] = useState<number[]>(props.selectedColumns ?? []);
	const [selectedRows, setSelectedRows] = useState<number[]>([]);

	const {
		headerRows,
		headerColumns,
		artificialHeaderRows,
		artificialHeaderColumns,
		artificialHeadersColumnFirstRows,
	} = headerOptions;

	useEffect(() => {
		// Only reset selected rows if there are already rows selected and the user selected columns
		if (selectedColumns.length > 0 && selectedRows.length > 0) {
			setSelectedRows([]);
		}

		if (onSelectedColumnsChange) {
			onSelectedColumnsChange(
				skipSelectedHeaders(selectedColumns, headerColumns),
				selectedColumns.sort((a, b) => a - b)
			);
		}
	}, [selectedRows.length, selectedColumns, headerColumns, onSelectedColumnsChange]);

	useEffect(() => {
		// Only reset selected columns if there are already columns selected and someone selected
		// rows
		if (selectedRows.length > 0 && selectedColumns.length > 0) {
			setSelectedColumns([]);
		}

		if (onSelectedRowsChange) {
			onSelectedRowsChange(
				skipSelectedHeaders(selectedRows, headerRows),
				selectedRows.sort((a, b) => a - b)
			);
		}
	}, [selectedColumns.length, selectedRows, headerRows, onSelectedRowsChange]);

	/**
	 * Returns a list of all selected columns/rows but does not count header columns/rows
	 * The first non header column/row has index 0
	 * @param selection
	 * @param headers
	 */
	const skipSelectedHeaders = (selection: number[], headers: number[] | undefined) => {
		if (!headers) {
			return selection;
		}

		return lodash.uniq(
			// Order is not important for us but parent component expects a sorted list
			selection
				.sort((a, b) => a - b)
				.map((c) => {
					return skipIndices(c, headers);
				})
		);
	};

	const updateSelection = (
		index: number,
		shift: boolean,
		cmdOrCtrl: boolean,
		selection: number[],
		setSelection: (value: number[]) => void
	) => {
		if (selection.includes(index)) {
			if (shift) {
				const lastSelectedColumn = selection.slice(-1)[0];
				let startColumnOfSelectionRange;
				if (index < lastSelectedColumn) {
					startColumnOfSelectionRange = continueSelectionToLowerIndex(index, selection);
				} else {
					startColumnOfSelectionRange = continueSelectionToHigherIndex(index, selection);
				}
				setSelection(selectionFromRange(startColumnOfSelectionRange, index));
			} else {
				if (cmdOrCtrl) {
					setSelection(selection.filter((c) => c !== index));
				} else {
					setSelection([]);
				}
			}
		} else {
			if (shift) {
				if (selection.length > 0) {
					const lastSelectedColumn = selection.slice(-1)[0];
					let startColumnOfSelectionRange;
					if (index < lastSelectedColumn) {
						startColumnOfSelectionRange = continueSelectionToHigherIndex(
							lastSelectedColumn,
							selection
						);
					} else {
						startColumnOfSelectionRange = continueSelectionToLowerIndex(
							lastSelectedColumn,
							selection
						);
					}
					setSelection(selectionFromRange(startColumnOfSelectionRange, index));
				} else {
					setSelection([index]);
				}
			} else {
				if (cmdOrCtrl) {
					setSelection(selection.concat(index));
				} else {
					setSelection([index]);
				}
			}
		}
	};

	const onColumnHeaderClick = (column: number, shift: boolean, cmdOrCtrl: boolean) => {
		if (disableMultiColumnSelection) {
			return setSelectedColumns([column]);
		}
		updateSelection(column, shift, cmdOrCtrl, selectedColumns, setSelectedColumns);
	};

	const onRowHeaderClick = (row: number, shift: boolean, cmdOrCtrl: boolean) => {
		if (disableMultiRowSelection) {
			return setSelectedRows([row]);
		}
		updateSelection(row, shift, cmdOrCtrl, selectedRows, setSelectedRows);
	};

	function selectionFromRange(startOfSelection: number, endOfSelection: number) {
		const start = Math.min(startOfSelection, endOfSelection);
		const end = Math.max(startOfSelection, endOfSelection);
		let selection = [...Array(end + 1).keys()].slice(start);

		if (selection[0] === endOfSelection) {
			// TODO: Why is the order reversed here? As far as I can tell, this does not result in
			//  any advantage
			selection = selection.reverse();
		}

		return selection;
	}

	const continueSelectionToLowerIndex = (index: number, selection: number[]) => {
		return continueSelection(index, selection, ExtensionDirection.DOWN);
	};

	const continueSelectionToHigherIndex = (index: number, selection: number[]) => {
		return continueSelection(index, selection, ExtensionDirection.UP);
	};

	const continueSelection = (index: number, selection: number[], direction: ExtensionDirection) => {
		const sortedSelection = selection.sort();
		const position = sortedSelection.indexOf(index);

		let nextIndex = index;
		if (direction === ExtensionDirection.UP) {
			for (let i = position + 1; i < sortedSelection.length; i++) {
				if (sortedSelection[i] === sortedSelection[i - 1] + 1) nextIndex = sortedSelection[i];
			}
		} else {
			for (let i = position - 1; i >= 0; i--) {
				if (sortedSelection[i] === sortedSelection[i + 1] - 1) nextIndex = sortedSelection[i];
			}
		}
		return nextIndex;
	};

	const onCellClick = (column: number, row: number, shift: boolean, cmdOrCtrl: boolean) => {
		const clickOnHeaderRow = (artificialHeaderRows && row === -1) || headerRows?.includes(row);

		if (artificialHeaderColumns && column > 0 && clickOnHeaderRow) {
			// In artificialHeaderColumns mode the first column (with the artificial header) is
			// counted therefore we must subtract 1 in this handler
			return onColumnHeaderClick(column - 1, shift, cmdOrCtrl);
		}

		if (!headerRows?.includes(row) && headerColumns?.includes(column)) {
			return onRowHeaderClick(row, shift, cmdOrCtrl);
		}

		if (artificialHeaderColumns && column === 0 && row >= 0) {
			// In artificialHeaders mode, the first row is rendered completely independently,
			// so nothing needs to be subtracted.
			return onRowHeaderClick(row, shift, cmdOrCtrl);
		}

		if (headerRows?.includes(row) && !headerColumns?.includes(column)) {
			return onColumnHeaderClick(column, shift, cmdOrCtrl);
		}
	};

	const getValidation = (
		value: ICellValue,
		column: number,
		isHeaderCell: boolean
	): ICellValue["validation"] => {
		if (isHeaderCell) {
			if (invalidColumns?.includes(column - 1)) {
				return "invalid";
			}

			if (warningColumns?.includes(column - 1)) {
				return "warning";
			}
		}

		return value.validation;
	};

	const getRowData = (rowNumber: number, row: ICellValue[], length = 0): IRowData => {
		const rowData = row.map((value, columnNumber) => {
			const headerRow = headerRows?.includes(rowNumber) ?? false;
			const headerColumn =
				(Math.max(...(headerRows ?? [0])) < rowNumber && headerColumns?.includes(columnNumber)) ??
				false;
			const isHeaderCell: boolean = headerRow || headerColumn;
			return {
				value: {
					...value,
					validation: getValidation(value, columnNumber, isHeaderCell),
				},
				selected: selectedColumns.includes(columnNumber) || selectedRows.includes(rowNumber),
				headerCell: isHeaderCell,
				clickable: isHeaderCell && rowNumber === 0 && !headerColumns?.includes(columnNumber),
			};
		});

		// Insert first column if artificial headers are enabled
		if (artificialHeaderColumns) {
			assertDefined(headerOptions);

			let value = String(rowNumber + 1);
			if (artificialHeadersColumnFirstRows !== undefined) {
				const otherValuesCount = artificialHeadersColumnFirstRows.length;
				value =
					rowNumber >= otherValuesCount
						? String(rowNumber - otherValuesCount + 1)
						: artificialHeadersColumnFirstRows[rowNumber];
			}

			rowData.unshift({
				headerCell: true,
				selected: false,
				clickable: true,
				value: { value, validation: undefined },
			});
		}

		// Fill missing columns if row is too short
		for (let i = 0; i < length - rowData.length; i++) {
			rowData.push({
				headerCell: false,
				selected: false,
				clickable: true,
				value: { value: "", validation: undefined },
			});
		}

		return rowData;
	};

	// if (props.isLoading) {
	// 	return <EuiLoadingSpinner />;
	// }

	const maxLength = Math.max(...rows.map((r) => r.length));
	const artificialHeaderRowData = [...Array(maxLength).keys()].map((i) => ({
		headerCell: true,
		selected: false,
		clickable: true,
		value: { value: indexToLetter(i) },
	}));

	if (artificialHeaderColumns) {
		artificialHeaderRowData.unshift({
			headerCell: true,
			selected: false,
			clickable: false,
			value: { value: "" },
		});
	}

	const artificialHeaderRow = (
		<Row
			key={0}
			data={artificialHeaderRowData}
			onClick={(column, shift, cmdOrCtrl) => {
				onCellClick(column, -1, shift, cmdOrCtrl);
			}}
		/>
	);

	return (
		<div
			className={
				"eui-scrollBar eui-xScroll eui-yScroll euiDataGrid euiDataGrid--bordersAll euiDataGrid--headerShade euiDataGrid--footerOverline euiDataGrid--stickyFooter euiDataGrid--noControls"
			}
		>
			{artificialHeaderRows && artificialHeaderRow}
			{Object.values(rows).map((row, i) => (
				<Row
					key={i}
					data={getRowData(i, row, artificialHeaderRowData.length)}
					getBackgroundColor={
						getBackgroundColor ? (columnIndex) => getBackgroundColor(i, columnIndex) : undefined
					}
					onClick={(column, shift, cmdOrCtrl) => onCellClick(column, i, shift, cmdOrCtrl)}
					artificialHeaderColumns={artificialHeaderColumns}
					isLoading={props.isLoading}
				/>
			))}
		</div>
	);
}
