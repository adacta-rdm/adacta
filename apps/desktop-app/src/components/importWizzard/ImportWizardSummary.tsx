import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiPanel,
	EuiSpacer,
	EuiStat,
} from "@elastic/eui";
import { EuiSkeletonCircle } from "@elastic/eui";
import type { EmotionJSX } from "@emotion/react/types/jsx-namespace";
import React from "react";

import { DateTime } from "../datetime/DateTime";

import type { TUnit } from "~/lib/importWizard/ImportWizardUnit";
import type { IImportWizardPreset } from "~/lib/interface/IImportWizardPreset";

interface IProps {
	isLoading: boolean;
	importDisabled: boolean;
	importTransformation: (importWithWarnings?: boolean) => void;
	preset: IImportWizardPreset;
	warning: string[] | undefined;

	summary?: {
		types: Map<string, string>;
		deviceIds: Map<string, string>;
		tabularDataWithParsedDates: (EmotionJSX.Element | string)[][];
		header: string[];
		dependencyHeader: Map<string, React.ReactElement>;
		units: Map<string, TUnit>;
		headerId: string[];
		independentColumTitleToNumberMap: Map<string, number[]>;
		timeframe: { begin: Date; end: Date };
	};
}

function SummaryStats(props: { summary: NonNullable<IProps["summary"]> }) {
	return (
		<EuiFlexGroup direction={"column"}>
			<EuiFlexItem>
				<EuiPanel hasBorder={true}>
					<EuiFlexGroup direction={"row"}>
						<EuiStat
							title={<DateTime date={props.summary.timeframe.begin} />}
							description="Begin of Recording"
						/>
						<EuiStat
							title={<DateTime date={props.summary.timeframe.end} />}
							description="End of Recording"
						/>
					</EuiFlexGroup>
				</EuiPanel>
			</EuiFlexItem>
			<EuiFlexItem>
				<EuiFlexGroup direction={"row"}>
					<EuiFlexItem>
						<EuiPanel hasBorder={true}>
							{props.summary.tabularDataWithParsedDates.length > 0 ? (
								<EuiStat
									title={props.summary.tabularDataWithParsedDates[0].length}
									description="Configured Columns"
								/>
							) : (
								<></>
							)}
						</EuiPanel>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiPanel hasBorder={true}>
							<EuiStat
								title={[...new Set(props.summary.deviceIds.values())].length}
								description="Devices"
							/>
						</EuiPanel>
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}

export function ImportWizardSummary(props: IProps) {
	if (!props.summary) {
		return <EuiSkeletonCircle />;
	}

	const { importDisabled, isLoading, importTransformation, warning, preset } = props;

	return (
		<EuiFlexGroup justifyContent={"center"} alignItems={"baseline"}>
			<EuiFlexItem grow={7}>
				<SummaryStats summary={props.summary} />
				<EuiSpacer />
			</EuiFlexItem>
			<EuiFlexItem grow={3}>
				<EuiFormRow>
					{warning === undefined ? (
						<EuiButton
							disabled={importDisabled}
							onClick={() => importTransformation()}
							isLoading={isLoading}
							color={!importDisabled ? "success" : "danger"}
						>
							Import
						</EuiButton>
					) : (
						<EuiButton
							disabled={importDisabled}
							onClick={() => importTransformation(true)}
							isLoading={isLoading}
							color={!importDisabled ? "warning" : "danger"}
						>
							Import (ignore above warnings)
						</EuiButton>
					)}
				</EuiFormRow>
				{process.env.NODE_ENV === "development" && (
					<EuiFormRow>
						<EuiButton
							onClick={() => {
								// eslint-disable-next-line no-console
								console.log(JSON.stringify(preset, undefined, 4));
							}}
						>
							Dump preset
						</EuiButton>
					</EuiFormRow>
				)}
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
