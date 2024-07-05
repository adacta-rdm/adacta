import { EuiToken } from "@elastic/eui";
import type { EuiIconType } from "@elastic/eui/src/components/icon/icon";
import type { EuiTokenProps } from "@elastic/eui/src/components/token/token_types";
import React from "react";

export type AdactaIconTypes =
	| "Device"
	| "Project"
	| "Resource"
	| "Sample"
	| "User"
	| "VirtualGroup";
const tokenDefinition: Record<
	AdactaIconTypes,
	{ icon: EuiIconType; color: EuiTokenProps["color"] }
> = {
	Device: {
		icon: "tokenStruct",
		color: "euiColorVis0",
	},
	Project: {
		icon: "folderOpen",
		color: "euiColorVis7",
	},
	Resource: {
		icon: "tokenTokenCount",
		color: "euiColorVis4",
	},
	Sample: {
		icon: "tokenPercolator",
		color: "euiColorVis6",
	},
	User: {
		icon: "user",
		color: "gray",
	},
	VirtualGroup: {
		color: "gray",
		icon: "nested",
	},
};

type TAdactaIconProps = Omit<EuiTokenProps, "iconType"> & { type: AdactaIconTypes };

export function AdactaIcon(props: TAdactaIconProps) {
	const childProps = {
		...props,
		iconType: tokenDefinition[props.type].icon,
		color: tokenDefinition[props.type].color,
		shape: "square" as const,
	};
	return <EuiToken {...childProps} />;
}

export function AdactaIconOrEuiToken(props: EuiTokenProps) {
	const { iconType } = props;
	if (
		iconType === "Device" ||
		iconType == "Project" ||
		iconType == "Resource" ||
		iconType == "Sample" ||
		iconType == "User"
	) {
		return <AdactaIcon type={iconType} {...props} />;
	} else {
		return <EuiToken {...props} iconType={iconType} />;
	}
}
