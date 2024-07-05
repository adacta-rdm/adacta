import React from "react";
import { useFragment } from "react-relay/hooks";
import { graphql } from "relay-runtime";

import type { ShowIfUserCanEdit$key } from "@/relay/ShowIfUserCanEdit.graphql";

interface IProps {
	metadata: ShowIfUserCanEdit$key;
}

export function ShowIfUserCanEdit(props: React.PropsWithChildren<IProps>) {
	const data = useFragment(
		graphql`
			fragment ShowIfUserCanEdit on HasMetadata {
				metadata {
					canEdit
				}
			}
		`,
		props.metadata
	);

	if (data.metadata.canEdit) return <>{props.children}</>;

	return <></>;
}
