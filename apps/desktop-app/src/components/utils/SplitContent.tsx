import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from "@elastic/eui";
import type { ReactElement, ReactNode } from "react";
import React from "react";

/**
 * Utility component that renders two lists of elements side by side.
 * Main benefit is that this component allows you to specify the elements column-wise while still
 * rendering them row-wise which causes the elements to be aligned properly.
 */
export function SplitContent(props: { left: ReactNode[]; right: ReactNode[] }): ReactElement {
	const c = Math.max(props.right.length, props.left.length);
	const rows: ReactElement[] = [];
	for (let i = 0; i < c; i++) {
		rows.push(<Row left={props.left[i]} right={props.right[i]} />);
	}

	return <>{rows}</>;
}

function Row(props: { left: ReactNode; right: ReactNode }): ReactElement {
	return (
		<EuiFlexGroup>
			<EuiFlexItem grow={6}>
				{props.left}
				<EuiSpacer size={"m"} />
			</EuiFlexItem>
			<EuiFlexItem grow={6}>
				{props.right}
				<EuiSpacer size={"m"} />
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
