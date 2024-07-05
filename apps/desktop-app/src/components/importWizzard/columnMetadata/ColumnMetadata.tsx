import assert from "assert";

import { assertDefined } from "@omegadot/assert";
import React from "react";

import { ColumnMetadataSingle } from "./ColumnMetadataSingle";
import { ColumnTypeSingle } from "./ColumnTypeSingle";

import type { IDeviceId } from "~/lib/database/Ids";
import type { IColumConfigWithoutIdAndName } from "~/lib/importWizard/IColumnConfigWithoutId";
import type { IColumnConfig } from "~/lib/interface/IImportWizardPreset";

export enum ColumnMetadataStep {
	ColumnType,
	ColumnMetadata,
}

interface IProps {
	step: ColumnMetadataStep;

	decimalSeparator: string;
	headerRow: string[];
	headerIdRow: string[];
	dataRow: string[];
	config: Record<string, IColumnConfig>;
	setConfig: (config: Record<string, IColumnConfig>) => void;

	// Required for second step only
	timeFrame?: { begin: Date; end: Date };
	deviceId?: IDeviceId;

	selectedColumns: number[];
}

export const ColumnMetadata = (props: IProps) => {
	const {
		config,
		setConfig,
		dataRow,
		headerRow,
		headerIdRow,
		timeFrame,
		deviceId,
		decimalSeparator,
		selectedColumns,
	} = props;

	/**
	 * Updates the configuration of a specific column within the provided config object.
	 *
	 * @param config - A record object containing the current configuration for all columns.
	 * @param column - An object representing the specific column's configuration.
	 *                  It should not include the 'id' and 'name' properties of the column.
	 * @param columnTitle - A string representing the title of the column.
	 * @param columnId - A string representing the ID of the column.
	 *
	 * The function achieves two things:
	 * - It updates the configuration for the specified column.
	 * - In cases where the column's type is 'date' or 'time' and there is a partner column
	 *    associated, this function ensures that the relationship becomes bidirectional.
	 *    This means when column A is mentioned as the partner of column B,
	 *    column B also becomes a partner of column A.
	 *
	 * @returns - Consists of two elements:
	 *      - An updated record object where the properties of the provided column config are
	 *        changed according to the columnId in the original config.
	 *      - An object that represents the differences between the updated configuration and
	 *        the original configuration. This object can be used to apply the same changes to other
	 *        columns as well (e.g. when multiple columns are selected).
	 */
	function updateConfig(
		config: Record<string, IColumnConfig>,
		column: IColumConfigWithoutIdAndName,
		columnTitle: string,
		columnId: string
	): Record<string, IColumnConfig> {
		// Update the column itself
		const newConfig = insertColumnId(config, column, columnTitle, columnId);
		const entry = newConfig[columnId];

		// Special case: If a column is skipped, we need to get rid of alle
		// references to it
		if (column.type === "skip") {
			const columns = Object.keys(newConfig);
			for (const otherColumnId of columns) {
				const otherColumn = newConfig[otherColumnId];

				// Remove from partner column
				// For example there is a date and time column and the user decides to skip
				// the date column then this date column can't remain as a partner of the
				// time column
				if (otherColumn.type === "date" || otherColumn.type === "time") {
					if (otherColumn.partnerColumnId === columnId) {
						otherColumn.partnerColumnId = undefined;
						newConfig[otherColumnId] = otherColumn;
					}
				}

				// Remove the now skipped column from the dependency list of other columns
				if (otherColumn.independent !== undefined && otherColumn.independent.length > 0) {
					otherColumn.independent = otherColumn.independent.filter((i) => i !== columnId);
					newConfig[otherColumnId] = otherColumn;
				}
			}

			delete newConfig[columnId];
		}

		// Try to make coupling of date and time columns bidirectional
		// If someone selects Column A as partner of Column B that also means that
		// Column B becomes a partner of Column A
		if (entry.type === "date" || entry.type === "time") {
			if (entry.partnerColumnId !== undefined) {
				// Set a new partner
				const partnerEntry = newConfig[entry.partnerColumnId];
				assert(partnerEntry.type === "date" || partnerEntry.type === "time");
				newConfig[entry.partnerColumnId] = {
					...partnerEntry,
					partnerColumnId: entry.columnId,
				};
			} else {
				// Remove an old partner
				const oldEntry = config[columnId];
				if (
					oldEntry !== undefined &&
					(oldEntry.type === "date" || oldEntry.type === "time") &&
					oldEntry.partnerColumnId !== undefined
				) {
					const partnerEntry = newConfig[oldEntry.partnerColumnId];
					assert(partnerEntry.type === "date" || partnerEntry.type === "time");

					newConfig[oldEntry.partnerColumnId] = {
						...partnerEntry,
						partnerColumnId: undefined,
					};
				}
			}
		}

		// If the column is not independent, remove it from the dependency list of other columns
		if (entry.independent === undefined) {
			const columns = Object.keys(newConfig);

			// Loop through all columns
			for (const otherColumnId of columns) {
				const otherColumn = newConfig[otherColumnId];
				if (otherColumn.independent !== undefined && otherColumn.independent.length > 0) {
					// Remove the column from the dependency list
					const filtered = otherColumn.independent.filter((i) => i !== columnId);
					otherColumn.independent = filtered.length === 0 ? undefined : filtered;
					newConfig[otherColumnId] = otherColumn;
				}
			}
		} else if (entry.independent.length === 0) {
			// If there is only one independent column, set it as the independent column for all
			// other columns
			const columns = Object.entries(newConfig).filter(([, e]) => e.type !== "skip");
			if (columns.filter(([, c]) => c.independent?.length === 0).length === 1) {
				for (const [column1, c] of columns) {
					if (column1 !== entry.columnId) {
						newConfig[column1] = { ...c, independent: [entry.columnId] };
					}
				}
			}
		}

		return newConfig;
	}

	function insertColumnId(
		config: Record<string, IColumnConfig>,
		column: IColumConfigWithoutIdAndName,
		columnTitle: string,
		columnId: string
	) {
		const newConfig: Record<string, IColumnConfig> = { ...config };
		newConfig[columnId] = { ...column, columnId: columnId, title: columnTitle };
		return newConfig;
	}

	if (selectedColumns.length === 1) {
		const columnTitle = headerRow[selectedColumns[0]];
		const columnId = headerIdRow[selectedColumns[0]];
		const existingMetadata = config[columnId];

		if (props.step === ColumnMetadataStep.ColumnType) {
			return (
				<ColumnTypeSingle
					headerRow={headerIdRow}
					dataRow={dataRow}
					column={existingMetadata}
					setColumn={(column) => {
						const newConfig = updateConfig(config, column, columnTitle, columnId);
						setConfig(newConfig);
					}}
					decimalSeparator={decimalSeparator}
					columns={config}
				/>
			);
		} else if (props.step === ColumnMetadataStep.ColumnMetadata) {
			assertDefined(timeFrame);
			assertDefined(deviceId);
			return (
				<ColumnMetadataSingle
					headerRow={headerIdRow}
					dataRow={dataRow}
					column={existingMetadata}
					setColumn={(column) => {
						const newConfig = updateConfig(config, column, columnTitle, columnId);
						setConfig(newConfig);
					}}
					columns={config}
					timeFrame={timeFrame}
					deviceId={deviceId}
				/>
			);
		}
	}

	if (selectedColumns.length > 1) {
		const columnsToUpdate = selectedColumns.map((index) => ({
			id: headerIdRow[index],
			title: headerRow[index],
		}));
		const existingMetadata = columnsToUpdate.map((c) => config[c.id]);

		// The metadata of the first selected column can potentially be undefined if there is
		// nothing configured yet
		const meta: IColumnConfig | undefined = existingMetadata[0];

		if (props.step === ColumnMetadataStep.ColumnType) {
			// Check if type is the same. Mixed types can't be edited together
			if (!existingMetadata.every((e) => e === undefined || e.type === meta.type)) {
				return null;
			}

			if (meta !== undefined) {
				meta.deviceId = undefined;
				meta.devicePath = undefined;
			}

			return (
				<ColumnTypeSingle
					headerRow={headerIdRow}
					dataRow={dataRow}
					column={meta}
					setColumn={(column) => {
						let newConfig: Record<string, IColumnConfig> = config;
						for (const { id, title } of columnsToUpdate) {
							newConfig = updateConfig(newConfig, column, title, id);
						}

						setConfig(newConfig);
					}}
					columns={config}
					decimalSeparator={decimalSeparator}
				/>
			);
		} else if (props.step === ColumnMetadataStep.ColumnMetadata) {
			assertDefined(timeFrame);
			assertDefined(deviceId);
			return (
				<ColumnMetadataSingle<typeof meta.type>
					headerRow={headerIdRow}
					dataRow={dataRow}
					column={meta}
					setColumn={(column, diff) => {
						const firstColumn = columnsToUpdate[0];

						// Apply change to the first selected column directly
						const newConfig = updateConfig(config, column, firstColumn.title, firstColumn.id);

						for (const column of columnsToUpdate.slice(1)) {
							const existingConfig = newConfig[column.id];

							const c = {
								...existingConfig,
								...diff,
							} as IColumnConfig;

							assert(c.type === meta.type);
							assert(existingConfig.type === c.type);

							// Merge existing config with the diff the change to the first column
							// produced
							newConfig[column.id] = c;
						}

						setConfig(newConfig);
					}}
					columns={config}
					timeFrame={timeFrame}
					deviceId={deviceId}
				/>
			);
		}
	}

	return null;
};
