import { EuiLoadingSpinner, EuiTextAlign } from "@elastic/eui";
import React from "react";

export function DevicePopoverLoading() {
	return (
		<EuiTextAlign textAlign="center">
			<EuiLoadingSpinner size="l" />
		</EuiTextAlign>
	);
}
