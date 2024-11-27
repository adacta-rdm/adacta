import {
	EuiButton,
	EuiCallOut,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPageTemplate,
	EuiSpacer,
	EuiSwitch,
} from "@elastic/eui";
import type { EuiStepHorizontalProps } from "@elastic/eui/src/components/steps/step_horizontal";
import type { Dispatch, Reducer, ReducerAction, ReducerState } from "react";
import React, { useReducer, useState } from "react";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";

import { ImportDeviceSelection } from "../ImportDeviceSelection";

import type { GamryImportMutation } from "@/relay/GamryImportMutation.graphql";
import type { GamryImportQuery } from "@/relay/GamryImportQuery.graphql";
import type { GamryImportStep2Query } from "@/relay/GamryImportStep2Query.graphql";
import { UnitInput } from "~/apps/desktop-app/src/components/importWizzard/columnMetadata/UnitInput";
import { getUnitKind } from "~/apps/desktop-app/src/components/importWizzard/columnMetadata/utils/getUnitKind";
import { GamryTimeSelectionLazy } from "~/apps/desktop-app/src/components/importWizzard/gamryDta/GamryTimeSelection";
import { ImportWizardLayout } from "~/apps/desktop-app/src/components/importWizzard/layout/ImportWizardLayout";
import { PresetSelection } from "~/apps/desktop-app/src/components/importWizzard/preset/PresetSelection";
import { useImportSubscription } from "~/apps/desktop-app/src/components/importWizzard/useImportSubscription";
import { AdactaPageTemplate } from "~/apps/desktop-app/src/components/layout/AdactaPageTemplate";
import { useRepoRouterHook } from "~/apps/desktop-app/src/services/router/RepoRouterHook";
import { useRepositoryId } from "~/apps/desktop-app/src/services/router/UseRepoId";
import { IImportTransformationType } from "~/apps/repo-server/src/graphql/generated/requests";
import { assertDefined } from "~/lib/assert";
import type { IDatetime } from "~/lib/createDate";
import { createDate, createIDatetime } from "~/lib/createDate";
import type { IDeviceId, IResourceId } from "~/lib/database/Ids";
import { UnitlessMarker } from "~/lib/importWizard/ImportWizardUnit";
import type {
	GamryColumn,
	IGamryPreset,
	TGamryDateInfo,
} from "~/lib/interface/IImportWizardPreset";

interface IState {
	dateInfo: TGamryDateInfo | undefined; // undefined while in first step
	columns: GamryColumn[];
}

type TDispatch = Dispatch<ReducerAction<typeof reducer>>;

/**
 * Step 1: Figure out the date range
 * - Option 1: Timezone + Automatic extraction using the Time/T column
 * - Option 2: Offset-Column + Start date
 * - Option 3: Manual (specify start and end date)
 *
 *    Step 2:
 * - (REQUIREMENT: Column Headers, opt. Units(?)) Select the X/Y columns (NOTE: I think the time column is often the independent variable but it is favorable to ignore it and select a different column as the independent variable)
 * - (REQUIREMENT: Time) Select the device for each column: Note it is probably column to have the same device for all columns
 *        - Implement a way to select the device for all columns at once (Make sure to not auto-select the device for columns that need to be skipped)
 */

const reducer: Reducer<
	IState,
	| { type: "set" | "remove"; column: GamryColumn }
	// "replaceState" is used to load a preset
	| {
			type: "replaceState";
			state: IState;
	  }
	| { type: "setDateInfo"; dateInfo: TGamryDateInfo }
	| {
			type: "setIndependent";
			columnName: string;
	  }
