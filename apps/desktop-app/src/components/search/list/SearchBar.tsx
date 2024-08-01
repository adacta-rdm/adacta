import {
	EuiBadge,
	EuiButtonEmpty,
	EuiTextTruncate,
	EuiTextColor,
	EuiFieldSearch,
	EuiFilterGroup,
	EuiFlexGroup,
	EuiFlexItem,
	EuiIcon,
} from "@elastic/eui";
import { useDebounceCallback } from "@react-hook/debounce";
import React, { useState } from "react";
import { useLazyLoadQuery } from "react-relay";
import { graphql } from "react-relay";

import { DateSearchFilter } from "../../search/list/DateSearchFilter";

import type { SearchBarQuery } from "@/relay/SearchBarQuery.graphql";
import { isIStoredFilters } from "@/tsrc/apps/desktop-app/src/interfaces/IStoredFilters";
import { AdactaIcon } from "~/apps/desktop-app/src/components/icons/AdactaIcon";
import type { IFilterItem } from "~/apps/desktop-app/src/components/search/list/SearchFilter";
import { extractSelectedIds } from "~/apps/desktop-app/src/components/search/list/SearchFilter";
import { SearchFilter } from "~/apps/desktop-app/src/components/search/list/SearchFilter";
import { useSearchBarContext } from "~/apps/desktop-app/src/components/search/list/useSearchBarContext";
import type { IStoredFilters } from "~/apps/desktop-app/src/interfaces/IStoredFilters";
import type { InputMaybe, Scalars } from "~/apps/repo-server/src/graphql/generated/resolvers";

const SearchBarGraphQLQuery = graphql`
	query SearchBarQuery {
		projects {
			edges {
				node {
					id
					name
				}
			}
		}
		users {
			id
			name
		}
		currentUser {
			payload {
				user {
					id
					name
				}
			}
		}
	}
`;

interface ISearchBar {
	freeTextSearch?: boolean;
	filterFields: Array<"Date" | "Creator" | "Project">;
	preservationId?: PreservationId;
	/**
	 * Context that provides the refetch function, which is used when the selected filters change.
	 * The selected filters are preserved inside the context for other components,
	 * that might need to refetch with additional arguments.
	 *
	 * @param filter - Input object containing all available filters. Specific context implementations can choose which filters to use.
	 */
	searchBarContext: SearchBarContext;
}

export type SearchBarContext = React.Context<{
	refetch?: (newVars: {
		filter?: Partial<{
			projectIds: InputMaybe<ReadonlyArray<string>>;
			userIds: InputMaybe<ReadonlyArray<string>>;
			searchValue?: InputMaybe<Scalars["String"]>;
			startDate?: InputMaybe<Scalars["String"]>;
			endDate?: InputMaybe<Scalars["String"]>;
		}> | null;
	}) => void;
}>;

export interface ISearchProps {
	projectIds: string[];
	userIds: string[];
	searchValue: string | undefined;
	startDate: string | undefined;
	endDate: string | undefined;
}

/**
 * Search component for the resource list. Contains search bar and filters for projects, users and time of recording.
 * The selected filters are passed to the parent component to be used for refetching the resource list.
 * If a preservationId is passed to the component, the user navigates away from the page, the selected filters are stored in local storage and restored when the user returns.
 *
 * For the first time user experience, the current user is always selected as a creator. The actual fetching of the current user is done in the parent component.
 * @param props
 * @constructor
 */
