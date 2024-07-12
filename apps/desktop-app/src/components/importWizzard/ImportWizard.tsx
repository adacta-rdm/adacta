import assert from "assert";

import {
	colorPalette,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	euiPaletteColorBlindBehindText,
	EuiSelect,
	EuiSpacer,
} from "@elastic/eui";
import type { EmotionJSX } from "@emotion/react/types/jsx-namespace";
import { assertDefined, assertInstanceof, assertUnreachable, isNonNullish } from "@omegadot/assert";
import type { ChangeEvent, ChangeEventHandler, ReactElement } from "react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation, useRefetchableFragment, useSubscription } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";
import type { GraphQLSubscriptionConfig, OperationType } from "relay-runtime";

import { ImportWizardSummary } from "./ImportWizardSummary";
import { ImportWizardWarning } from "./ImportWizardWarning";
import { ColumnMetadata, ColumnMetadataStep } from "./columnMetadata/ColumnMetadata";
import {
	DateExtractionModeNextStep,
	determineDateExtractionMode,
} from "./date/extraction/DateExtractionWizard";
import { ImportWizardLayout } from "./layout/ImportWizardLayout";
import { PresetSelection } from "./preset/PresetSelection";
import { StepTime } from "./steps/StepTime";
import { Steps } from "./steps/Steps";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { DateTime } from "../datetime/DateTime";
import { Spreadsheet } from "../spreadsheet/Spreadsheet";
import { useDebounceFormUpdate } from "../utils/useDebouncedFormUpdate";

import type { ImportWizardDeviceInformationFragment$key } from "@/relay/ImportWizardDeviceInformationFragment.graphql";
import type { ImportWizardMutation } from "@/relay/ImportWizardMutation.graphql";
import type { ImportWizardQuery } from "@/relay/ImportWizardQuery.graphql";
import type { ImportWizardSubscription } from "@/relay/ImportWizardSubscription.graphql";
import type { ImportWizardToCellArrayMutation } from "@/relay/ImportWizardToCellArrayMutation.graphql";
import type { ImportWizardToGenericTableMutation } from "@/relay/ImportWizardToGenericTableMutation.graphql";
import type { ImportWizardToTabularDataArrayBufferMutation } from "@/relay/ImportWizardToTabularDataArrayBufferMutation.graphql";
import type {
	IGenericTable,
	IToTabularDataOptions,
} from "~/apps/repo-server/src/csvImportWizard/CSVImportWizard";
import { createDate, createIDatetime, createMaybeDate } from "~/lib/createDate";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";
import type { TUnit } from "~/lib/importWizard/ImportWizardUnit";
import { UnitlessMarker } from "~/lib/importWizard/ImportWizardUnit";
import type { NormalizerId } from "~/lib/importWizard/normalizer";
import type { IToCellArrayInput } from "~/lib/interface/CSVImportWizzard/IToCellArrayInput";
import type { IToGenericTableInput } from "~/lib/interface/CSVImportWizzard/IToGenericTableInput";
import type { TToCellArrayOutput } from "~/lib/interface/CSVImportWizzard/TToCellArrayOutput";
import type { TToGenericTableOutput } from "~/lib/interface/CSVImportWizzard/TToGenericTableOutput";
import type { IColumnConfig, IImportWizardPreset } from "~/lib/interface/IImportWizardPreset";
import type { ITabularDataColumnDescription } from "~/lib/interface/ITabularDataColumnDescription";
import { assertTToCellArrayOutput } from "~/lib/interface/type_checks/assertTToCellArrayOutput";
import { assertTToGenericTableOutput } from "~/lib/interface/type_checks/assertTToGenericTableOutput";

const ImportWizardGraphQLSubscription = graphql`
	subscription ImportWizardSubscription {
		importTask {
			id
			payload {
				__typename
				... on ImportTransformationProgress {
					progress
				}
				... on ImportTransformationSuccess {
					ids
				}
				... on ImportTransformationError {
					message
				}
				... on ImportTransformationWarning {
					message
				}
			}
		}
	}
`;

export const ImportWizardGraphQLQuery = graphql`
	query ImportWizardQuery($cursor: String, $deviceId: ID, $repositoryId: ID!) {
		...PresetSelection @arguments(after: $cursor, deviceId: $deviceId)
		...ImportWizardDeviceInformationFragment @arguments(ids: [])
	}
`;

const ImportWizardDeviceInformationGraphqlFragment = graphql`
	fragment ImportWizardDeviceInformationFragment on RepositoryQuery
	@refetchable(queryName: "ImportWizardDeviceInformation")
	@argumentDefinitions(ids: { type: "[ID!]!" }) {
		nodes(ids: $ids) {
			... on Device {
				id
				name
			}
		}
	}
`;

const previewItems = [
	{ value: 5, text: "5" },
	{ value: 10, text: "10" },
	{ value: 15, text: "15" },
	{ value: 20, text: "20" },
	{ value: 50, text: "50" },
];

const decimalSeparators = [
	{ value: ",", text: "," },
	{ value: ".", text: "." },
];

// const thousandsSeparators = decimalSeparators;

interface IImportWizardProps {
	deviceId: IDeviceId;
	resourceId: IResourceId;

	queryRef: PreloadedQuery<ImportWizardQuery>;
}

type ColumnTypes = "number" | "date" | "time" | "datetime" | "offset" | "skip";

export interface IColumnConfigBase {
	/**
	 * A string that is derived from the column title to uniquely identify the column. When there
	 * are multiple columns with the same title, the id can be computed from multiple title rows
	 * or the header can be made unique by adding suffixes to duplicate headers.
	 * @see IDataArea
	 * @see ICompositeHeaderAutomatic
	 * @see makeHeadersUnique
	 */
	columnId: string;

	/**
	 * The original title of the column as used in the source file.
	 */
	title?: string;

	// First Step
	type: ColumnTypes;

	normalizerIds: NormalizerId[];
	/**
	 * References to the columns that contain the independent variable for this column. The string refers to the
	 * column name. When the array contains a single element, then the data is 1D. For 2D data, the array contains 2
	 * elements and so forth. In case the column contains the independent variable values, then this field is either
	 * undefined or contains an empty array.
	 */
	independent?: string[];

	// Second Step
	unit?: TUnit;

	devicePath?: string[];
	deviceId?: IDeviceId;
}

