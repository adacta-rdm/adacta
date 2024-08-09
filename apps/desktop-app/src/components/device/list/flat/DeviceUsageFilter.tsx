import { EuiButtonGroup, EuiFlexItem } from "@elastic/eui";
import React, { useState } from "react";

import { DeviceListPageContext } from "~/apps/desktop-app/src/components/device/list/flat/DeviceListPage";
import { filterStringToFilter } from "~/apps/desktop-app/src/components/device/list/flat/DeviceTable";
import { useSearchBarContext } from "~/apps/desktop-app/src/components/search/list/useSearchBarContext";

export type DeviceFilterOptions = "all" | "root" | "unused";

export function DeviceUsageFilter() {
	const [filter, setFilter] = useState<"all" | "root" | "unused">("all");
	const refetch = useSearchBarContext(DeviceListPageContext);

	return (
		<>
			<EuiFlexItem grow={false}>
				<EuiButtonGroup
					legend={"Select Devices Filter"}
					name={"Name"}
					idSelected={filter}
					onChange={(optionId) => {
						const [filterGraphQL, filterId] = filterStringToFilter(optionId);
						setFilter(filterId);
						refetch({ usage: filterGraphQL });
					}}
					options={[
						{
							id: "all",
							label: "All",
						},
						{
							id: "root",
							label: "Roots only",
						},
						{
							id: "unused",
							label: "Currently unused",
						},
					]}
				/>
			</EuiFlexItem>
		</>
	);
}
