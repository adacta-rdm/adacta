import { EuiIcon, EuiListGroup, EuiListGroupItem, EuiPopover } from "@elastic/eui";
import React, { useState } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRouter } from "../../hooks/useRouter";

import type { RepositoryPicker$key } from "@/relay/RepositoryPicker.graphql";

interface IProps {
	user: RepositoryPicker$key;

	repositoryId: string | undefined;
	// setRepositoryId: (id: string) => void;
}

export function RepositoryPicker(props: IProps) {
	const data = useFragment(
		graphql`
			fragment RepositoryPicker on CurrentUser {
				payload {
					user {
						repositories
					}
				}
			}
		`,
		props.user
	);

	const router = useRouter();
	const [openDropdown, setOpenDropdown] = useState(false);
	const repositories = data.payload.user?.repositories ?? [];

	// const setRepositoryId = props.setRepositoryId;

	// Setup use effect hook which updates the repository (in the dropdown) when a route containing
	// an updated RepositoryId is clicked.
	// Without this the App menu on the top left would stay party disabled (as there is no
	// repository selected) when opening a route directly (i.e. from Welcome screen or after reload)
	// const repositoryId = useRepositoryId();

	// useEffect(() => {
	// 	setRepositoryId(repositoryId);
	// }, [repositoryId, setRepositoryId]);
	//
	const selectedValue = repositories.find((r) => r === props.repositoryId);

	const button = (
		// Header/Repository picker is rendered in dark mode. Regular links (with primary color)
		// don't work well
		// Using a span with onClick handler instead of a link to avoid creating button inside a
		// button (which cause a runtime error)
		<span onClick={() => setOpenDropdown(!openDropdown)} color={"text"}>
			{selectedValue ?? "Select repository"} <EuiIcon type="arrowDown" size="s" />
		</span>
	);

	return (
		<EuiPopover button={button} isOpen={openDropdown} closePopover={() => setOpenDropdown(false)}>
			<EuiListGroup flush={true}>
				{repositories.map((r, i) => (
					<EuiListGroupItem
						key={i}
						onClick={() => {
							// The name of the repository is used as the id on the client side
							const selectedRepositoryId = r;

							setOpenDropdown(false);
							// setRepositoryId(selectedRepositoryId);

							router.router.push("/repositories/:repositoryId/", {
								repositoryId: selectedRepositoryId,
							});

							// const params = Object.keys(router.match.params);
							//
							// console.log("params", params);
							//
							// // When the repositoryId changes, we need to update the view, but only if it depends on the
							// // selected repositoryId.
							// // If not, then it is safe to keep the view as-is.
							// if (!params.includes("repositoryId")) return;
							//
							// const target = router.match.location.pathname.replace(
							// 	router.match.params["repositoryId"],
							// 	selectedRepositoryId
							// );
							//
							// // If the route contains a userId, we can directly navigate to the
							// // user profile
							// if (params.includes("userId")) {
							// 	router.router.push(target);
							// 	return;
							// }
							//
							// // Because we can't be sure that the specific node will be present in the newly selected
							// // repo, we navigate to the "closest" view by taking the first two segments of the route,
							// // e.g.:
							// //   /<repositoryId>/devices/<deviceId> -> <repositoryId>/devices
							// //   /<repositoryId>/resources/<resourceId> -> <repositoryId>/resources
							// router.router.push(target.split("/").slice(0, 3).join("/"));
						}}
						size={"s"}
						label={r}
					/>
				))}
			</EuiListGroup>
		</EuiPopover>
	);
}
