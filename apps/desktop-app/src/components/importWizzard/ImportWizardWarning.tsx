import { EuiCallOut, EuiLink, EuiSpacer } from "@elastic/eui";
import React from "react";

const collapseCount = 3;

export function ImportWizardWarning(props: { warnings: string[] | undefined }) {
	const [collapsed, setCollapsed] = React.useState(true);
	const { warnings } = props;
	if (!warnings || warnings.length === 0) return null;

	const showMoreCount = warnings.length - collapseCount;

	return (
		<>
			<EuiCallOut title="Warning" color="warning" iconType="help">
				{warnings.slice(0, collapsed ? collapseCount : warnings.length).map((w, i) => (
					<p key={`${w}${i}`}>{w}</p>
				))}
				{showMoreCount > 0 && (
					<EuiLink onClick={() => setCollapsed(!collapsed)} color={"subdued"}>
						{collapsed
							? `Show ${showMoreCount} more warnings`
							: `Hide all but ${collapseCount} warnings`}
					</EuiLink>
				)}
			</EuiCallOut>
			<EuiSpacer />
		</>
	);
}