export function SearchBar(props: ISearchBar) {
	const data = useLazyLoadQuery<SearchBarQuery>(SearchBarGraphQLQuery, {});
	const refetch = useSearchBarContext(props.searchBarContext);
	const [storedFilters] = useState(getStoredSelectedSearchItems(props.preservationId)); // Get stored filters from local storage

	// search value state for UI
	const [searchValue, innerSetSearchValue] = useState<string>(storedFilters?.searchValue ?? "");
	// debounced search value to avoid unnecessary refetches
	const [searchValueDebounced, _setSearchValueDebounced] = useState<string>(
		storedFilters?.searchValue ?? ""
	);
	const setSearchValueDebounced = (e: string) => {
		_setSearchValueDebounced(e);
		refetch({
			filter: {
				searchValue: e.trim().length === 0 ? undefined : e,
			},
		});
	};
	const onChangeSearchValueDebounced = useDebounceCallback(setSearchValueDebounced, 300);
	const setSearchValue = (e: string) => {
		innerSetSearchValue(e);
		onChangeSearchValueDebounced(e);
	};

	const [startDate, _setStartDate] = useState<Date | undefined>(
		storedFilters?.startDate ? new Date(storedFilters.startDate) : undefined
	);
	const setStartDate = (date: Date | undefined) => {
		_setStartDate(date);
		refetch({
			filter: {
				startDate: startDate?.toISOString(),
			},
		});
	};

	const [endDate, _setEndDate] = useState<Date | undefined>(
		storedFilters?.endDate ? new Date(storedFilters.endDate) : undefined
	);
	const setEndDate = (date: Date | undefined) => {
		_setEndDate(date);
		refetch({
			filter: {
				endDate: endDate?.toISOString(),
			},
		});
	};

	const [creators, _setCreators] = useState<IFilterItem[]>(sortCreators);
	const setCreators = (newCreators: IFilterItem[]) => {
		_setCreators(newCreators);
		refetch({
			filter: {
				userIds: extractSelectedIds(newCreators),
			},
		});
	};

	const [projects, _setProjects] = useState<IFilterItem[]>(
		data.projects.edges.map(({ node }) => ({
			label: node.name,
			itemID: node.id,
			checked: storedFilters?.projectIds.find((projectId) => projectId === node.id) !== undefined,
		}))
	);
	const setProjects = (newProjects: IFilterItem[]) => {
		_setProjects(newProjects);
		refetch({
			filter: {
				projectIds: extractSelectedIds(newProjects),
			},
		});
	};

	/**
	 * Sorts the creators so that the current user is always on top.
	 */
	function sortCreators(): IFilterItem[] {
		const creatorsArray: IFilterItem[] = [
			{
				label: data.currentUser.payload.user.name,
				itemID: data.currentUser.payload.user.id,
				checked:
					(storedFilters === undefined && props.preservationId !== undefined) || // If the local storage is empty, the current user is always selected (First time user experience)
					storedFilters?.userIds.find((userId) => userId === data.currentUser.payload.user.id) !==
						undefined,
				prepend: <EuiIcon type={"user"} color={"subdued"} />,
			},
		];
		for (const user of data.users) {
			if (user.id === data.currentUser.payload.user.id) continue;
			creatorsArray.push({
				label: user.name,
				itemID: user.id,
				checked: storedFilters?.userIds.find((userId) => userId === user.id) !== undefined,
			});
		}
		return creatorsArray;
	}

	function resetFilters() {
		innerSetSearchValue("");
		_setSearchValueDebounced("");
		_setStartDate(undefined);
		_setEndDate(undefined);
		_setProjects(projects.map((project) => ({ ...project, checked: false })));
		_setCreators(creators.map((creator) => ({ ...creator, checked: false })));
		refetch({
			filter: {
				projectIds: [],
				userIds: [],
				searchValue: undefined,
				startDate: undefined,
				endDate: undefined,
			},
		});
	}

	function generateBadges(
		filterFields: Array<"Date" | "Creator" | "Project">,
		filterItems: {
			projects: IFilterItem[];
			creators: IFilterItem[];
			startDate: Date | undefined;
			endDate: Date | undefined;
		},
		freeTextSearch?: boolean | undefined,
		preservationId?: PreservationId
	): Array<React.ReactNode> {
		const selectedItems: Array<React.ReactNode> = [];
		const projectsToStore: IFilterItem[] = [];
		const creatorsToStore: IFilterItem[] = [];

		if (freeTextSearch && searchValue?.trim().length > 0) {
			selectedItems.push(
				<FilterBadge
					key={"freeTextSearch"}
					item={{
						label: `Name: ${searchValue}`,
						itemID: "",
						checked: false,
					}}
					icon={<EuiIcon type={"search"} size={"s"} />}
					removeFunction={() => setSearchValue("")}
				/>
			);
		}

		for (const field of filterFields) {
			if (field === "Creator") {
				filterItems.creators.forEach((user, idx) => {
					if (user.checked) {
						selectedItems.push(
							<FilterBadge
								key={`${field}-${idx}`}
								item={user}
								icon={<AdactaIcon type={"User"} />}
								removeFunction={() => {
									const newCreators = [...filterItems.creators];
									newCreators[idx].checked = false;
									setCreators(newCreators);
								}}
							/>
						);
						creatorsToStore.push(user);
					}
				});
			} else if (field.includes("Project")) {
				filterItems.projects.forEach((project, idx) => {
					if (project.checked) {
						selectedItems.push(
							<FilterBadge
								key={`${field}-${idx}`}
								item={project}
								icon={<AdactaIcon type={"Project"} />}
								removeFunction={() => {
									const newProjects = [...filterItems.projects];
									newProjects[idx].checked = false;
									setProjects(newProjects);
								}}
							/>
						);
						projectsToStore.push(project);
					}
				});
			} else if (field === "Date") {
				if (filterItems.startDate !== undefined || filterItems.endDate !== undefined) {
					selectedItems.push(
						<FilterBadge
							key={"date"}
							item={{
								label: `${filterItems.startDate?.toLocaleDateString() ?? "-∞"} – ${
									filterItems.endDate?.toLocaleDateString() ?? "∞"
								}`,
								itemID: "",
								checked: false,
							}}
							icon={<EuiIcon type={"calendar"} size={"s"} />}
							removeFunction={() => {
								setStartDate(undefined);
								setEndDate(undefined);
							}}
							disableTruncation={true}
						/>
					);
				}
			}
		}

		// If no filters are selected, add an invisible spacer badge to keep the layout consistent
		if (selectedItems.length === 0) {
			selectedItems.push(<EuiBadge key={"spacer badge"} color={"#ffffff"} isDisabled={false} />);
		}

		/**
		 * Store selected items in local storage to preserve them when the user navigates away from the page.
		 * This is done here, to avoid unnecessary iterations over the selected items.
		 */
		storeSelectedSearchItems(
			projectsToStore,
			creatorsToStore,
			searchValueDebounced,
			filterItems.startDate,
			filterItems.endDate,
			preservationId
		);
		return selectedItems;
	}

	return (
		<EuiFlexGroup gutterSize={"s"} direction={"column"}>
			<EuiFlexGroup direction={"row"}>
				{props.freeTextSearch && (
					<EuiFieldSearch
						aria-label={"Search"}
						compressed={true}
						onChange={(e) => setSearchValue(e.target.value)}
						placeholder={"Search for name"}
						value={searchValue}
					/>
				)}
				<EuiFlexGroup gutterSize={"s"}>
					<EuiFlexItem grow={false}>
						<EuiFilterGroup compressed={true}>
							{props.filterFields.map((field, idx) => {
								switch (field) {
									case "Date":
										return (
											<DateSearchFilter
												key={`dateFilter${idx}`}
												startDate={startDate}
												setStartDate={setStartDate}
												endDate={endDate}
												setEndDate={setEndDate}
												customLabel={"Time of recording"}
											/>
										);
									case "Project":
										return (
											<SearchFilter
												key={`projectFilter${idx}`}
												label={"Projects"}
												items={projects}
												setItems={setProjects}
												showClearButton={true}
											/>
										);
									case "Creator":
										return (
											<SearchFilter
												key={`creatorFilter${idx}`}
												label={"Creators"}
												items={creators}
												setItems={setCreators}
												showClearButton={true}
											/>
										);
								}
							})}
						</EuiFilterGroup>
					</EuiFlexItem>
					<EuiButtonEmpty size={"s"} onClick={() => resetFilters()}>
						Clear
					</EuiButtonEmpty>
				</EuiFlexGroup>
			</EuiFlexGroup>
			<EuiFlexGroup gutterSize={"xs"} wrap>
				{generateBadges(
					props.filterFields,
					{ projects, creators, startDate, endDate },
					props.freeTextSearch,
					props.preservationId
				)}
			</EuiFlexGroup>
		</EuiFlexGroup>
	);
}

