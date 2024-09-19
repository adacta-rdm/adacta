import { EuiBadge, EuiButtonIcon, EuiImage, EuiText } from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import type { ReactElement } from "react";
import React, { useState } from "react";

import { ImageAnnotationCreate } from "./ImageAnnotationCreate";
import type { IAvailableLabel } from "./device/SetupDescriptionComponent";

export interface IImageAnnotation {
	x: number;
	y: number;
	label: string | ReactElement;
}

interface IEditOptions {
	allowEdit: true;
	availableLabels: IAvailableLabel[];

	onAddLabel: (value: string[], x: number, y: number) => void;
	onDeleteLabel: (x: number, y: number) => void;
}

interface IProps {
	imageSource: string;
	imageHeight: number;
	imageWidth: number;
	annotations: IImageAnnotation[];
	width?: number;
	caption?: React.ReactNode;

	options?: IEditOptions;
}

export function ImageAnnotationComponent(props: IProps) {
	const options = props.options?.allowEdit
		? props.options.availableLabels.map((l) => ({
				text: `${l.tag} ${l.name}`,
				value: l.path.join("."),
		  }))
		: [];

	const imageRef = React.createRef<HTMLDivElement>();

	const [newAnnotation, setNewAnnotation] = useState<
		(IImageAnnotation & { inFlight?: boolean }) | undefined
	>(undefined);

	const annotationLabels = [
		...props.annotations,
		...(newAnnotation !== undefined ? [newAnnotation] : []),
	];

	// If the image doesn't fit it will get scaled
	// Therefore, the coordinates of the click must also be scaled accordingly.
	const calculateScaling = () => {
		const rect = imageRef.current?.getBoundingClientRect();
		assertDefined(rect);

		const imageWidth = props.imageWidth;
		const renderWidth = rect.width;

		return imageWidth / renderWidth;
	};

	return (
		<>
			<div
				ref={imageRef}
				style={{
					position: "relative",
					display: "inline-block",
					width: "fit-content",
					height: "fit-content",
				}}
			>
				<EuiImage
					url={props.imageSource}
					alt={"Annotated image"}
					draggable={false}
					size={props.width}
					onClick={(e) => {
						if (props.options?.allowEdit && props.options.availableLabels.length) {
							const scaleFactor = calculateScaling();
							const rect = imageRef.current?.getBoundingClientRect();
							assertDefined(rect);

							const newX = (e.clientX - rect.left) * scaleFactor;
							const newY = (e.clientY - rect.top) * scaleFactor;

							setNewAnnotation({
								inFlight: true,
								x: newX,
								y: newY,
								label: (
									<ImageAnnotationCreate
										options={options}
										x={newX}
										y={newY}
										onSave={(value, x, y) => {
											if (props.options?.onAddLabel) {
												props.options.onAddLabel(value.split("."), x, y);
												setNewAnnotation(undefined);
											}
										}}
										onCancel={() => setNewAnnotation(undefined)}
									/>
								),
							});
						}
					}}
				/>
				<AnnotationLabels
					labels={annotationLabels}
					allowEdit={props.options?.allowEdit ?? false}
					onDeleteLabel={props.options?.onDeleteLabel}
					imageHeight={props.imageHeight}
					imageWidth={props.imageWidth}
				/>
			</div>
			<EuiText size={"s"}>{props.caption}</EuiText>
		</>
	);
}

function AnnotationLabels(props: {
	labels: (IImageAnnotation & { inFlight?: boolean })[];
	allowEdit: boolean;
	onDeleteLabel?: (x: number, y: number) => void;

	imageHeight: number;
	imageWidth: number;
}) {
	return props.labels.map((a, index) => {
		const yp = (a.y / props.imageHeight) * 100;
		const xp = (a.x / props.imageWidth) * 100;
		return (
			<div
				key={index}
				style={{
					position: "absolute",
					transform: "translate(-50%, -50%)",
					top: `${yp}%`,
					left: `${xp}%`,
					zIndex: 10,
				}}
			>
				<EuiBadge color="hollow" iconType="tag">
					{a.label}{" "}
					{props.allowEdit && !a.inFlight && (
						<EuiButtonIcon
							iconType={"trash"}
							size={"xs"}
							aria-label={"Remove label"}
							onClick={() => {
								if (props?.onDeleteLabel) {
									props.onDeleteLabel(a.x, a.y);
								}
							}}
						/>
					)}
				</EuiBadge>
			</div>
		);
	});
}
