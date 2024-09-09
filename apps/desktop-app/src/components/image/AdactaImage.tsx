import { EuiImage, EuiLoadingSpinner } from "@elastic/eui";
import React from "react";
import { graphql, useRefetchableFragment } from "react-relay";

import type { AdactaImageFragment$key } from "@/relay/AdactaImageFragment.graphql";
import { wrapWithSuspense } from "~/apps/desktop-app/src/utils/wrapWithSuspense";
import { IImagePreset } from "~/apps/repo-server/src/graphql/generated/resolvers";

interface IProps {
	alt: string;

	icon?: boolean;
	image: AdactaImageFragment$key;

	imageStyle?: React.CSSProperties;
}

export const AdactaImage = wrapWithSuspense(
	(props: IProps) => {
		const [data, r] = useRefetchableFragment(
			graphql`
				fragment AdactaImageFragment on ResourceImage
				@refetchable(queryName: "ImageRefetchQuery")
				@argumentDefinitions(preset: { type: "ImagePreset!" }) {
					imageURI(preset: $preset)
				}
			`,
			props.image
		);

		return (
			// This div/class hides the EUI "Full Screen" button that looks out of place on small
			// images
			<div className={"adactaImage"}>
				<EuiImage
					style={props.imageStyle}
					allowFullScreen
					size={props.icon ? 25 : "s"}
					alt={props.alt}
					url={data.imageURI}
					onFullScreen={() =>
						r({
							preset: IImagePreset.Regular,
						})
					}
				/>
			</div>
		);
	},
	(props: IProps) => {
		return (
			<div
				style={{
					display: "inline",
					// EUI Image Size s is 100px
					width: props.icon ? 25 : 100,
					height: props.icon ? 25 : 100,
					...props.imageStyle,
				}}
			>
				<EuiLoadingSpinner size={props.icon ? "s" : "m"} />
			</div>
		);
	}
);
