import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiPanel,
	EuiSpacer,
	EuiText,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useFragment, useLazyLoadQuery } from "react-relay";

import type { GamryTimeSelection$key } from "@/relay/GamryTimeSelection.graphql";
import type { GamryTimeSelectionQuery } from "@/relay/GamryTimeSelectionQuery.graphql";
import { TimezoneSelection } from "~/apps/desktop-app/src/components/importWizzard/date/TimezoneSelection";
import { ManualDateExtraction } from "~/apps/desktop-app/src/components/importWizzard/date/extraction/ManualDateExtraction";
import { createIDatetime } from "~/lib/createDate";
import type { IResourceId } from "~/lib/database/Ids";
import type { IDateInfoManual, TGamryDateInfo } from "~/lib/interface/IImportWizardPreset";

type TModes = "automatic" | "relative" | "manual";

export function GamryTimeSelectionLazy(props: {
	dateInfo?: TGamryDateInfo;
	setDateInfo: (dateInfo: TGamryDateInfo) => void;

	resourceId: IResourceId;
}) {
	const data = useLazyLoadQuery<GamryTimeSelectionQuery>(
		graphql`
			query GamryTimeSelectionQuery($resourceId: ID!) {
				gamryToStep1(resourceId: $resourceId) {
					data {
						...GamryTimeSelection
					}
				}
			}
		`,
		{ resourceId: props.resourceId }
	);

	if (data.gamryToStep1.data === null) {
		return null;
	}

	return (
		<GamryTimeSelection
			data={data.gamryToStep1.data}
			dateInfo={props.dateInfo}
			setDateInfo={props.setDateInfo}
		/>
	);
}

export function GamryTimeSelection(props: {
	data: GamryTimeSelection$key;

	dateInfo?: TGamryDateInfo;
	setDateInfo: (dateInfo: TGamryDateInfo) => void;
}) {
	const data = useFragment(
		graphql`
			fragment GamryTimeSelection on GamryMetadataStep1 {
				absoluteTimeInFile
			}
		`,
		props.data
	);

	// const timezone = props.dateInfo?.timezone ?? "Europe/Berlin";

	const [timezone, setTimezone] = useState<string>(props.dateInfo?.timezone ?? "Europe/Berlin");

	const options: {
		cta: string;
		available: boolean;
		description: string;
		id: TModes;
		title: string;

		onClick?: () => void;
	}[] = [
		{
			id: "automatic",
			title: "Automatic time detection",
			description:
				"Use date information in the metadata header and combine it with the suiting time column.",
			cta: "Use automatic time detection",
			available: data.absoluteTimeInFile,
			// onClick: () => props.setDateInfo({ type: "automatic", timezone }),
		},
		{
			id: "relative",
			title: "Relative time in file",
			description:
				"Extract time information from a column in the file. The time is relative to a given time.",
			cta: "Select relative time column",
			available: false,
		},
		{
			id: "manual",
			title: "Manual time selection",
			description: "Manually select the begin and end of the measurement.",
			cta: "Select time range",
			available: true,
		},
	] as const;

	const [mode, setMode] = useState<TModes | undefined>();

	if (mode === undefined) {
		return options.map((option) => {
			const textColor = !option.available ? "dimgrey" : undefined;
			return (
				<>
					<EuiPanel>
						<EuiText color={textColor}>{option.title}</EuiText>
						<EuiFlexGroup>
							<EuiFlexItem grow={6}>
								<EuiText size={"s"} color={textColor}>
									<p>{option.description}</p>
								</EuiText>
							</EuiFlexItem>
							<EuiFlexItem grow={1}>
								<EuiButton
									disabled={!option.available}
									onClick={() => {
										setMode(option.id);
										option.onClick?.();
									}}
								>
									{option.cta}
								</EuiButton>
							</EuiFlexItem>
						</EuiFlexGroup>
					</EuiPanel>
					<EuiSpacer size={"s"} />
				</>
			);
		});
	} else if (mode === "manual") {
		return (
			<ManualTimeSelection
				onSave={(i) => props.setDateInfo({ ...i, timezone })}
				timezone={timezone}
				setTimezone={setTimezone}
				reset={() => setMode(undefined)}
			/>
		);
	} else if (mode === "automatic") {
		return (
			<>
				<EuiFormRow label={"Timezone"}>
					<TimezoneSelection timezone={timezone} setTimezone={setTimezone} />
				</EuiFormRow>
				<EuiSpacer />
				<EuiFlexGroup>
					<EuiFlexItem grow={false}>
						<EuiButton onClick={() => props.setDateInfo({ type: "automatic", timezone })}>
							Confirm time
						</EuiButton>
					</EuiFlexItem>
					<EuiFlexItem grow={false}>
						<EuiButton onClick={() => setMode(undefined)}>Back</EuiButton>
					</EuiFlexItem>
				</EuiFlexGroup>
			</>
		);
	} else {
		return <div>Mode: {mode}</div>;
	}
}

function ManualTimeSelection(props: {
	onSave: (info: IDateInfoManual) => void;
	timezone: string;
	setTimezone: (timezone: string) => void;
	reset: () => void;
}) {
	const [begin, setBegin] = useState<Date>(new Date());
	const [end, setEnd] = useState<Date>(new Date(new Date().getTime() + 60 * 60 * 1000));
	const { timezone, setTimezone } = props;

	return (
		<>
			<EuiFlexGroup>
				<EuiFlexItem grow={false}>
					<EuiFormRow label={"Timezone"}>
						<TimezoneSelection timezone={timezone} setTimezone={setTimezone} />
					</EuiFormRow>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<ManualDateExtraction
						state={{
							begin: { date: begin, setDate: setBegin },
							end: { date: end, setDate: setEnd },
						}}
					/>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiFlexGroup>
				<EuiFlexItem grow={false}>
					<EuiButton
						onClick={() =>
							props.onSave({
								type: "manual",
								begin: createIDatetime(begin),
								end: createIDatetime(end),
								timezone,
							})
						}
					>
						Confirm time
					</EuiButton>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<EuiButton onClick={() => props.reset()}>Back</EuiButton>
				</EuiFlexItem>
			</EuiFlexGroup>
		</>
	);
}
