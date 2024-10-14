import assert from "assert";

import { EuiDataGrid } from "@elastic/eui";
import type {
	EuiDataGridColumn,
	EuiDataGridPaginationProps,
} from "@elastic/eui/src/components/datagrid/data_grid_types";
import React, { useState } from "react";
import { graphql, useRefetchableFragment } from "react-relay";

import { DateTime } from "../datetime/DateTime";

import type { ResourceTabularDataTable_data$key } from "@/relay/ResourceTabularDataTable_data.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";

const ResourceTabularDataTableDataGraphQLFragment = graphql`
	fragment ResourceTabularDataTable_data on ResourceTabularData
	@refetchable(queryName: "ResourceTabularDataRefetchQuery")
	@argumentDefinitions(first: { type: "Int" }, after: { type: "String" }) {
		id
		columns {
			label
			type
		}
		rows(first: $first, after: $after) {
			count
			edges {
				node {
					values
				}
			}
			pageInfo {
				cursors {
					first {
						cursor
						pageNumber
					}
					around {
						cursor
						pageNumber
					}
					last {
						cursor
						pageNumber
					}
				}
			}
		}
	}
`;

export function ResourceTabularDataTable(props: { data: ResourceTabularDataTable_data$key }) {
	const [data, refetch] = useRefetchableFragment(
		ResourceTabularDataTableDataGraphQLFragment,
		props.data
	);

	const [pageIndex, setPageIndex] = useState(0);
	const [pageSize, setPageSize] = useState(10);

	const { rows } = data;

	const columns: EuiDataGridColumn[] = data.columns.map(({ label }, i) => ({
		id: `${i}`,
		displayAsText: label,
		display: label,
	}));

	const columnTypes = data.columns.map((c) => c.type);

	const [visibleColumns, setVisibleColumns] = useState(() =>
		columns.slice(0, Math.min(columns.length, 15)).map(({ id }) => id)
	); // initialize to the first 15 columns

	function handleChangeItemsPerPage(size: number) {
		assertDefined(rows);
		const { cursors } = rows.pageInfo;
		assertDefined(cursors);

		// Show the first page when the user changes the number of items per page
		if (size !== pageSize) {
			setPageSize(size);
			setPageIndex(0);
			refetch({
				first: size,
				after: cursors.first.cursor,
			});
			return;
		}
	}

	function handleChangePage(pageNumber: number) {
		assertDefined(rows);
		const { cursors } = rows.pageInfo;
		assertDefined(cursors);

		// Find the cursor that belongs to the requested page index
		for (const cursor of [cursors.first, ...cursors.around, cursors.last]) {
			if (cursor.pageNumber === pageNumber) {
				setPageIndex(pageNumber);
				refetch({
					first: pageSize,
					after: cursor.cursor,
				});
				return;
			}
		}

		assert.fail("DIDN'T FIND THE RIGHT CURSOR :-(");
	}

	const pagination: EuiDataGridPaginationProps = {
		onChangeItemsPerPage: handleChangeItemsPerPage,
		onChangePage: handleChangePage,
		pageIndex,
		pageSize,
		pageSizeOptions: [10, 50, 100],
	};

	if (!rows) return <div>Could not fetch data to display here</div>;
	return (
		<EuiDataGrid
			columns={columns}
			renderCellValue={({ rowIndex, columnId }) => {
				const columnIndex = Number(columnId);

				// Note: renderCellValue is called before GraphQL data is there
				// When the amount of rows increases the following access is invalid
				// (since the new graphql response with enough rows isn't there yet)
				// For this reason we need to temporarily return an empty string.
				const value = rows.edges[rowIndex % pageSize]?.node.values[columnIndex] ?? "";
				const type = columnTypes[columnIndex];

				if (type == "datetime") {
					return <DateTime date={new Date(value)} />;
				}
				return value;
			}}
			columnVisibility={{
				visibleColumns,
				setVisibleColumns,
			}}
			pagination={pagination}
			rowCount={rows.count}
			aria-labelledby={""}
		/>
	);
}
