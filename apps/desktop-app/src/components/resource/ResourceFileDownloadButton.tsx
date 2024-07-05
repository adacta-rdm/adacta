import assert from "assert";

import React from "react";
import { graphql, useRelayEnvironment } from "react-relay";

import { useRepositoryId } from "../../services/router/UseRepoId";
import { fetchQueryWrapper } from "../../utils/fetchQueryWrapper";
import { ButtonWithProgress } from "../utils/ButtonWithProgress";

import type { ResourceFileDownloadButtonLinkQuery } from "@/relay/ResourceFileDownloadButtonLinkQuery.graphql";

/**
 * Renders a button which allows the user to open or export a file.
 */
export function ResourceFileDownloadButton(props: {
	fileName: string;

	/**
	 * The ID of the resource to open or export.
	 * NOTE: This must be a ResourceGeneric (since there's no 1-click way to open/download a
	 * ResourceTabularData). For ResourceTabularData we usually just pass in the ID of the parent.
	 */
	resourceId: string;
	renderAsLink?: boolean;
}) {
	const env = useRelayEnvironment();
	const repositoryId = useRepositoryId();

	const onClick = async () => {
		// Fetch download URL on demand
		const downloadLinkResponse = await fetchQueryWrapper<ResourceFileDownloadButtonLinkQuery>(
			env,
			graphql`
				query ResourceFileDownloadButtonLinkQuery($repositoryId: ID!, $resourceId: ID!) {
					repository(id: $repositoryId) {
						resource(id: $resourceId) {
							... on ResourceGeneric {
								downloadURL
							}
						}
					}
				}
			`,
			{ repositoryId, resourceId: props.resourceId }
		);

		const downloadURL = downloadLinkResponse.repository?.resource?.downloadURL;

		// Can only be undefined in case an invalid resource ID was passed in (which would be a bug).
		assert(downloadURL, "Resource must have a download URL");

		const a = document.createElement("a");
		a.href = downloadURL;
		a.style.display = "none";

		// Indicate that the link should be opened in a new tab. This new tab will be closed
		// immediately since it only contains a download. This is still necessary to prevent FF from
		// closing/re-opening the tab as a result of the navigation event
		a.target = "_blank";

		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
	};

	return (
		<ButtonWithProgress
			progress={undefined}
			onClick={() => void onClick()}
			size={"s"}
			renderAsLink={props.renderAsLink}
		>
			Download
		</ButtonWithProgress>
	);
}
