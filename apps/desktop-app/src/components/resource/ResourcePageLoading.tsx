import { EuiSkeletonText } from "@elastic/eui";
import React from "react";

import { TabbedPageLayout } from "../layout/TabbedPageLayout";

export function ResourcePageLoading() {
	return (
		<TabbedPageLayout
			pageHeader={{
				pageTitle: `Resource`,
				tabs: [
					{
						label: "Overview",
						isSelected: true,
						id: "overview",
						content: (
							<>
								<EuiSkeletonText />
								<br />
								<EuiSkeletonText />
								<br />
								<EuiSkeletonText />
								<br />
								<EuiSkeletonText />
								<br />
								<EuiSkeletonText />
							</>
						),
					},
				],
			}}
		/>
	);
}
