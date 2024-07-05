import type { PropsWithChildren } from "react";
import React from "react";

export function PaddingHelper(props: PropsWithChildren<{ level: number; pxOverwrite?: number }>) {
	return (
		<div style={{ paddingLeft: props.level * (props?.pxOverwrite ?? 20) }}>{props.children}</div>
	);
}
