import {
	EuiFlexGroup,
	EuiFlexItem,
	EuiSkeletonText,
	EuiLoadingSpinner,
	EuiPanel,
	EuiSpacer,
} from "@elastic/eui";
import React from "react";

import { TabbedPageLayout } from "../layout/TabbedPageLayout";

export function DevicePageLoading() {
	return (
		<TabbedPageLayout
			pageHeader={{
				pageTitle: `Device`,
				description: <EuiSkeletonText lines={1} />,
				rightSideItems: [<EuiLoadingSpinner key="image" size="xl" />],
				tabs: [
					{
						id: "properties",
						label: "Components",
						content: (
							<>
								<EuiSkeletonText lines={10} />
								<EuiSpacer />
								<EuiPanel hasShadow={false}>
									<EuiFlexGroup
										alignItems="center"
										justifyContent="center"
										style={{ height: "300px" }}
									>
										<EuiFlexItem grow={false}>
											<EuiLoadingSpinner size="xl" />
										</EuiFlexItem>
									</EuiFlexGroup>
								</EuiPanel>
							</>
						),
					},
					{
						id: "specifications",
						label: "Specifications",
						content: <></>,
						disabled: true,
					},
					{
						id: "samples",
						label: "Samples",
						content: <></>,
						disabled: true,
					},
					{
						id: "resources",
						label: "Resources",
						content: <></>,
						disabled: true,
					},
					{
						id: "activity",
						label: "History",
						content: <></>,
						disabled: true,
					},
				],
			}}
		/>
	);
}
