import { EuiDataGrid, EuiSkeletonText } from "@elastic/eui";
import React from "react";

export function ResourceTabularDataTableLoading() {
	return (
		<EuiDataGrid
			columns={[{ id: "1", display: <EuiSkeletonText lines={1} /> }]}
			renderCellValue={() => <EuiSkeletonText lines={1} />}
			columnVisibility={{
				visibleColumns: ["1"],
				setVisibleColumns: () => {},
			}}
			rowCount={10}
			aria-labelledby={""}
		/>
	);
}