interface IFilterBadge {
	icon: React.ReactNode;
	item: IFilterItem;
	removeFunction: () => void;
	disableTruncation?: boolean;
}

function FilterBadge({ icon, item, removeFunction, disableTruncation }: IFilterBadge) {
	return (
		//Wrap in EuiFlexItem to prevent automatic generation of margin-left by EuiBadge
		<EuiFlexItem grow={false}>
			<EuiBadge color={"hollow"}>
				<EuiFlexGroup gutterSize={"xs"} alignItems={"center"}>
					{icon}
					<EuiTextColor color={"subdued"}>
						{disableTruncation ? item.label : <EuiTextTruncate text={item.label} width={100} />}
					</EuiTextColor>
					<EuiIcon
						type={"cross"}
						onClick={removeFunction}
						style={{ cursor: "pointer" }}
						size={"s"}
					/>
				</EuiFlexGroup>
			</EuiBadge>
		</EuiFlexItem>
	);
}

// Available preservation IDs. Extend this type if you want to use the search bar in a different context.
export type PreservationId = "resourcesList" | "sampleList" | "deviceList";

function storeSelectedSearchItems(
	selectedProjects: Array<IFilterItem>,
	selectedUsers: Array<IFilterItem>,
	searchValue: string,
	startDate?: Date,
	endDate?: Date,
	preservationId?: PreservationId
) {
	if (!preservationId) return;
	const filtersToStore: IStoredFilters = {
		searchValue: searchValue.trim(),
		projectIds: selectedProjects.map((project) => project.itemID),
		userIds: selectedUsers.map((user) => user.itemID),
		endDate: endDate?.toISOString(),
		startDate: startDate?.toISOString(),
	};
	localStorage.setItem(`searchFilters-${preservationId}`, JSON.stringify(filtersToStore));
}

export function getStoredSelectedSearchItems(
	preservationId?: PreservationId
): undefined | IStoredFilters {
	if (!preservationId) return;
	const storedFiltersString = localStorage.getItem(`searchFilters-${preservationId}`);
	if (storedFiltersString) {
		try {
			//JSON.parse can throw an error if the stored string is not a valid JSON
			const unverifiedStoredFilters: unknown = JSON.parse(storedFiltersString);
			if (isIStoredFilters(unverifiedStoredFilters)) return unverifiedStoredFilters;
		} catch (e) {
			return undefined;
		}
		return undefined;
	}
}
