import { EuiIcon, EuiToolTip } from "@elastic/eui";
import React from "react";
import { useFragment } from "react-relay/hooks";
import { graphql } from "relay-runtime";

import type { OriginRepoIndicator$key } from "@/relay/OriginRepoIndicator.graphql";

interface IProps {
	metadata: OriginRepoIndicator$key;
	size?: "small" | "regular";
}

export function OriginRepoIndicator(props: IProps) {
	const size = props.size ?? "regular";

	const data = useFragment(
		graphql`
			fragment OriginRepoIndicator on HasMetadata {
				metadata {
					origin {
						remoteRepo {
							id
						}
					}
				}
			}
		`,
		props.metadata
	);

	const repoName = data.metadata.origin?.remoteRepo?.id;
	// const accessPermissions = data.metadata.origin?.remoteRepo?.accessPermissions;
	//
	// const permissions =
	// 	accessPermissions === "READ" ? (
	// 		<EuiToolTip content={`You can only view this item`}>
	// 			<EuiIcon type={"lock"} />
	// 		</EuiToolTip>
	// 	) : accessPermissions === "READ_WRITE" ? (
	// 		<EuiToolTip content={`You can view and edit this item`}>
	// 			<EuiIcon type={"lockOpen"} />
	// 		</EuiToolTip>
	// 	) : (
	// 		""
	// 	);

	if (repoName && size === "small") {
		return (
			<>
				<EuiIcon type={"globe"} />
				{repoName}
			</>
		);
	}

	if (repoName) {
		return (
			<>
				<EuiToolTip content={`Stored on ${repoName}`}>
					<EuiIcon type={"globe"} />
				</EuiToolTip>
				{/*{permissions}*/}
			</>
		);
	}
	return null;
}
