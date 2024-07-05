import { EuiSkeletonText, EuiPageTemplate, EuiSpacer } from "@elastic/eui";
import type { ReactNode } from "react";
import React from "react";

import { AdactaPageTemplate } from "./AdactaPageTemplate";

export function ListPageLoading({ pageTitle }: { pageTitle: string | ReactNode }) {
	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header pageTitle={pageTitle} />
			<EuiPageTemplate.Section>
				<EuiSkeletonText lines={4} />
				<EuiSpacer />
				<EuiSkeletonText lines={4} />
				<EuiSpacer />
				<EuiSkeletonText lines={4} />
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