> = (state, action): IState => {
	switch (action.type) {
		case "set":
			return {
				dateInfo: state.dateInfo,
				columns: [
					...state.columns.filter((c) => c.columnId !== action.column.columnId),
					action.column,
				],
			};
		case "remove":
			return {
				dateInfo: state.dateInfo,
				columns: state.columns.filter((c) => c.columnId !== action.column.columnId),
			};
		case "setDateInfo":
			return { dateInfo: action.dateInfo, columns: state.columns };
		case "setIndependent":
			return {
				dateInfo: state.dateInfo,
				columns: [
					...state.columns.map((c) => {
						return c.title !== action.columnName
							? {
									...c,
									independentVariablesNames: [action.columnName],
							  }
							: { ...c, independentVariablesNames: [] };
					}),
				],
			};
		case "replaceState":
			return action.state;
	}
};

export const GamryImportGraphqlQuery = graphql`
	query GamryImportQuery($resourceId: ID!, $deviceId: ID!) {
		gamryToStep1(resourceId: $resourceId) {
			error {
				message
			}
			data {
				tableHeaders
				units
				absoluteTimeInFile
			}
		}

		...PresetSelection @arguments(deviceId: $deviceId, type: GAMRY)
	}
`;

/**
 * Convert the units from Gamry to ones supported by Adacta/Einheiten
 * @constructor
 */
function fixGamryUnitsToEinheiten(unit: Readonly<string>): string | typeof UnitlessMarker {
	if (unit == "deg C") {
		return "°C"; // degC would also be possible but the proper degree symbol is nicer
	}

	if (unit === "V vs. Ref.") {
		return UnitlessMarker;
	}

	if (unit === "#") {
		return UnitlessMarker;
	}

	return unit;
}

