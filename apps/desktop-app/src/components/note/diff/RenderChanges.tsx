import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from "@elastic/eui";
import type { EuiThemeComputed } from "@elastic/eui/src/services/theme/types";
import { css } from "@emotion/react";
import type { ReactElement } from "react";

import { useTextDiff } from "./useTextDiff";
import { AdactaMarkdownFormat } from "../../markdown/AdactaMarkdownFormat";

interface IProps extends IDiffProps {
	sideBySide?: boolean;
}

interface IDiffProps {
	renderMode: "markdown" | "react";
	beforeText: string;
	afterText: string;
}

const diffStyle = (euiTheme: EuiThemeComputed) => {
	const style = css`
		del {
			color: ${euiTheme.colors.dangerText};
		}
		ins {
			color: ${euiTheme.colors.successText};
		}
	`;
	return style;
};

function RenderDiff(props: IDiffProps) {
	const diff = useTextDiff(props);

	const { euiTheme } = useEuiTheme();

	return props.renderMode === "markdown" ? (
		<AdactaMarkdownFormat css={diffStyle(euiTheme)}>{diff as string}</AdactaMarkdownFormat>
	) : (
		<span css={diffStyle(euiTheme)}>{diff as unknown as ReactElement}</span>
	);
}

export function RenderChanges(props: IProps) {
	if (props.sideBySide) {
		const render = (text: string) =>
			props.renderMode === "markdown" ? <AdactaMarkdownFormat>{text}</AdactaMarkdownFormat> : text;

		return (
			<EuiFlexGroup>
				<EuiFlexItem grow={5}>{render(props.beforeText)}</EuiFlexItem>
				<EuiFlexItem grow={5}>{render(props.afterText)}</EuiFlexItem>
			</EuiFlexGroup>
		);
	}

	return <RenderDiff {...props} />;
}
