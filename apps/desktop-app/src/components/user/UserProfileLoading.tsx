import {
	EuiFlexGroup,
	EuiFlexItem,
	EuiSkeletonText,
	EuiPageTemplate,
	EuiPanel,
	EuiStat,
} from "@elastic/eui";
import React from "react";

import { AdactaPageTemplate } from "../layout/AdactaPageTemplate";

export function UserProfileLoading() {
	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={<EuiSkeletonText lines={2} />}
				description={<EuiSkeletonText lines={1} />}
			/>
			<EuiPageTemplate.Section>
				<EuiFlexGroup>
					<EuiFlexItem>
						<EuiPanel>
							<EuiStat
								title=""
								description="Created devices"
								textAlign="right"
								titleColor="secondary"
								isLoading={true}
							/>
						</EuiPanel>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiPanel>
							<EuiStat
								title=""
								description="Created resources"
								textAlign="right"
								titleColor="primary"
								isLoading={true}
							/>
						</EuiPanel>
					</EuiFlexItem>
					<EuiFlexItem>
						<EuiPanel>
							<EuiStat
								title=""
								description="Created samples"
								textAlign="right"
								titleColor="accent"
								isLoading={true}
							/>
						</EuiPanel>
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