export function GamryImport(props: {
	data: PreloadedQuery<GamryImportQuery>;
	deviceId: IDeviceId;
	resourceId: IResourceId;
}) {
	const data = usePreloadedQuery(GamryImportGraphqlQuery, props.data);

	const [importRunning, setImportRunning] = useState(false);
	const [errors, setErrors] = useState<string[]>([]);
	const [warning, setWarning] = useState<string[]>([]);
	const [taskId, setTaskId] = useState<string | undefined>(undefined);
	const [progress, setProgress] = useState<number>(0);

	const [step, setStep] = useState(0);

	const { router } = useRepoRouterHook();
	const repositoryId = useRepositoryId();

	const [commitImport] = useMutation<GamryImportMutation>(graphql`
		mutation GamryImportMutation($input: CreateAndRunImportTransformationInput!) {
			createAndRunImportTransformation(input: $input) {
				importTaskId
			}
		}
	`);

	useImportSubscription({
		taskId,
		router,
		resourceId: props.resourceId,
		repositoryId,
		setProgress,
		setImportRunning,
		setWarning,
		setErrors,
	});

	const [state, dispatch] = useReducer(reducer, { dateInfo: undefined, columns: [] });

	if (data.gamryToStep1.error) {
		return (
			<AdactaPageTemplate>
				<EuiPageTemplate.Header pageTitle={"Import"} />
				<EuiPageTemplate.Section>
					<EuiCallOut title={"Error"} color={"danger"}>
						This file can not be imported as Gamry file ({data.gamryToStep1.error.message})
					</EuiCallOut>
					<EuiSpacer />
					<EuiButton
						onClick={() => {
							router.push("/repositories/:repositoryId/resources/:resourceId", {
								repositoryId,
								resourceId: props.resourceId,
							});
						}}
					>
						Back to Resource
					</EuiButton>
				</EuiPageTemplate.Section>
			</AdactaPageTemplate>
		);
	}

	if (data.gamryToStep1.data == null) {
		return <></>;
	}

	const gamryMetadata = data.gamryToStep1.data;
	if (gamryMetadata.absoluteTimeInFile == null) {
		return <>File type not supported. Unable to get time</>;
	}

	const headers = gamryMetadata.tableHeaders;

	const presetList = (
		<PresetSelection
			type={"gamry"}
			deviceId={props.deviceId}
			currentPreset={
				state.dateInfo
					? {
							dateInfo: state.dateInfo,
							columns: state.columns,
					  }
					: undefined
			}
			loadPreset={(p) => {
				// Strip out columns that are not available in the file
				// Strip out columns that have broken references
				const columns = p.columns.filter(
					(c) =>
						headers.includes(c.title) &&
						c.independentVariablesNames.every((v) => headers.includes(v))
				);
				dispatch({ type: "replaceState", state: { columns, dateInfo: p.dateInfo } });
			}}
			presets={data}
		/>
	);
	const steps: Omit<EuiStepHorizontalProps, "step">[] = [
		"Time information",
		"Column metadata",
		"Summary",
	].map((title, stepIndex) => {
		const [current, other] =
			errors.length > 0 ? (["warning", "disabled"] as const) : (["current", "incomplete"] as const);

		return {
			title,
			status: step === stepIndex ? current : other,
			disabled: step < stepIndex,
			onClick() {
				setStep(stepIndex);
			},
		};
	});

	return (
		<ImportWizardLayout presetList={presetList} progress={progress} steps={steps}>
			{errors.length > 0 && (
				<>
					<EuiCallOut title={"Import resulted in error(s)"} color={"danger"}>
						{errors}
					</EuiCallOut>
					<EuiSpacer />
				</>
			)}
			{warning.length > 0 && (
				<>
					<EuiCallOut color={"warning"}>{warning}</EuiCallOut>
					<EuiSpacer />
				</>
			)}

			{step + 1 === 1 && (
				<div style={{ width: "1200px", marginLeft: "auto", marginRight: "auto" }}>
					<GamryTimeSelectionLazy
						dateInfo={state.dateInfo}
						setDateInfo={(d) => {
							setStep(1);
							dispatch({ type: "setDateInfo", dateInfo: d });
						}}
						resourceId={props.resourceId}
					/>
				</div>
			)}

			{step + 1 === 2 && (
				<div style={{ width: "1200px", marginLeft: "auto", marginRight: "auto" }}>
					<GamryImportStep2
						state={state}
						dispatch={dispatch}
						resourceId={props.resourceId}
						deviceId={props.deviceId}
						headers={data.gamryToStep1.data.tableHeaders}
						units={data.gamryToStep1.data.units}
						timezone={state.dateInfo?.timezone}
					/>
					<EuiSpacer />
					<EuiFlexItem grow={false}>
						<EuiButton
							isLoading={importRunning}
							disabled={state.dateInfo === undefined}
							onClick={() => {
								assertDefined(state.dateInfo);
								const preset: IGamryPreset = {
									dateInfo: state.dateInfo,
									columns: state.columns,
								};

								commitImport({
									onCompleted: (e) => {
										setTaskId(e.createAndRunImportTransformation.importTaskId);
									},
									variables: {
										input: {
											type: IImportTransformationType.Gamry,
											rawResourceId: props.resourceId,
											presetJson: JSON.stringify(preset),
										},
									},
								});
							}}
						>
							Import
						</EuiButton>
					</EuiFlexItem>
				</div>
			)}
		</ImportWizardLayout>
	);
}

function GamryImportStep2(props: {
	resourceId: IResourceId;
	timezone?: string;

	state: IState;
	dispatch: TDispatch;

	headers: readonly string[];
	units: readonly string[];
	deviceId: IDeviceId;
}) {
	assertDefined(props.timezone, "Timezone has to be defined in step 1");
	const data = useLazyLoadQuery<GamryImportStep2Query>(
		graphql`
			query GamryImportStep2Query($resourceId: ID!, $timezone: String!) {
				gamryToStep2(resourceId: $resourceId, timezone: $timezone) {
					data {
						absoluteTime {
							begin
							end
						}
					}
				}
			}
		`,
		{
			resourceId: props.resourceId,
			timezone: props.timezone,
		}
	);

	const { state } = props;

	const getDateInfo = () => {
		assertDefined(state.dateInfo, "Date info not available in state"); // Step 2 requires date info from Step 1

		if (state.dateInfo.type === "automatic") {
			assertDefined(data.gamryToStep2.data?.absoluteTime, "Absolute time not available");
			return {
				begin: createIDatetime(createDate(data.gamryToStep2.data.absoluteTime.begin)),
				end: createIDatetime(createDate(data.gamryToStep2.data.absoluteTime.end)),
			};
		} else if (state.dateInfo.type === "manual") {
			return {
				begin: state.dateInfo.begin,
				end: state.dateInfo.end,
			};
		} else {
			throw new Error("Invalid date info");
		}
	};

	const { begin, end } = getDateInfo();

	return (
		<TableMetadata
			deviceId={props.deviceId}
			columns={props.headers.map((header, i) => {
				return {
					header,
					unit: fixGamryUnitsToEinheiten(props.units[i]),
				};
			})}
			begin={begin}
			end={end}
			state={state}
			dispatch={props.dispatch}
		/>
	);
}

