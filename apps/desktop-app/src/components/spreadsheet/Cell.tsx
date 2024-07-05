import type { EuiThemeColorModeStandard } from "@elastic/eui";
import { darken, EuiSkeletonText, tintOrShade, useEuiTheme } from "@elastic/eui";
import { assertUnreachable } from "@omegadot/assert";
import React from "react";
import "./Cell.css";

export interface ICellValue {
	value: string | JSX.Element;
	validation?: "valid" | "invalid" | "warning";
}

interface ICellProps {
	data: ICellValue;
	headerCell?: boolean;
	clickable?: boolean;
	selected?: boolean;
	onClick?: (shift: boolean, cmdOrCtrl: boolean) => void;
	backgroundColor?: string;
	isLoading?: boolean;
}

const getCellColorFromBaseColor = (
	baseColor: string,
	colorMode: EuiThemeColorModeStandard = "LIGHT"
) => tintOrShade(baseColor, 0.9, colorMode);

const getSelectedCellColorFromBaseColor = (
	baseColor: string,
	colorMode: EuiThemeColorModeStandard = "LIGHT"
) => darken(getCellColorFromBaseColor(baseColor, colorMode), 0.1);

export function Cell(props: ICellProps) {
	const { data, headerCell, clickable, selected, onClick } = props;
	let backgroundColor: string | undefined = undefined;
	const { euiTheme } = useEuiTheme();

	// Get correct styling classes for provided properties
	const getClassNames = () => {
		const classNames = ["euiDataGridRowCell", "cell"];

		if (headerCell) {
			classNames.push("euiDataGridHeaderCell");
			classNames.push("header-cell");
		}
		if (clickable) {
			classNames.push("clickable");
		}
		if (typeof data.value == "string") {
			classNames.push("cell-multiline");
		}
		switch (data.validation) {
			case "valid":
				backgroundColor = getCellColorFromBaseColor(euiTheme.colors.success);
				break;
			case "invalid":
				backgroundColor = getCellColorFromBaseColor(euiTheme.colors.danger);
				break;
			case "warning":
				backgroundColor = getCellColorFromBaseColor(euiTheme.colors.warning);
				break;
			case undefined:
				break;
			default:
				assertUnreachable(data.validation);
		}

		if (selected) {
			backgroundColor = backgroundColor
				? getSelectedCellColorFromBaseColor(backgroundColor)
				: euiTheme.colors.lightestShade;
		}

		return classNames.join(" ");
	};

	const value =
		typeof data.value === "string"
			? data.value.split("\n").map((s) => <p key={s}>{s}</p>)
			: data.value;

	return (
		<div
			className={getClassNames()}
			onClick={({ shiftKey, ctrlKey, metaKey }) => {
				if (onClick) onClick(shiftKey, metaKey || ctrlKey);
			}}
			style={
				!props.isLoading ? { backgroundColor: backgroundColor ?? props.backgroundColor } : undefined
			}
			title={typeof data.value === "string" ? data.value : undefined}
		>
			{props.isLoading ? <EuiSkeletonText lines={1} /> : value}
		</div>
	);
}
