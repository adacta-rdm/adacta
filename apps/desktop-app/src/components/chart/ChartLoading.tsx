import { EuiFlexGroup, EuiFlexItem, EuiLoadingChart, EuiPanel, EuiTextAlign } from "@elastic/eui";
import React from "react";

export function ChartLoading() {
	return (
		<EuiPanel hasShadow={false}>
			<EuiFlexGroup alignItems="center" style={{ height: 500 }}>
				<EuiFlexItem>
					<EuiTextAlign textAlign="center">
						<EuiLoadingChart size="xl" />
					</EuiTextAlign>
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiPanel>
	);
}
