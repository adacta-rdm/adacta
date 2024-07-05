import {
	EuiEmptyPrompt,
	EuiFieldSearch,
	EuiHeaderSectionItemButton,
	EuiIcon,
	EuiPopover,
	EuiSpacer,
	EuiToolTip,
} from "@elastic/eui";
import { debounce } from "lodash-es";
import React, { Suspense, useMemo, useState } from "react";
import { graphql, useLazyLoadQuery } from "react-relay";
import type { ArrayElement } from "type-fest/source/internal";

import { SearchLoading } from "./SearchLoading";
import { SearchResultsDevices } from "./SearchResultsDevices";
import { SearchResultsProjects } from "./SearchResultsProjects";
import { SearchResultsResources } from "./SearchResultsResources";
import { SearchResultsSamples } from "./SearchResultsSamples";

import type { SearchResultQuery } from "@/relay/SearchResultQuery.graphql";
import { createIDatetime } from "~/lib/createDate";

const SearchResultGraphQLQuery = graphql`
	query SearchResultQuery($query: String!, $queryTime: DateTime!) {
		search {
			search(query: $query, queryTime: $queryTime, first: 15) {
				repositoryId
				node {
					...SearchResultsResources
					...SearchResultsSamples
					...SearchResultsDevices
					...SearchResultsProjects
				}
			}
		}
	}
`;

const GLOBAL_SEARCH_BAR_ID = "globalSearchBarId";

export function Search(props: {
	/**
	 * Inline mode where the search bar is not part of a popover (i.e. on the welcome screen)
	 */
	inline?: boolean;
}) {
	// State used for input
	const [query, _setQuery] = useState("");
	// State used to execute the GraphQL-Query by rendering SearchResultsWrapper (debounced)
	const [queryInternal, _setQueryInternal] = useState(query);

	// Create debounced version of state updater for the internal query state
	const _setQueryInternalDebounced = useMemo(
		() => debounce(_setQueryInternal, 500),
		[_setQueryInternal]
	);

	// This state updater manages updates to both query states.
	// The input state receives an immediate update, whereas the internal query state is refreshed
	// after a short delay.
	function setQuery(query: string) {
		_setQuery(query);
		_setQueryInternalDebounced(query);
	}

	const [isOpen, setIsOpen] = useState(false);
	const queryDate = useMemo(() => new Date(), [queryInternal]);

	const emptyQuery = !props.inline ? (
		<EuiEmptyPrompt iconType="search" body={<p>Find anything</p>} />
	) : null;

	// If query and queryInternal are different then the newly entered query string was not yet
	// used for a new search request. This means that the search results are not up-to-date and the
	// loading indicator should be shown.
	const isPendingDebounce = query !== queryInternal;

	const core = (
		<div style={!props.inline ? { width: "600px" } : undefined}>
			<EuiFieldSearch
				id={GLOBAL_SEARCH_BAR_ID}
				placeholder="Search"
				fullWidth={true}
				value={query}
				onChange={({ target: { value } }) => setQuery(value)}
			/>
			<EuiSpacer />
			{isPendingDebounce ? (
				<SearchLoading />
			) : (
				<Suspense fallback={<SearchLoading />}>
					{queryInternal.length > 0 ? (
						<SearchResultsWrapper
							query={queryInternal}
							queryTime={queryDate}
							close={() => setIsOpen(false)}
						/>
					) : (
						emptyQuery
					)}
				</Suspense>
			)}
		</div>
	);

	if (props.inline) {
		return core;
	}

	return (
		<EuiPopover
			initialFocus={`#${GLOBAL_SEARCH_BAR_ID}`}
			isOpen={isOpen}
			closePopover={() => setIsOpen(false)}
			button={
				<EuiHeaderSectionItemButton onClick={() => setIsOpen(!isOpen)}>
					<EuiToolTip content={"Search"}>
						<EuiIcon type="search" size="m" />
					</EuiToolTip>
				</EuiHeaderSectionItemButton>
			}
		>
			{core}
		</EuiPopover>
	);
}

function SearchResultsWrapper(props: { query: string; queryTime: Date; close: () => void }) {
	const { query, queryTime } = props;
	const data = useLazyLoadQuery<SearchResultQuery>(SearchResultGraphQLQuery, {
		query,
		queryTime: createIDatetime(queryTime),
	});

	const renderReposSpecific = (s: ArrayElement<typeof data.search.search>) => {
		if (s.repositoryId == null) {
			return null;
		}
		const resultProps = {
			searchResults: s.node,
			close: props.close,
			repositoryId: s.repositoryId,
		};

		return (
			<>
				<SearchResultsResources {...resultProps} />
				<SearchResultsSamples {...resultProps} />
				<SearchResultsDevices {...resultProps} />
				<SearchResultsProjects {...resultProps} />
			</>
		);
	};

	return data.search.search.map((s) => {
		return renderReposSpecific(s);
	});
}
