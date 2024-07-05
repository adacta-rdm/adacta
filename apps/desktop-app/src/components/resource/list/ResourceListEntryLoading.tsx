import { EuiLoadingSpinner, EuiTableRow, EuiTableRowCell } from "@elastic/eui";
import React from "react";

import { columnCount } from "./ResourceListTable";

export function ResourceListEntryLoading() {
	return (
		<EuiTableRow>
			<EuiTableRowCell colSpan={columnCount} align={"center"}>
				<EuiLoadingSpinner size={"s"} />
			</EuiTableRowCell>
		</EuiTableRow>
	);
}
