import {
	EuiButtonIcon,
	EuiComboBox,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiSpacer,
	EuiSuperSelect,
	EuiSwitch,
} from "@elastic/eui";
import React, { Suspense, useState } from "react";

import { UnitInput } from "./UnitInput";
import { getUnitKind } from "./utils/getUnitKind";
import { EDocId } from "../../../interfaces/EDocId";
import { useService } from "../../../services/ServiceProvider";
import { DocFlyoutService } from "../../../services/toaster/FlyoutService";
import { SplitContent } from "../../utils/SplitContent";
import { ImportDeviceSelection } from "../ImportDeviceSelection";

import { isNonNullish } from "~/lib/assert/isNonNullish";
import type { IDeviceId } from "~/lib/database/Ids";
import type { IColumConfigWithoutIdAndName } from "~/lib/importWizard/IColumnConfigWithoutId";
import type { IColumnConfig } from "~/lib/interface/IImportWizardPreset";

type Column<T> = Extract<IColumConfigWithoutIdAndName, { type: T }>;
type ColumnDiff<T> = Partial<Column<T>>;

interface IProps<T extends IColumnConfig["type"]> {
	// TODO: Merge these?
	column?: Extract<IColumConfigWithoutIdAndName, { type: T }>;
	columns: Record<string, IColumnConfig>;

	setColumn: (column: Column<T>, diff: ColumnDiff<T>) => void;

	headerRow: string[];
	dataRow: string[];

	timeFrame: { begin: Date; end: Date };
	deviceId: IDeviceId;
}

export function ColumnMetadataSingle<T extends IColumConfigWithoutIdAndName["type"]>(
	props: IProps<T>
) {
	const { column, columns, setColumn, timeFrame, deviceId, headerRow } = props;
	const [validUnit, setValidUnit] = useState(false);
	const docFlyoutService = useService(DocFlyoutService);

	const independent = Object.values(columns)
		.filter((c) => c.independent?.length == 0)
		.map((c) => c.columnId);
	const dependencyOptionFull = headerRow.map((h) => ({ value: h, label: h }));
	const dependencyOption = dependencyOptionFull.filter((i) => independent.includes(i.label));

	const isIndependent =
		column && !(column.independent !== undefined && column.independent.length == 0);

	return (
		<>
			{column && (
				<SplitContent
					left={[
						<EuiFormRow label={"Independent variable"} key={"independentVariabel"}>
							<>
								<EuiSpacer size={"xs"} />
								<EuiSwitch
									label={""}
									checked={column?.independent?.length == 0}
									onChange={(e) => {
										const diff = {
											independent: e.target.checked ? [] : undefined,
										};
										setColumn({ ...column, ...diff }, diff as ColumnDiff<T>);
									}}
								/>
							</>
						</EuiFormRow>,
						isIndependent ? (
							<EuiFlexItem>
								<EuiFormRow
									label={"Dependency"}
									helpText={
										"If your data contains more than one independent variable, you can select the relevant one here. If there is only one independent variable, then you don't need to select anything here."
									}
									isDisabled={column.independent !== undefined && column.independent.length == 0}
								>
									<EuiComboBox
										singleSelection={true}
										isDisabled={column.independent !== undefined && column.independent.length == 0}
										options={dependencyOption}
										selectedOptions={dependencyOption.filter((d) =>
											column.independent?.includes(d.value)
										)}
										onChange={(e) => {
											const i = e.map((o) => o.value).filter(isNonNullish);
											const diff = { independent: e.length ? i : undefined };
											setColumn({ ...column, ...diff }, diff as ColumnDiff<T>);
										}}
										isClearable={true}
									/>
								</EuiFormRow>
							</EuiFlexItem>
						) : null,
					]}
					right={[
						isIndependent ? (
							<EuiFormRow label={"Unit"}>
								<UnitInput
									value={column?.unit ?? ""}
									onChange={(unit) => {
										const diff = {
											unit,
										} as ColumnDiff<T>;
										setColumn({ ...column, ...diff }, diff);
									}}
									onUpdateUnitValidityState={setValidUnit}
								/>
							</EuiFormRow>
						) : null,
						validUnit ? (
							<EuiFormRow label={"Device"}>
								<EuiFlexGroup>
									<EuiFlexItem>
										<Suspense fallback={<EuiSuperSelect options={[]} hasDividers fullWidth />}>
											<ImportDeviceSelection
												deviceId={deviceId}
												begin={timeFrame.begin}
												end={timeFrame.end}
												pathOfSelectedDevice={column.devicePath ?? undefined}
												onChange={(devicePath, id) => {
													const diff = {
														devicePath,
														deviceId: id,
													} as ColumnDiff<T>;
													setColumn({ ...column, ...diff }, diff);
												}}
												acceptsUnit={
													column.unit != undefined ? getUnitKind(column.unit) : undefined
												}
											/>
										</Suspense>
									</EuiFlexItem>
									<EuiFlexItem grow={false}>
										<EuiButtonIcon
											key={"helpButton"}
											aria-label={"Open Documentation"}
											color="text"
											iconType="questionInCircle"
											onClick={() => docFlyoutService.showDoc(EDocId.IMPORTDEVICEHELP)}
										/>
									</EuiFlexItem>
								</EuiFlexGroup>
							</EuiFormRow>
						) : null,
					]}
				/>
			)}
		</>
	);
}
