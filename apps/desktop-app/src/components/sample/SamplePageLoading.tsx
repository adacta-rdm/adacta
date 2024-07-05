import { EuiSkeletonText } from "@elastic/eui";
import React from "react";

import { TabbedPageLayout } from "../layout/TabbedPageLayout";

export function SamplePageLoading() {
	return (
		<TabbedPageLayout
			pageHeader={{
				pageTitle: `Sample`,
				description: <EuiSkeletonText lines={1} />,
				tabs: [
					{
						label: "Data",
						isSelected: true,
						id: "data",
						content: <EuiSkeletonText lines={10} />,
					},
					{
						label: "Activity",
						id: "activity",
						disabled: true,
						content: <></>,
					},
				],
			}}
		/>
	);
}
