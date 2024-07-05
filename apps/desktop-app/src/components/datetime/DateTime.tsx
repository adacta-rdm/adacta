import React from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import type { DateTimeQuery } from "@/relay/DateTimeQuery.graphql";
import type { TimeStyle } from "~/lib/interface/TimeStyle";
import { getDefaultTimeSettings } from "~/lib/utils/getDefaultTimeSettings";

const DateTimeGraphQLQuery = graphql`
	query DateTimeQuery {
		currentUser {
			payload {
				timeSetting {
					locale
					dateStyle
					timeStyle
				}
			}
		}
	}
`;

interface IProps {
	date?: Date | null;
	undefinedMeansNow?: boolean;
}

export function DateTime(props: IProps) {
	const dateSettings = useLazyLoadQuery<DateTimeQuery>(DateTimeGraphQLQuery, {});
	const { locale, dateStyle, timeStyle } =
		dateSettings.currentUser.payload.timeSetting ?? getDefaultTimeSettings();
	const undefinedMeansNow = props.undefinedMeansNow ?? false;

	if (!props.date) {
		if (undefinedMeansNow) {
			return <>now</>;
		}

		return <>unknown</>;
	}

	return (
		<PureDateTime
			date={props.date}
			locale={locale}
			options={{
				dateStyle: dateStyle as TimeStyle,

				timeStyle: timeStyle as TimeStyle,
			}}
		/>
	);
}

export function PureDateTime(props: {
	locale: string;
	options: Intl.DateTimeFormatOptions;
	date: Date;
}) {
	return <>{new Intl.DateTimeFormat(props.locale, props.options).format(props.date)}</>;
}
