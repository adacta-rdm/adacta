import { EuiFlexGroup, EuiFlexItem, EuiLink } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { AdactaIcon } from "../icons/AdactaIcon";

import type { SampleLink$key } from "@/relay/SampleLink.graphql";

const SampleLinkGraphQLFragment = graphql`
	fragment SampleLink on Sample {
		id
		displayName
	}
`;

interface IProps {
	sample: SampleLink$key;
	prependIcon?: boolean;
	repositoryId?: string;
}

export function SampleLink(props: IProps) {
	const { router, repositoryId } = useRepoRouterHook();
	const sample = useFragment(SampleLinkGraphQLFragment, props.sample);
	return (
		<EuiLink
			onClick={() =>
				router.push("/repositories/:repositoryId/samples/:sampleId", {
					repositoryId,
					sampleId: sample.id,
				})
			}
		>
			<EuiFlexGroup alignItems="center" gutterSize={"xs"}>
				{props.prependIcon && (
					<EuiFlexItem grow={false}>
						<AdactaIcon type={"Sample"} />
					</EuiFlexItem>
				)}
				<EuiFlexItem>{sample.displayName}</EuiFlexItem>
			</EuiFlexGroup>
		</EuiLink>
	);
}
