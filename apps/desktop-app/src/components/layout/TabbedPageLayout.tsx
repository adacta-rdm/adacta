import type { IconType } from "@elastic/eui";
import { EuiPageTemplate } from "@elastic/eui";
import type { ReactNode } from "react";
import React, { useState } from "react";

import { AdactaPageTemplate } from "./AdactaPageTemplate";

export function TabbedPageLayout(props: {
	pageHeader: {
		iconType?: IconType;
		pageTitle: ReactNode;
		description?: ReactNode;
		tabs: {
			label: ReactNode;
			id: string;
			isSelected?: boolean;
			content: JSX.Element | null;
			disabled?: true;
		}[];
		rightSideItems?: JSX.Element[];
	};
}) {
	const { iconType, pageTitle, description, tabs, rightSideItems } = props.pageHeader;
	const [selectedTabId, setSelectedTabId] = useState<string>(
		tabs.find((t) => t.isSelected)?.id ?? tabs[0].id
	);
	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				iconType={iconType}
				pageTitle={pageTitle}
				description={description}
				rightSideItems={rightSideItems}
				style={{ marginBottom: 0 }}
				tabs={tabs.map((tab) => ({
					label: tab.label,
					id: tab.id,
					isSelected: tab.id === selectedTabId,
					disabled: tab.disabled,
					onClick: () => setSelectedTabId(tab.id),
				}))}
			/>
			<EuiPageTemplate.Section>
				{tabs.find((t) => t.id === selectedTabId)?.content}
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
