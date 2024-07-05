import { EuiFlexItem, EuiImage } from "@elastic/eui";
import { isNonNullish } from "@omegadot/assert";
import React from "react";
import { graphql, useFragment } from "react-relay";

import type { ImageList$key } from "@/relay/ImageList.graphql";

interface IProps {
	images: ImageList$key;
	preview?: boolean;
}

export function ImageList(props: IProps) {
	const data = useFragment(
		graphql`
			fragment ImageList on HasImageResource {
				name
				imageResource {
					dataURI
				}
			}
		`,
		props.images
	);

	return (
		<>
			{data.imageResource.filter(isNonNullish).map((image, i) => (
				<EuiFlexItem grow={false} key={i}>
					<EuiImage
						allowFullScreen
						size={props.preview ? 25 : "s"}
						alt={`${data.name} preview #${i}`}
						url={image.dataURI}
					/>
				</EuiFlexItem>
			))}
		</>
	);
}
