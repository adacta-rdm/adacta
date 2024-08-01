import {
	EuiDescriptionList,
	EuiDescriptionListDescription,
	EuiDescriptionListTitle,
	EuiEmptyPrompt,
	EuiFlexGroup,
	EuiIcon,
	EuiPageSection,
} from "@elastic/eui";
import React from "react";

/**
 * Component that is displayed when the search query returns no results.
 * Contains suggestions on how to adjust the search query.
 
 * @param props.dateSearchIncluded - if the search query included a date filter
 * @constructor
 */
export function SearchEmptyPrompt() {
	return (
		<EuiPageSection>
			<EuiEmptyPrompt
				body={
					<EuiDescriptionList compressed>
						<EuiDescriptionListTitle>Adjust your query</EuiDescriptionListTitle>
						<EuiDescriptionListDescription>
							Try searching for a different combination of terms and filters.
						</EuiDescriptionListDescription>
					</EuiDescriptionList>
				}
				color="plain"
				layout="horizontal"
				title={<h2>No results match your search criteria</h2>}
				titleSize="m"
				icon={
					<EuiFlexGroup justifyContent={"spaceAround"} gutterSize={"none"}>
						<EuiIcon type={"searchProfilerApp"} style={{ width: "70%", height: "70%" }} />
					</EuiFlexGroup>
				}
			/>
		</EuiPageSection>
	);
}
