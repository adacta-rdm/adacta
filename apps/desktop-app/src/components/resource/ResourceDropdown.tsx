import { EuiFlexGroup, EuiFlexItem } from "@elastic/eui";
import React from "react";
import { graphql, useFragment } from "react-relay";

import { DateTime } from "../datetime/DateTime";

import type { ResourceDropdown$key } from "@/relay/ResourceDropdown.graphql";
import { createMaybeDate } from "~/lib/createDate";

interface IProps {
	data: ResourceDropdown$key;
}
export function ResourceDropdown(props: IProps) {
	const data = useFragment(
		graphql`
			fragment ResourceDropdown on Resource {
				name
				metadata {
					creationTimestamp
				}
			}
		`,
		props.data
	);

	return (
		<EuiFlexGroup>
			<EuiFlexItem>
				<EuiFlexGroup direction={"column"} gutterSize={"xs"}>
					<EuiFlexItem grow={false}>{data.name}</EuiFlexItem>
					<EuiFlexItem grow={false}>
						Uploaded at: <DateTime date={createMaybeDate(data.metadata.creationTimestamp)} />
					</EuiFlexItem>
				</EuiFlexGroup>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