/**
 * List the info
 * @constructor
 */
function TableMetadata(props: {
	columns: { header: string; unit: string | typeof UnitlessMarker }[];
	deviceId: string;
	begin: IDatetime;
	end: IDatetime;

	state: ReducerState<typeof reducer>;
	dispatch: TDispatch;
}) {
	return (
		<EuiFlexGroup direction={"column"}>
			{props.columns.map((column, i) => {
				return (
					<EuiFlexItem key={i}>
						<Header
							setupDeviceId={props.deviceId}
							column={{
								...column,
								independent:
									props.state.columns.find((c) => c.title === column.header)
										?.independentVariablesNames.length === 0,
							}}
							begin={props.begin}
							end={props.end}
							setDevice={(path, deviceId) => {
								props.dispatch({
									type: "set",
									column: {
										type: "number",
										columnId: column.header,
										title: column.header,
										description: "",
										unit: column.unit,
										deviceId: deviceId,
										devicePath: path,
										independentVariablesNames:
											column.header === "T" || column.header === "Time"
												? []
												: [props.columns.map((c) => c.header).includes("T") ? "T" : "Time"],
									},
								});
							}}
							devicePath={
								props.state.columns.find((c) => {
									return c.columnId === column.header;
								})?.devicePath
							}
							setIndependent={() => {
								props.dispatch({
									type: "setIndependent",
									columnName: column.header,
								});
							}}
						/>
					</EuiFlexItem>
				);
			})}
		</EuiFlexGroup>
	);
}

function Header(props: {
	column: { header: string; unit: string | typeof UnitlessMarker; independent: boolean };
	begin: IDatetime;
	end: IDatetime;

	// Device ID of the setup
	setupDeviceId: string;

	devicePath: string[] | undefined;

	setDevice: (path: string[], id: IDeviceId) => void;
	setIndependent: (independent: boolean) => void;
}) {
	const skip = isAutoSkipped(props.column);

	return (
		<EuiFlexGroup>
			<EuiFlexItem grow={1}>{props.column.header}</EuiFlexItem>
			<EuiFlexItem grow={1}>
				<UnitInput readOnly disabled={skip} value={props.column.unit} onChange={() => {}} />
			</EuiFlexItem>
			<EuiFlexItem grow={3}>
				<ImportDeviceSelection
					deviceId={props.setupDeviceId}
					begin={createDate(props.begin)}
					end={createDate(props.end)}
					onChange={(path, id) => {
						props.setDevice(path, id);
					}}
					pathOfSelectedDevice={props.devicePath ?? undefined}
					acceptsUnit={props.column.unit != undefined ? getUnitKind(props.column.unit) : undefined}
					disabled={skip ? "This column is automatically skipped based on its title/unit" : false}
				/>
			</EuiFlexItem>
			<EuiFlexItem grow={false}>
				<EuiSwitch
					label={"Use as independent variable"}
					checked={props.column.independent}
					onChange={(e) => {
						props.setIndependent(e.target.checked);
					}}
				/>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}

function isAutoSkipped(column: { header: string; unit: string | typeof UnitlessMarker }) {
	return column.unit === "bits" || column.header === "Pt";
}
