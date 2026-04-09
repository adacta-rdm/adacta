import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiPanel,
	EuiSkeletonCircle,
	EuiSpacer,
	EuiStat,
} from "@elastic/eui";
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
	/**
	 * If some resources were imported with warnings, their ids can be passed here to show the user which ones were
	 * affected and allow them to decide what to do with them.
	 */
	resourcesImportedWithWarnings?: string[];

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
				<>
					{(warning?.length ?? 0) === 0 ||
					(props.resourcesImportedWithWarnings?.length ?? 0) === 0 ? (
						<EuiFormRow>
							<EuiButton
								disabled={importDisabled}
								onClick={() => importTransformation()}
								isLoading={isLoading}
								color={!importDisabled ? "success" : "danger"}
							>
								Import
							</EuiButton>
						</EuiFormRow>
					) : null}
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
				</>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
