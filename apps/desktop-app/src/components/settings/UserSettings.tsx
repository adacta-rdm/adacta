import {
	EuiCallOut,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiSelect,
	EuiSpacer,
	EuiTitle,
} from "@elastic/eui";
import React, { useCallback, useEffect, useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { PureDateTime } from "../datetime/DateTime";

import type { UserSettings$key } from "@/relay/UserSettings.graphql";
import type { UserSettingsUpdateMutation } from "@/relay/UserSettingsUpdateMutation.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";
import type { TimeStyle } from "~/lib/interface/TimeStyle";

const UserSettingsGraphQLFragment = graphql`
	fragment UserSettings on CurrentUser {
		payload {
			timeSetting {
				locale
				dateStyle
				timeStyle
			}
		}
	}
`;

const UserSettingsUpdateMutationGraphQL: GraphQLTaggedNode = graphql`
	mutation UserSettingsUpdateMutation($input: UpdateTimeSettingsInput!) {
		updateTimeSettings(input: $input) {
			...UserSettings
		}
	}
`;

interface IProps {
	currentUser: UserSettings$key;
}

export function UserSettings(props: IProps) {
	const currentUser = useFragment(UserSettingsGraphQLFragment, props.currentUser);
	const timeSetting = currentUser.payload.timeSetting;
	assertDefined(timeSetting);

	const [updateSettingsMutation] = useMutation<UserSettingsUpdateMutation>(
		UserSettingsUpdateMutationGraphQL
	);

	const localeOptions = [
		{ value: "de-DE", text: "Germany" },
		{ value: "en-US", text: "United States" },
	];

	const formatOptions: { value: TimeStyle; text: string }[] = [
		{ value: "full", text: "Full" },
		{ value: "long", text: "Long" },
		{ value: "medium", text: "Medium" },
		{ value: "short", text: "Short" },
	];

	const [locale, setLocale] = useState(timeSetting.locale);

	const [dateStyle, setDateStyle] = useState<TimeStyle>(timeSetting.dateStyle as TimeStyle);

	const [timeStyle, setTimeStyle] = useState<TimeStyle>(timeSetting.timeStyle as TimeStyle);

	const updateSettings = useCallback(() => {
		updateSettingsMutation({
			variables: { input: { locale, dateStyle, timeStyle } },
			onError: (e) => {
				throw e;
			},
		});
	}, [updateSettingsMutation, locale, dateStyle, timeStyle]);

	// Auto save changes to the form
	useEffect(() => {
		updateSettings();
	}, [locale, dateStyle, timeStyle, updateSettings]);

	// The 'long' format is really very long and probably no one will want to choose it permanently.
	// But since it's hard to say if someone might need this format (temporarily) it
	// remains here as an option with a warning.
	const longFormatWarning =
		dateStyle === "full" || timeStyle === "full" ? (
			<>
				<EuiCallOut title="Length of date" color="warning" iconType="alert">
					<p>
						Since the date is displayed in many places, we recommend not to select a format that is
						too long, otherwise some of the overviews may become too crowded.
					</p>
				</EuiCallOut>
				<EuiSpacer />
			</>
		) : null;

	return (
		<>
			<EuiTitle>
				<h4>Customize date format</h4>
			</EuiTitle>
			<EuiSpacer size={"s"} />
			<EuiForm component="form">
				<EuiFlexGroup>
					<EuiFlexItem>
						<EuiFormRow label="Locale">
							<EuiSelect
								options={localeOptions}
								value={locale}
								onChange={(e) => setLocale(e.target.value)}
							/>
						</EuiFormRow>
						<EuiFormRow label="Date Format">
							<EuiSelect
								options={formatOptions}
								value={dateStyle}
								onChange={(e) => {
									setDateStyle(e.target.value as TimeStyle);
								}}
							/>
						</EuiFormRow>
						<EuiFormRow label="Time Format">
							<EuiSelect
								options={formatOptions}
								value={timeStyle}
								onChange={(e) => {
									setTimeStyle(e.target.value as TimeStyle);
								}}
							/>
						</EuiFormRow>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiTitle size="s">
							<h5>Time preview</h5>
						</EuiTitle>
						{longFormatWarning}
						<PureDateTime date={new Date()} locale={locale} options={{ dateStyle, timeStyle }} />
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiForm>
		</>
	);
}
