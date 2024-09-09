import { EuiFlexItem, EuiSpacer } from "@elastic/eui";
import React from "react";

/**
 * List of specification names that have special meaning.
 */
export const specialMeaningSpecificationsKeys = [
	"Description", // Rendered as a description of Devices right below the name
	"Responsible (primary)", // Displayed as the primary responsible person for a Device
	"Responsible (secondary)", // Displayed as the secondary responsible person for a Device

	"DOI", // DOI of a Sample/Device
	"Chemotion", // Link to the Chemotion entry of a Sample/Device
] as const;

export const specialMeaningSpecificationsValueValidator: Partial<
	Record<
		(typeof specialMeaningSpecificationsKeys)[number],
		| {
				validationFn?: (input: string) => boolean;
				render?: (specificationValue: string) => React.ReactNode | string;
				validationHint?: string;
		  }
		| undefined
	>
> = {
	Description: {
		render: (description) => (
			<EuiFlexItem
				grow={true}
				style={{
					whiteSpace: "pre-line", // Don't collapse newlines
				}}
			>
				{description}
				<EuiSpacer />
			</EuiFlexItem>
		),
	},

	"Responsible (primary)": {
		render: (v) => (
			<>
				Responsible (primary): {v}
				<br />
			</>
		),
	},

	"Responsible (secondary)": {
		render: (v) => (
			<>
				Responsible (secondary): {v}
				<br />
			</>
		),
	},

	DOI: {
		render: (v) => (
			<>
				DOI:{" "}
				<a href={`https://doi.org/${v}`} target={"_blank"} rel="noreferrer">
					{v}
				</a>
				<br />
			</>
		),
		validationFn: (input: string) => input.startsWith("10.") && input.includes("/"),
		validationHint: "Enter a DOI in the following format 10.1000/182",
	},

	Chemotion: {
		render: (v) => (
			<>
				<a href={v} target={"_blank"} rel="noreferrer">
					Show in Chemotion
				</a>
				<br />
			</>
		),
		validationFn: (input: string) => input.startsWith("https://") || input.startsWith("http://"),
		validationHint: "Enter a valid URL starting with http:// or https://",
	},
} as const;

export function isSpecialMeaningLabel(
	label: string
): label is (typeof specialMeaningSpecificationsKeys)[number] {
	return specialMeaningSpecificationsKeys.includes(label as any);
}

/**
 * Helper that renders a specification if it exists, or a fallback if it doesn't.
 */
export function renderSpecification(
	specifications: readonly { readonly name: string; readonly value: string }[],
	propertyName: (typeof specialMeaningSpecificationsKeys)[number],
	fallback = null
) {
	const property = specifications.find((p) => p.name === propertyName);
	if (!property) {
		return fallback;
	}

	const renderFn = specialMeaningSpecificationsValueValidator[propertyName]?.render;
	if (renderFn !== undefined) {
		return renderFn(property.value);
	}

	throw new Error(`No render function for property ${propertyName}`);
}