const defaultPreset: IImportWizardPreset = {
	delimiter: ",",
	decimalSeparator: ".",
	preview: 5,
	dataArea: {
		header: { type: "SingleHeaderRow", headerRow: 0 },
		body: 1,
	},
	columnMetadata: {},
	manualDateConfig: undefined,
};

export interface IImportWizardFormControls {
	delimiter: string;
	decimalSeparator: string;
	preview: string;
	headerRows: string;
	dataRow: string;
	columnMetadata: Record<string, IColumnConfig>; // IColumnConfig[];

	manualStartDate: Date;
	manualEndDate: Date;
}

function headerRowsStringToArray(headerRowsString: string): number[] {
	return (
		headerRowsString
			.split(",")
			// Get rid of empty parts (i.e. ignore trailing comma "1," -> ["1"])
			.filter((s) => s)
			// Translate to number
			.map((string) => Number(string.trim()) - 1)
			// Sort to get the biggest number as the last element
			.sort((a, b) => a - b)
	);
}

/**
 * Validates and converts user input to an object of type IImportWizardPreset.
 *
 * Returns an array of error messages or the preset object if there are no errors.
 */
function ui2preset(
	formControls: IImportWizardFormControls,
	step?: number
): IImportWizardPreset | string[] {
	const errors: string[] = [];

	const headerRows = headerRowsStringToArray(formControls.headerRows);

	const dataRow = Number(formControls.dataRow) - 1;

	if (Math.max(...headerRows) >= dataRow) {
		errors.push("Data must come after the table headers.");
	}

	// Step 2 validation
	const columnMetadataArray = Object.values(formControls.columnMetadata);
	const independentColumns = columnMetadataArray.filter((c) => c.independent?.length === 0);
	// Two independent columns detected
	if (
		independentColumns.length > 1 &&
		!columnMetadataArray.every((c) => c.independent !== undefined || c.type === "skip")
	) {
		errors.push(
			"You've marked more than two columns as independent. In this case you must define a dependent variable for each column which isn't independent."
		);
	}

	if (step !== undefined && step >= Steps.COLUMN_METADATA) {
		if (
			// Check for regular time columns
			columnMetadataArray.find(
				(c) => c.type === "date" || c.type === "datetime" || c.type === "offset"
			) === undefined &&
			// Check for time + offset columns
			columnMetadataArray.find((c) => c.type === "time" && c.startDate !== undefined) ===
				undefined &&
			columnMetadataArray.find((c) => c.type === "number" && c.independent?.length === 0) ===
				undefined
		) {
			errors.push(
				"You need have at least one date/time/offset column or at least one column of the type number which acts as independent variable for the other values."
			);
		}
	}

	// Assume that all columns depend on the single exising independent column
	if (step !== undefined && step >= Steps.COLUMN_METADATA && independentColumns.length) {
		for (const columnMetadataArrayElement of columnMetadataArray) {
			if (
				columnMetadataArrayElement.independent === undefined &&
				columnMetadataArrayElement.type !== "skip"
			) {
				formControls.columnMetadata[columnMetadataArrayElement.columnId].independent = [
					independentColumns[0].columnId,
				];
			}
		}
	}

	if (step !== undefined && step >= Steps.TIME_CONFIG) {
		const result = determineDateExtractionMode(formControls.columnMetadata);
		if (result.nextStep == DateExtractionModeNextStep.error) {
			errors.push(...result.helpText);
		}
	}

	if (step !== undefined && step >= Steps.COLUMN_METADATA) {
		if (columnMetadataArray.find((c) => c.deviceId !== undefined) === undefined) {
			errors.push("You should define at least one column which is linked to a device");
		}

		if (!independentColumns.length) {
			errors.push("You should define at least one independent variable");
		}

		for (const columnMetadata of columnMetadataArray) {
			if (columnMetadata.type === "number") {
				if (columnMetadata.unit === undefined) {
					errors.push(`Column ${columnMetadata.title ?? columnMetadata.columnId} has no unit`);
				}

				if (columnMetadata.deviceId === undefined) {
					errors.push(
						`Column ${columnMetadata.title ?? columnMetadata.columnId} isn't assigned to a device`
					);
				}
			}
		}
	}

	if (errors.length > 0) return errors;

	const manualDate = determineDateExtractionMode(formControls.columnMetadata).mode === "manual";

	return {
		delimiter: formControls.delimiter,
		decimalSeparator: formControls.decimalSeparator,
		preview: Number(formControls.preview),
		dataArea: {
			header:
				headerRows.length === 1
					? { type: "SingleHeaderRow", headerRow: headerRows[0] }
					: { type: "CompositeHeaderAutomatic", headerRow: headerRows },
			body: dataRow,
		},
		columnMetadata: formControls.columnMetadata,
		manualDateConfig: manualDate
			? {
					begin: createIDatetime(formControls.manualStartDate),
					end: createIDatetime(formControls.manualEndDate),
			  }
			: undefined,
	};
}

function preset2ui(preset: IImportWizardPreset): IImportWizardFormControls {
	const { header } = preset.dataArea;
	let headerRows = "";
	switch (header.type) {
		case "SingleHeaderRow":
			headerRows = String(header.headerRow + 1);
			break;
		case "CompositeHeaderAutomatic":
			headerRows = header.headerRow.map((r) => String(r + 1)).join(",");
			break;
		case "CompositeHeaderExplicit":
			throw new Error("Implement me.");
	}

	return {
		delimiter: preset.delimiter,
		decimalSeparator: preset.decimalSeparator,
		preview: String(preset.preview),
		headerRows: headerRows,
		dataRow: String(preset.dataArea.body + 1),
		columnMetadata: preset.columnMetadata,
		manualStartDate: createMaybeDate(preset.manualDateConfig?.begin) ?? new Date(),
		manualEndDate:
			createMaybeDate(preset.manualDateConfig?.end) ??
			new Date(new Date().getTime() + 60 * 60 * 1000),
	};
}

// Das Ziel des Importers ist, durch diverse Einstellungen des Benutzers die ASCII-Eingabe in unser Double-Binär-Format
// herunterzubrechen. Alles was nicht im Double-Binär-Format darstellbar ist sind Metadaten

// step 1: csv parsen , return value papa parse format
// step 2: header and data body info
// step 3: skipped columns (must come after header info, so that names are referenced)
// step 4: date time settings
// step 5: column -> unit map
// step 6: column -> device map

// In UI Datenmodell keine unions benutzen, lieber jede Kontrollfläche speichern und optional machen damit Einstellungen erhalten bleiben.
// Statt property: A | B | C lieber propertyA?: A, propertyB?: B, propertyC?: C

