import type { IconType } from "@elastic/eui";
import { EuiIcon, useEuiTheme } from "@elastic/eui";
import type { UseEuiTheme } from "@elastic/eui/src/services/theme/hooks";
import type { EuiThemeComputed } from "@elastic/eui/src/services/theme/types";
import { css } from "@emotion/react";
import type { PropsWithChildren } from "react";
import React from "react";

import { EuiIconInsert } from "../icons/EuiIconInsert";
import { EuiIconRemove } from "../icons/EuiIconRemove";

const size = ({ size, fontSize }: { size: string; fontSize: string }) => {
	return `
    width: ${size};
    height: ${size};
    line-height: ${size};
    font-size: ${fontSize};
  `;
};

// Borrowed from https://github.com/elastic/eui/blob/be9c29c01318ead3acf72a6ebd23e1c99066ce4a/src/components/avatar/avatar.styles.ts#L13
const euiAvatarStyles = ({ euiTheme }: UseEuiTheme) => ({
	// Base
	euiAvatar: css`
		// Ensures it never scales down below its intended size
		flex-shrink: 0;
		display: inline-flex;
		justify-content: center;
		align-items: center;
		vertical-align: middle;
		background-size: cover;
		border-radius: 50%;
		font-weight: ${euiTheme.font.weight.medium};
	`,
	// Sizes
	s: css(
		size({
			size: euiTheme.size.l,
			fontSize: euiTheme.size.m,
		})
	),
	m: css(
		size({
			size: euiTheme.size.xl,
			fontSize: `calc(${euiTheme.size.base} * 0.9)`,
		})
	),
	l: css(
		size({
			size: euiTheme.size.xxl,
			fontSize: `calc(${euiTheme.size.l} * 0.8)`,
		})
	),
	xl: css(
		size({
			size: `calc(${euiTheme.size.base} * 4)`,
			fontSize: `calc(${euiTheme.size.xl} * 0.8)`,
		})
	),
});
export function RoundedIcon(
	props: PropsWithChildren<{
		size?: "s" | "m" | "l" | "xl";
		color?: keyof EuiThemeComputed["colors"];
		iconType: IconType | "remove" | "insert";
	}>
) {
	const euiTheme = useEuiTheme();
	const styles = euiAvatarStyles(euiTheme);
	const size = props.size ?? "m";
	const color = euiTheme.euiTheme.colors[props.color ?? "emptyShade"];

	const style = css`
		background-color: ${color};
	`;

	const icon =
		props.iconType === "remove" ? (
			<EuiIconRemove size={size} />
		) : props.iconType === "insert" ? (
			<EuiIconInsert size={size} />
		) : (
			<EuiIcon size={size} type={props.iconType} />
		);

	return <div css={[styles.euiAvatar, styles[size], style]}>{icon}</div>;
}
