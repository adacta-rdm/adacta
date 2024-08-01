import {
	EuiButton,
	EuiFilterButton,
	EuiFlexGroup,
	EuiPopover,
	EuiPopoverTitle,
	EuiSelectable,
	EuiSpacer,
} from "@elastic/eui";
import React, { useState } from "react";

export interface ISearchFilter {
	label: string;
	items: IFilterItem[];
	setItems: (newItems: IFilterItem[]) => void;
	showClearButton?: boolean;
}

export interface IFilterItem {
	label: string;
	checked: boolean;
	itemID: string;
	prepend?: React.ReactNode;
}

export function SearchFilter({ items, label, setItems, showClearButton }: ISearchFilter) {
	const [isPopoverOpen, setIsPopoverOpen] = useState(false);

	const button = (
		<EuiFilterButton
			iconType="arrowDown"
			badgeColor="success"
			onClick={() => setIsPopoverOpen(!isPopoverOpen)}
			isSelected={isPopoverOpen}
			hasActiveFilters={!!items.find((item) => item.checked)}
			numActiveFilters={extractSelectedIds(items).length}
		>
			{label}
		</EuiFilterButton>
	);

	return (
		<EuiPopover button={button} isOpen={isPopoverOpen} closePopover={() => setIsPopoverOpen(false)}>
			<EuiSelectable
				searchable
				searchProps={{
					placeholder: "Search",
					compressed: true,
				}}
				aria-label="Projects selectable"
				options={items.map((item) => ({ ...item, checked: item.checked ? "on" : undefined }))} // EuiSelectable expects "on" for checked items instead of true
				onChange={(newOptions) => {
					setItems(
						newOptions.map((newOption) => {
							return { ...newOption, checked: newOption.checked === "on" }; // EuiSelectable returns "on" for checked items instead of true
						})
					);
				}}
				isLoading={false}
				loadingMessage={`Loading ${label.toLowerCase()}`}
				emptyMessage="No filters available"
				noMatchesMessage="No filters found"
			>
				{(list, search) => (
					<div style={{ width: 300 }}>
						<EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>
						{list}
					</div>
				)}
			</EuiSelectable>
			{showClearButton && (
				<>
					<EuiSpacer size={"s"} />
					<EuiFlexGroup justifyContent={"flexEnd"}>
						<EuiButton
							size={"s"}
							onClick={() => setItems(items.map((item) => ({ ...item, checked: false })))}
						>
							Clear
						</EuiButton>
					</EuiFlexGroup>
				</>
			)}
		</EuiPopover>
	);
}

export function extractSelectedIds(items: IFilterItem[]): string[] {
	return items.filter((item) => item.checked).map((item) => item.itemID);
}