// UI-Konzept:
// Step 2:
// - Hier werden im Wesentlichen die Spaltenformate festgelegt. Formate müssen pro Spalte festgelegt werden, weil
//   dadurch größtmögliche Flexibilität erreicht wird. Beispielsweise gibt es Spalten vom Typ number, die noch Suffixe
//   enthalten wie in Mariams GC Datei ("0.000 BDL"). Außerdem sind Werte mit angehängter Einheit denkbar.
// - Spaltenüberschrift A,B,C,D ...
// - Meta-Part wie in Step 2+ (siehe PDF Receipt_2021-11-19_121433.pdf in Discord) statt Unit/Device Auswahl des Spaltentyps
// - Spaltentypen: Datetime (eventuell wird dem Benutzer getrennte Date und Time typen vorgegaukelt), number, skip, string (string wird vorerst nicht benötigt).
// - Es gibt eine Schaltfläche "Independent variable"
// - Es ist denkbar, dass der Benutzer in diesem Schritt auch eine Spalte als "data region" markieren kann. Die
//   Information aus dieser Spalte (kann vom beliebigen Typ sein) kann verwendet werden, um die data regions innerhalb
//   der Datei festzulegen, ohne dass dies nachträglich vom Benutzer händisch erfolgen muss.
// - Oben wird Beginn und Ende der Messung angezeigt

// Step 3:
// - In diesem Schritt hat der Importer das Ziel erreicht, dass alle zahlenbasierte Spalten identifiziert sind und somit
//   in das Double-Binär-Format überführt werden kann. In der UI wird dies besonders hervorgehoben, in dem evtl.
//   vorhandene nicht-zahlenbasierte Spalten getrennt dargestellt werden.
// - Da hier die unabhängige Variable bekannt ist: Spaltenüberschrift: X, Y1, Y2, Y3, ...
// - Falls vorher eine data region Spalte definiert worden ist, wird diese ggf. hervorgehoben und nicht innerhalb der
//   Datenspalten angezeigt. In diesem Fall würde sich beispielsweise eine Spaltenüberschrift ergeben: Data region, X, Y1, Y2, Y3, ...
// - Benutzerführung ähnlich wie im vorherigen Schritt, d.h. man wählt eine Spalte aus und "macht was damit"
// - Zunächst wird Einheit ausgewählt, diese bestimmt dann welches Device in Frage kommt (auch unter Berücksichtigung der Zeitinformation aus Schritt 2)

// Summary-Schritt:
// - Falls einzelne Zeilen nicht eingelesen werden können (zum Beispiel weil eine Zahl mitten in der Datei nicht als
//   solche erkannt wird, oder wenn die Spaltenzahl nicht stimmt), dann werden die Zeilen ignoriert und gesammelt als
//   Warnung angezeigt. Sofern die Anzahl an problematischen Zeilen unter einer (noch zu definierenden) Grenze liegt,
//   hat der Benutzer die Möglichkeit, die Zeile zu ignorieren
// - Es wird geprüft, ob Zeiteinträge streng monoton steigend sind. Wenn nein, dann wird abgebrochen. Falls das doch ein
//   legitimes Eingabeformat ist, kann dies nachträglich noch implementiert werden. Diese Überprüfung verhindert auch
//   das fehlerhafte Einlesen von Messdateien, die zum Zeitpunkt der Sommer/Winterzeitumstellung stattgefunden haben, da
//   in (der einen Richtung) doppelte Einträge auftreten.

const ImportTransformationGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation ImportWizardMutation(
		$input: CreateAndRunImportTransformationInput!
		$repositoryId: ID!
	) {
		repository(id: $repositoryId) {
			createAndRunImportTransformation(input: $input) {
				importTaskId
			}
		}
	}
`;

const ToCellArrayGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation ImportWizardToCellArrayMutation(
		$repositoryId: ID!
		$resourceId: ID!
		$options: JSONString
	) {
		repository(id: $repositoryId) {
			toCellArray(resourceId: $resourceId, options: $options)
		}
	}
`;

const ToGenericTableGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation ImportWizardToGenericTableMutation(
		$repositoryId: ID!
		$resourceId: ID!
		$options: JSONString
	) {
		repository(id: $repositoryId) {
			toGenericTable(resourceId: $resourceId, options: $options)
		}
	}
`;

const ToTabularDataArrayBufferGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation ImportWizardToTabularDataArrayBufferMutation(
		$repositoryId: ID!
		$resourceId: ID!
		$deviceId: ID!
		$options: JSONString
	) {
		repository(id: $repositoryId) {
			toTabularDataArrayBuffer(resourceId: $resourceId, deviceId: $deviceId, options: $options) {
				... on ImportWizardStep3PayloadSuccess {
					__typename
					data {
						begin
						end
						metadata
						tabularData
					}
					warnings
				}
				... on ImportWizardError {
					__typename
					errors
				}
			}
		}
	}
`;

interface IImportSelectionUpdateHandler {
	updateColumnsSelection: (columns: number[], columnsGlobal: number[]) => void;
}

export function ImportWizard(props: IImportWizardProps) {
	const deviceId = props.deviceId;
	const { router, repositoryId } = useRepoRouterHook();
	const repositoryIdVariables = useRepositoryIdVariable();

	const [importRunning, setImportRunning] = useState(false);

	const [importButtonUnlocked, setImportButtonUnlocked] = useState(false);

	const [importMutation] = useMutation<ImportWizardMutation>(ImportTransformationGraphQLMutation);
	const [toCellArrayMutation, toCellArrayInFlight] = useMutation<ImportWizardToCellArrayMutation>(
		ToCellArrayGraphQLMutation
	);
	const [toGenericTableMutation, toGenericTableInFlight] =
		useMutation<ImportWizardToGenericTableMutation>(ToGenericTableGraphQLMutation);
	const [toTabularDataArrayBufferMutation, toTabularDataArrayBufferInFlight] =
		useMutation<ImportWizardToTabularDataArrayBufferMutation>(
			ToTabularDataArrayBufferGraphQLMutation
		);

	// Determine if one of the mutations is in flight. This variable is ued to put the Spreadsheet
	// into a loading state
	const waitingForData =
		toCellArrayInFlight || toGenericTableInFlight || toTabularDataArrayBufferInFlight;

	type FileStructureReturn = TToCellArrayOutput;
	type ColumnTypeReturn = { table: IGenericTable; types: Map<string, string> } | undefined;
	type ColumnMetadataReturn =
		| {
				types: Map<string, string>;
				deviceIds: Map<string, string>;
				tabularDataWithParsedDates: (EmotionJSX.Element | string)[][];
				header: string[];
				dependencyHeader: Map<string, React.ReactElement>;
				units: Map<string, TUnit>;
				headerId: string[];
				independentColumTitleToNumberMap: Map<string, number[]>;
				timeframe: { begin: Date; end: Date };
		  }
		| undefined;

	type PresetEvaluationResult<TStep> = TStep extends Steps.FILE_STRUCTURE
		? FileStructureReturn
		: TStep extends Steps.COLUMN_TYPES
		? ColumnTypeReturn
		: TStep extends Steps.TIME_CONFIG
		? ColumnTypeReturn
		: TStep extends Steps.COLUMN_METADATA
		? ColumnMetadataReturn
		: undefined;

	async function evaluatePreset<TStep extends Steps>(
		step: TStep,
		preset: IImportWizardPreset,
		setErrors: (errors: string[]) => void,
		setWarning: (warning: any) => void
	): Promise<PresetEvaluationResult<TStep>> {
		const cast = (
			r: FileStructureReturn | ColumnTypeReturn | ColumnMetadataReturn
		): PresetEvaluationResult<TStep> => {
			return r as PresetEvaluationResult<TStep>;
		};

		if (step === Steps.FILE_STRUCTURE) {
			const result: PresetEvaluationResult<Steps.FILE_STRUCTURE> = await toCellArray({
				delimiter: preset.delimiter,
				preview: preset.preview,
			});

			return cast(result);
		}

		if (step === Steps.COLUMN_TYPES) {
			const config = ui2preset(formControls, 1);

			if (Array.isArray(config)) {
				setErrors(config);
				return cast(undefined);
			}

			const { normalizers, types } = preprocessMetadata(config);

			try {
				const table = await toGenericTable({
					delimiter: config.delimiter,
					preview: config.preview,
					dataArea: config.dataArea,
					normalizers: Object.fromEntries(normalizers),
				});
				return cast({ table, types });
			} catch (e) {
				assertInstanceof(e, Error);
				setWarning([e.message]);
			}
		}

		if (step === Steps.COLUMN_METADATA) {
			const config = ui2preset(formControls, 2);

			if (Array.isArray(config)) {
				setErrors(config);
				// ERROR
				return cast(undefined);
			}

			const { types, units, deviceIds } = preprocessMetadata(config);

			const t = await toTabularDataArrayBuffer({
				delimiter: config.delimiter,
				decimalSeparator: config.decimalSeparator,
				preview: config.preview,
				dataArea: config.dataArea,
				columnMetadata: config.columnMetadata,
				manualDateConfig: config.manualDateConfig,
			}).catch((e) => {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				setWarning([e.message]);
			});

			if (!t) {
				return cast(undefined);
			}

			if ("errors" in t) {
				setWarning(undefined);
				setErrors([...t.errors]);
				return cast(undefined);
			}

			if (t.warnings.length) {
				setWarning(t.warnings);
			} else {
				setWarning(undefined);
			}
			const header = t.data.metadata.map((m) => m.title);
			const headerId = t.data.metadata.map((m) => m.columnId ?? m.title);

			// Turn numbers into dates / strings for the Spreadsheet component
			const tabularDataWithParsedDates = t.data.tabularData.map((r) =>
				r.map((c, index) => {
					// Render time as time if column is of type datetime
					if (t.data.metadata[index].type === "datetime") {
						return <DateTime key={index} date={new Date(Number(c))} />;
					}

					// Render number
					return String(c);
				})
			);

			let xCount = 0;
			let yCount = 0;

			const dependencyHeader = new Map<string, ReactElement>();
			// independentColumTitleToNumberMap: maps independent column name to column number
			const independentColumTitleToNumberMap = new Map<string, number[]>();

			// Assign X_i, X_i+1
			for (const column of Object.values(t.data.metadata)) {
				column.columnId = column.columnId ?? column.title;

				independentColumTitleToNumberMap.set(column.columnId, column.independentVariables);

				if (column.independentVariables.length === 0) {
					dependencyHeader.set(column.columnId, renderSubscript("X", xCount++));
				}
			}

			// Assign Y_i(X_j)
			for (const column of Object.values(t.data.metadata)) {
				column.columnId = column.columnId ?? column.title;

				if (column.independentVariables.length > 0) {
					const dependencies = column.independentVariables.map((index) => {
						return dependencyHeader.get(headerId[index]);
					});
					//return `X_${xCount++}`;
					dependencyHeader.set(
						column.columnId,
						<>
							{renderSubscript("Y", yCount++)}({dependencies})
						</>
					);
				}
			}

			const r: ColumnMetadataReturn = {
				tabularDataWithParsedDates,
				header,
				headerId,
				dependencyHeader,
				types,
				units,
				deviceIds,
				independentColumTitleToNumberMap,
				timeframe: { begin: t.data.begin, end: t.data.end },
			};

			return cast(r);
		}

		return undefined as PresetEvaluationResult<TStep>;
	}

	interface IStep3ReturnTypeSuccess {
		data: {
			metadata: ITabularDataColumnDescription[];
			tabularData: string[][];
			end: Date;
			begin: Date;
		};
		warnings: string[];
	}

	type Step3ReturnType = IStep3ReturnTypeSuccess | { errors: readonly string[] };

	// Execute Step 3 Mutation and convert GraphQL result into the types we need
	const toTabularDataArrayBuffer = useCallback(
		(options: IToTabularDataOptions): Promise<Step3ReturnType> => {
			return new Promise((resolve, reject) => {
				toTabularDataArrayBufferMutation({
					variables: {
						...repositoryIdVariables,
						deviceId,
						resourceId: props.resourceId,
						options: JSON.stringify(options),
					},
					onError: reject,
					onCompleted: (r) => {
						const response = r.repository.toTabularDataArrayBuffer;

						if (response.__typename == "ImportWizardStep3PayloadSuccess") {
							const ret: Step3ReturnType = {
								data: {
									tabularData: response.data.tabularData.map((x) => [...x]),
									begin: createDate(response.data.begin),
									end: createDate(response.data.end),
									metadata: JSON.parse(response.data.metadata) as ITabularDataColumnDescription[], // Temporary solution
								},
								warnings: response?.warnings !== null ? [...response.warnings] : [],
							};

							resolve(ret);
						} else if (response.__typename == "ImportWizardError") {
							resolve({ errors: response.errors });
						} else {
							reject(new Error("Unexpected return type for toTabularDataArrayBuffer"));
						}
					},
				});
			});
		},
		[props.resourceId, deviceId, repositoryIdVariables, toTabularDataArrayBufferMutation]
	);

	// TODO: Check if there is a repeating pattern in those fns
	const toCellArray = useCallback(
		(options: IToCellArrayInput): Promise<TToCellArrayOutput> => {
			return new Promise((resolve, reject) => {
				toCellArrayMutation({
					variables: {
						...repositoryIdVariables,
						resourceId: props.resourceId,
						options: JSON.stringify(options),
					},
					onError: reject,
					onCompleted: (r) => {
						const { toCellArray: toCellArrayJSON } = r.repository;
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const toCellArray: any = JSON.parse(toCellArrayJSON);
						assertTToCellArrayOutput(toCellArray);
						resolve(toCellArray);
					},
				});
			});
		},
		[props.resourceId, repositoryIdVariables, toCellArrayMutation]
	);

	const toGenericTable = useCallback(
		(options: IToGenericTableInput): Promise<TToGenericTableOutput> => {
			return new Promise((resolve, reject) => {
				toGenericTableMutation({
					variables: {
						...repositoryIdVariables,
						resourceId: props.resourceId,
						options: JSON.stringify(options),
					},
					onError: reject,
					onCompleted: (r) => {
						const { toGenericTable: toGenericTableJSON } = r.repository;
						// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
						const toCellArray: any = JSON.parse(toGenericTableJSON);
						assertTToGenericTableOutput(toCellArray);
						resolve(toCellArray);
					},
				});
			});
		},
		[props.resourceId, repositoryIdVariables, toGenericTableMutation]
	);

	const [preset, setPreset] = useState<IImportWizardPreset>(defaultPreset);
	const [warning, setWarning] = useState<string[]>();
	const [errors, setErrors] = useState<string[]>([]);
	const [step, setStep] = useState(0);
	const [timeframe, setTimeframe] = useState<{ begin: Date; end: Date } | undefined>(undefined);

	const [progress, setProgress] = useState(0);
	const [taskId, setTaskId] = useState<string | undefined>(undefined);

	const [selectedColumns, setSelectedColumns] = useState<number[]>([]);

	const [summary, setSummary] = useState<ColumnMetadataReturn | undefined>();

	const showStep = (step: number) => {
		setSelectedColumns([]);
		setStep(step);
	};

	// IMPORTANT: your config should be memoized, or at least not re-computed
	// every render. Otherwise, useSubscription will re-render too frequently.
	const config: GraphQLSubscriptionConfig<ImportWizardSubscription> = useMemo(() => {
		return {
			variables: {},
			onNext: (r) => {
				if (taskId !== undefined && r?.importTask?.id === taskId) {
					const { payload } = r.importTask;

					assert(payload.__typename !== "%other");

					switch (payload.__typename) {
						case "ImportTransformationProgress": {
							if (payload.progress != undefined) setProgress(payload.progress);
							break;
						}
						case "ImportTransformationSuccess": {
							const ids = payload.ids;
							if (ids.length == 1 && ids[0] !== null) {
								router.push("/repositories/:repositoryId/resources/:resourceId", {
									repositoryId,
									resourceId: ids[0],
								});
							} else {
								router.push("/repositories/:repositoryId/resources/:resourceId", {
									repositoryId,
									resourceId: props.resourceId,
								});
							}
							break;
						}
						case "ImportTransformationWarning": {
							setImportRunning(false);
							setWarning(payload.message.filter(isNonNullish));
							break;
						}
						case "ImportTransformationError": {
							setImportRunning(false);
							setErrors(payload.message.filter(isNonNullish));
							break;
						}
						default:
							assertUnreachable(payload);
					}
				}
			},
			subscription: ImportWizardGraphQLSubscription,
		};
	}, [props.resourceId, taskId, router, repositoryId]);
	useSubscription(config);

	// Header with types of each column
	const [columnTypeHeader, setColumnTypeHeader] = useState<Map<string, string>>(new Map());
	const [unitHeader, setUnitHeader] = useState<Map<string, TUnit>>(new Map());
	const [xyHeader, setXYHeader] = useState<Map<string, ReactElement>>(new Map());
	const [deviceIdMap, setDeviceIdMap] = useState<Map<string, string>>(new Map());
	const [indColumnTitleNumber, setColumnTitleNumber] = useState<Map<string, number[]>>(new Map());

	const columnMetadataConfigRef = useRef<IImportSelectionUpdateHandler>(null);

	const updateColumnsSelection = (columns: number[], columnsGlobal: number[]) => {
		setSelectedColumns(columns);
		columnMetadataConfigRef.current?.updateColumnsSelection(columns, columnsGlobal);
	};

	const [formControls, setFormControls] = useState<IImportWizardFormControls>(
		preset2ui(defaultPreset)
	);

	const query = usePreloadedQuery(ImportWizardGraphQLQuery, props.queryRef);

	const [deviceInfo, refetchDeviceInfo] = useRefetchableFragment<
		OperationType,
		ImportWizardDeviceInformationFragment$key
	>(ImportWizardDeviceInformationGraphqlFragment, query);

	const [cellArray, setCellArray] = useState<string[][]>();
	const [genericTable, setGenericTable] = useState<IGenericTable>();

	const [tabularData, setTabularData] = useState<(string | ReactElement)[][]>();

	const [tabularDataHeaderId, setTabularDataHeaderId] = useState<string[]>();
	const [tabularDataHeader, setTabularDataHeader] = useState<string[]>();

	const importTransformation = (importWithWarnings = false) => {
		const preset = JSON.stringify(ui2preset(formControls));
		importMutation({
			variables: {
				input: {
					rawResourceId: props.resourceId,
					presetJson: preset,
					importWithWarnings,
				},
				...repositoryIdVariables,
			},
			updater: (c) => {
				// Invalidate store of "source" resource
				// This is especially required/useful since the children of the "source" resource
				c.delete(props.resourceId);
			},
			onCompleted: ({ repository }) => {
				setImportRunning(true);
				const { createAndRunImportTransformation } = repository;
				setTaskId(createAndRunImportTransformation.importTaskId);
			},
		});
	};

	const preprocessMetadata = useCallback((config: IImportWizardPreset) => {
		// Prepare data structure for normalizers and
		// The length of the array would have to depend on the (still unknown) number of
		// columns. In order not to need the length directly, the type information is written
		// into the array at the positions where it is known. This creates a sparse array with
		// empty slots

		const normalizers = new Map<string, NormalizerId>();
		const types = new Map<string, string>();
		const units = new Map<string, TUnit>();
		const deviceIds = new Map<string, string>();
		for (const c of Object.values(config.columnMetadata)) {
			const normalizer = c.normalizerIds[0] ?? "";

			// Setup normalizer<
			normalizers.set(c.columnId, normalizer);

			// Setup Units
			if (c.unit !== undefined) {
				units.set(c.columnId, c.unit);
			}

			// Setup DeviceIds
			if (c.deviceId) {
				deviceIds.set(c.columnId, c.deviceId);
			}

			// Setup column type
			let type = normalizer ? `${getNiceNames(c.type)} (${normalizer})` : getNiceNames(c.type);
			if ((c.type === "time" || c.type === "date") && c.partnerColumnId) {
				type = `${type} (+ ${c.partnerColumnId})`;
			}

			if (c.type === "time" && c.startDate !== undefined) {
				type = `${type} (+ Offset)`;
			}

			types.set(c.columnId, type);
		}

		return { normalizers, types, units, deviceIds };
	}, []);

	const renderSubscript = (main: string, subscript: string | string[] | number) => {
		const sub = Array.isArray(subscript) ? subscript.join(",") : subscript;
		return (
			<>
				{main}
				<sub>{sub}</sub>
			</>
		);
	};

	useEffect(() => {
		const ids = Object.values(preset.columnMetadata)
			.map((c) => c.deviceId)
			.filter((id) => id !== undefined);

		refetchDeviceInfo({ ids: ids });
	}, [preset.columnMetadata, refetchDeviceInfo]);

	useEffect(() => {
		if (step === Steps.FILE_STRUCTURE) {
			void evaluatePreset(step, preset, setErrors, setWarning).then(setCellArray);
		}

		// Calculate data for step 1 (or step 2 if a preset was loaded while the user was on step 2)
		if (
			step === Steps.COLUMN_TYPES ||
			step === Steps.COLUMN_METADATA ||
			step === Steps.TIME_CONFIG
		) {
			void evaluatePreset(Steps.COLUMN_TYPES, preset, setErrors, setWarning).then((result) => {
				if (result) {
					setGenericTable(result.table);
					setColumnTypeHeader(result.types);
				}
			});
		}

		if (step === Steps.COLUMN_METADATA) {
			void evaluatePreset(step, preset, setErrors, setWarning).then((result) => {
				if (result) {
					const {
						header,
						headerId,
						types,
						units,
						deviceIds,
						dependencyHeader,
						independentColumTitleToNumberMap,
						timeframe,
						tabularDataWithParsedDates,
					} = result;
					setColumnTypeHeader(types);
					setUnitHeader(units);
					setDeviceIdMap(deviceIds);
					setTabularDataHeader(header);
					setTabularDataHeaderId(headerId);
					setXYHeader(dependencyHeader);
					setColumnTitleNumber(independentColumTitleToNumberMap);
					setTimeframe(timeframe);
					setTabularData(tabularDataWithParsedDates);
				}
			});
		}

		if (step === Steps.SUMMARY) {
			setImportButtonUnlocked(false);
			void evaluatePreset(Steps.COLUMN_METADATA, preset, setErrors, setWarning).then((result) => {
				if (result) {
					if (result?.deviceIds.size == 0) {
						setErrors(["You should define at least one column which is linked to a device"]);
					} else {
						setSummary(result);
						setImportButtonUnlocked(true);
					}
				}
			});
		}
	}, [
		step,
		formControls,
		preset.delimiter,
		preset.preview,
		preset.columnMetadata,
		preprocessMetadata,
		toCellArray,
		toGenericTable,
		toTabularDataArrayBuffer,
	]);

	const steps = ["File structure", "Column types", "Time", "Column metadata", "Summary"].map(
		(title, stepIndex) => {
			const [current, other] =
				errors.length > 0
					? (["warning", "disabled"] as const)
					: (["current", "incomplete"] as const);

			return {
				title,
				status: step === stepIndex ? current : other,
				onClick() {
					showStep(stepIndex);
				},
			};
		}
	);

	function createChangeHandler<T extends { value: string } = HTMLInputElement>(
		controlName: keyof IImportWizardFormControls
	): ChangeEventHandler<T> {
		return ({ target }: ChangeEvent<T>) => {
			let newFormControls = { ...formControls, [controlName]: target.value };

			// There is a issue with our coupling of state updates with validation
			// If someone is changing the "headerRows" the UI will instantly validate if the new
			// value for the "headerRows" is compatible with the "dataRow". This causes issues
			// as the Importer will rerender and complain about invalid values. To avoid this
			// the "dataRow" will be set to start one line after the last header row
			if (controlName === "headerRows") {
				const headerRow = headerRowsStringToArray(target.value);
				newFormControls = {
					...newFormControls,
					dataRow: String(headerRow[headerRow.length - 1] + 2),
				};
			}

			setFormControls(newFormControls);
			const newPreset = ui2preset(newFormControls);

			if (Array.isArray(newPreset)) {
				setErrors(newPreset);
			} else {
				// Reset errors in case there are none
				setErrors([]);
				setPreset(newPreset);
			}
		};
	}

	function createStateUpdater<K extends keyof IImportWizardFormControls>(
		controlName: K
	): (v: IImportWizardFormControls[K]) => void {
		return (value: IImportWizardFormControls[K]) => {
			const newFormControls = { ...formControls, [controlName]: value };
			setFormControls(newFormControls);
			const newPreset = ui2preset(newFormControls);

			if (Array.isArray(newPreset)) {
				setErrors(newPreset);
			} else {
				// Reset errors in case there are none
				setErrors([]);
				setPreset(newPreset);
			}
		};
	}

	const getNiceNames = (type: IColumnConfig["type"]) => {
		return type.charAt(0).toUpperCase() + type.slice(1);
	};

	const createRowFromMap = (
		header: string[],
		map: Map<string, string> | Map<string, ReactElement>
	) => {
		return header.map((_, i) => map.get(header[i]) ?? "");
	};

	let colorCounter = 0; // counter to help with the color assignment for an independent column
	const titleColorNameToColorHex = new Map<string, string>(); // map column title to color hex #
	const colorNumberToColorCount = new Map<string, number>(); // map color number associated with the color count

	const lighten = (color: string) => {
		// Create a color palette with 10 shades of the color and return the 5th shade (which is
		// visibly lighter but still close enough to the original color)
		return colorPalette([color], 10)[5];
	};

	const arrayOfIndependentColors = (() => {
		const fullColors = euiPaletteColorBlindBehindText();
		fullColors.splice(1, 1); // Remove the second color (blue) to avoid confusion with the selected columns
		return fullColors;
	})(); // array of independent color hex #s
	const arrayOfDependentColors = arrayOfIndependentColors.map(lighten); // array of dependent color hex #s

	for (const [title, independentColumns] of indColumnTitleNumber.entries()) {
		if (independentColumns.length === 0) {
			// get counter (num) of the to-be-assigned color
			const newColorNum = colorCounter % arrayOfIndependentColors.length;
			const newColorName = arrayOfIndependentColors[newColorNum]; // get name (hex) of the color to be assigned
			titleColorNameToColorHex.set(title, newColorName); // set the color hex assigned to the column name
			colorNumberToColorCount.set(newColorName, colorCounter); // set the color counter to the color name (hex)
			colorCounter++;
		}
	}

	for (const [title, independentColumns] of indColumnTitleNumber.entries()) {
		if (independentColumns.length != 0) {
			assertDefined(tabularDataHeaderId);
			// obtain the independent column number associated with the header name
			const independentColumnNumber = indColumnTitleNumber.get(title);
			assertDefined(independentColumnNumber);
			// obtain the header name associated with the first column number in the independentColumnName array
			const independentColumnName = tabularDataHeaderId[independentColumnNumber[0]];
			// get the color associated with this independent column
			const independentColumnColor = titleColorNameToColorHex.get(independentColumnName);
			assertDefined(independentColumnColor);
			// get the color number associated with this color
			const independentColumnColorNum = colorNumberToColorCount.get(independentColumnColor);
			assertDefined(independentColumnColorNum);
			// get the dependent color associated with the independent variable color number
			const dependentColumnColorNum = arrayOfDependentColors[independentColumnColorNum];
			titleColorNameToColorHex.set(title, dependentColumnColorNum);
		}
	}

	function getColor(_: number, col: number): string {
		if (
			colorCounter > 1 && // Only color if there are more than one independent columns
			tabularDataHeaderId
		) {
			const headerName = tabularDataHeaderId[col];
			const color = titleColorNameToColorHex.get(headerName);

			if (color) {
				return color;
			}
		}

		return "white";
	}

	const [headerRows, setHeaderRows] = useDebounceFormUpdate(
		formControls.headerRows,
		createStateUpdater("headerRows"),
		500
	);
	const [dataRow, setDataRow] = useDebounceFormUpdate(
		formControls.dataRow,
		createStateUpdater("dataRow"),
		500
	);

	return (
		<ImportWizardLayout
			steps={steps}
			progress={progress}
			presetList={
				<PresetSelection
					currentPreset={preset}
					deviceId={props.deviceId}
					presets={query}
					loadPreset={(preset) => {
						void toGenericTable({
							delimiter: preset.delimiter,
							preview: preset.preview,
							dataArea: preset.dataArea,
							normalizers: {},
						}).then((t) => {
							// Get rid of all referenced columns which aren't in this
							// file. This step is necessary because otherwise problems
							// with validation will arise (e.g. with the number of
							// independent columns) with columns that are not
							// accessible in the UI at all.
							const existingColumnNames = t.headerInternal;
							const columnMetadata = preset.columnMetadata;
							for (const presetColumnName in columnMetadata) {
								if (!existingColumnNames.includes(presetColumnName)) {
									delete columnMetadata[presetColumnName];
								}
							}

							const independentColumns: string[] = [];
							for (const presetColumnName in columnMetadata) {
								const originalLength = columnMetadata[presetColumnName].independent?.length;

								// Get rid of unavailable column names in independent array
								// Get rid of unavailable column names in independent array
								columnMetadata[presetColumnName].independent = columnMetadata[
									presetColumnName
								].independent?.filter(
									(independentColumnName) =>
										existingColumnNames.includes(independentColumnName) &&
										columnMetadata[independentColumnName].type !== "skip" // Some "legacy" presets seem to have "skipped" independent columns (???)
								);

								// Copy data from object into variable because otherwise
								// type narrowing won't work
								const thisColumn = columnMetadata[presetColumnName];
								// Get rid of unavailable column names in partnerColumnId
								if (
									(thisColumn.type === "date" || thisColumn.type === "time") &&
									thisColumn.partnerColumnId !== undefined
								) {
									if (!existingColumnNames.includes(thisColumn.partnerColumnId)) {
										thisColumn.partnerColumnId = undefined;
										columnMetadata[presetColumnName] = thisColumn;
									}
								}

								// If originally there was an entry which now got
								// removed the value should not become an empty array
								// (empty array means independent column) instead the
								// array should be set to undefined
								if (
									originalLength !== undefined &&
									originalLength > 0 &&
									columnMetadata[presetColumnName].independent?.length === 0
								) {
									columnMetadata[presetColumnName].independent = undefined;
								}

								if (columnMetadata[presetColumnName].independent?.length === 0) {
									independentColumns.push(presetColumnName);
								}
							}

							// If there is only one independent column, set it as the independent
							// column for all other columns
							if (independentColumns.length == 1) {
								const singleIndependentColumn = independentColumns[0];
								for (const presetColumnName in columnMetadata) {
									if (presetColumnName === singleIndependentColumn) {
										continue;
									}

									columnMetadata[presetColumnName].independent = [singleIndependentColumn];
								}
							}

							preset.columnMetadata = columnMetadata;

							// Update preset
							setWarning(undefined);
							setErrors([]);
							setFormControls(preset2ui(preset));
							setPreset(preset);
						});

						// Convert to TabularData to verify that the devices linked to the columns
						// are still available
						// TODO: Conditional?
						void toTabularDataArrayBuffer({
							dataArea: preset.dataArea,
							delimiter: preset.delimiter,
							preview: preset.preview,
							columnMetadata: preset.columnMetadata,
							decimalSeparator: preset.decimalSeparator,
						});
					}}
				/>
			}
		>
			{
				// Render global warning for all steps except the summary since the summary renders
				// a width restricted callout
				step !== Steps.SUMMARY && <ImportWizardWarning warnings={warning} />
			}
			{step === Steps.FILE_STRUCTURE && cellArray && (
				<EuiFlexItem>
					<EuiForm isInvalid={errors.length > 0} error={errors}>
						<EuiFlexGroup>
							<EuiFlexItem grow={false}>
								<EuiFormRow display="rowCompressed" label="File type">
									<EuiSelect
										options={[{ value: "csv", text: "CSV" }]}
										value={"csv"}
										onChange={() => {}}
									/>
								</EuiFormRow>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiFormRow display="rowCompressed" label="Preview rows">
									<EuiSelect
										options={previewItems}
										value={formControls.preview}
										onChange={createChangeHandler("preview")}
									/>
								</EuiFormRow>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiFormRow display="rowCompressed" label="Column delimiter">
									<EuiSelect
										options={columnDelimiters}
										value={formControls.delimiter}
										onChange={createChangeHandler("delimiter")}
									/>
								</EuiFormRow>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiFormRow display="rowCompressed" label="Decimal separators">
									<EuiSelect
										options={decimalSeparators}
										value={formControls.decimalSeparator}
										onChange={createChangeHandler("decimalSeparator")}
									/>
								</EuiFormRow>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiFormRow display="rowCompressed" label="Header rows">
									<EuiFieldText
										value={headerRows}
										onChange={(e) => setHeaderRows(e.target.value)}
									/>
								</EuiFormRow>
								<EuiFormRow display="rowCompressed" label="Data row">
									<EuiFieldText value={dataRow} onChange={(e) => setDataRow(e.target.value)} />
								</EuiFormRow>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiForm>
					<EuiSpacer />
					<Spreadsheet
						rows={cellArray.map((row) => row.map((value) => ({ value })))}
						headerOptions={{
							artificialHeaderRows: true,
							artificialHeaderColumns: true,
							headerRows: formControls.headerRows
								.split(formControls.delimiter)
								.map((value) => +value - 1),
						}}
						selectedColumns={selectedColumns}
						isLoading={waitingForData}
					/>
				</EuiFlexItem>
			)}

			{step === Steps.COLUMN_TYPES && genericTable && (
				<EuiFlexItem>
					<EuiForm isInvalid={errors.length > 0} error={errors}>
						<ColumnMetadata
							step={ColumnMetadataStep.ColumnType}
							selectedColumns={selectedColumns}
							headerRow={genericTable.header}
							headerIdRow={genericTable.headerInternal}
							dataRow={genericTable.body[0]}
							config={formControls.columnMetadata}
							setConfig={createStateUpdater("columnMetadata")}
							decimalSeparator={formControls.decimalSeparator}
						/>
					</EuiForm>
					<EuiSpacer />
					<Spreadsheet
						rows={[
							genericTable.header,
							createRowFromMap(genericTable.headerInternal, columnTypeHeader),
							...genericTable.body,
						].map((row) => row.map((value) => ({ value })))}
						headerOptions={{
							artificialHeaderColumns: true,
							artificialHeadersColumnFirstRows: ["Title", "Type"],
							headerRows: [0],
						}}
						selectedColumns={selectedColumns}
						onSelectedColumnsChange={updateColumnsSelection}
						isLoading={waitingForData}
					/>
				</EuiFlexItem>
			)}

			{step === Steps.TIME_CONFIG && genericTable && (
				<StepTime
					errors={errors}
					formControls={formControls}
					setConfig={createStateUpdater("columnMetadata")}
					genericTable={genericTable}
					createRowFromMap={createRowFromMap}
					columnTypeHeader={columnTypeHeader}
					updateColumnsSelection={updateColumnsSelection}
					showStep={showStep}
					createStateUpdater={createStateUpdater}
				/>
			)}

			{step === Steps.COLUMN_METADATA && genericTable && (
				<>
					{!(tabularDataHeader && tabularDataHeaderId && tabularData) ? (
						<EuiForm isInvalid={errors.length > 0} error={errors}></EuiForm>
					) : (
						<EuiFlexItem>
							<EuiForm isInvalid={errors.length > 0} error={errors}>
								<ColumnMetadata
									step={ColumnMetadataStep.ColumnMetadata}
									selectedColumns={selectedColumns}
									headerRow={tabularDataHeader}
									headerIdRow={tabularDataHeaderId}
									dataRow={genericTable.body[0]}
									config={formControls.columnMetadata}
									setConfig={createStateUpdater("columnMetadata")}
									timeFrame={timeframe}
									deviceId={deviceId}
									decimalSeparator={formControls.decimalSeparator}
								/>
							</EuiForm>
							<EuiSpacer />

							<Spreadsheet
								rows={[
									createRowFromMap(tabularDataHeaderId, xyHeader),
									tabularDataHeader,
									createRowFromMap(tabularDataHeaderId, columnTypeHeader),

									tabularDataHeaderId.map((_, i): string => {
										const unit = unitHeader.get(tabularDataHeaderId[i]);

										if (unit == undefined) {
											return "";
										}

										if (unit === UnitlessMarker) {
											return "Unitless";
										}

										return unit;
									}),

									createRowFromMap(tabularDataHeaderId, deviceIdMap).map((deviceId) => {
										const info = deviceInfo.nodes.find((node) => node.id === deviceId);

										if (info) {
											return info.name ?? "";
										}

										return "";
									}),
									...tabularData,
								].map((row) => row.map((value: string | ReactElement) => ({ value })))}
								headerOptions={{
									artificialHeaderColumns: true,
									artificialHeadersColumnFirstRows: ["", "Title", "Type", "Unit", "Device"],
									headerRows: [0],
								}}
								getBackgroundColor={getColor}
								onSelectedColumnsChange={updateColumnsSelection}
								selectedColumns={selectedColumns}
								isLoading={waitingForData}
							/>
						</EuiFlexItem>
					)}
				</>
			)}

			{step === Steps.SUMMARY && (
				<EuiForm
					isInvalid={errors.length > 0}
					error={errors}
					style={{ maxWidth: 920, marginLeft: "auto", marginRight: "auto" }}
				>
					<ImportWizardWarning warnings={warning} />
					<ImportWizardSummary
						summary={summary}
						importDisabled={errors.length > 0 || importRunning || !importButtonUnlocked}
						importTransformation={importTransformation}
						isLoading={importRunning}
						warning={warning}
						preset={preset}
					/>
				</EuiForm>
			)}
		</ImportWizardLayout>
	);
}

const columnDelimiters = [
	{ value: "\t", text: "Tab" },
	{ value: ",", text: "," },
	{ value: ";", text: ";" },
	{ value: " ", text: "Space" },
];
