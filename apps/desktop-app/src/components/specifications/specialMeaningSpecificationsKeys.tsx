import { EuiFlexItem, EuiSpacer } from "@elastic/eui";
import React from "react";

/**
 * List of specification names that have special meaning.
 */
export const specialMeaningSpecificationsKeys = [
	"Description", // Rendered as a description of Devices/Samples right below the name
	"Responsible (primary)", // Displayed as the primary responsible person for a Device/Sample
	"Responsible (secondary)", // Displayed as the secondary responsible person for a Device/Sample

	"DOI", // DOI of a Device/Sample
	"Chemotion", // Link to the Chemotion entry of  a Device/Sample
] as const;

export const specialMeaningSpecificationsHelpers: Partial<
	Record<
		(typeof specialMeaningSpecificationsKeys)[number],
		| {
				/**
				 * Controls how the specification value is rendered (i.e. plain text, link, etc.)
				 * @param specificationValue
				 */
				render?: (specificationValue: string) => React.ReactNode | string;

				/**
				 * Validation function for the specification value.
				 * @param input
				 */
				validationFn?: (input: string) => boolean;

				/**
				 * A general hint for the user on how to correctly fill out the specification.
				 */
				inputHint?: string;
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
		inputHint: "Enter a DOI in the following format 10.1000/182",
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
		inputHint: "Enter a valid URL starting with http:// or https://",
	},
} as const;

export function isSpecialMeaningLabel(
	label?: string
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

	const renderFn = specialMeaningSpecificationsHelpers[propertyName]?.render;
	if (renderFn !== undefined) {
		return renderFn(property.value);
	}

	throw new Error(`No render function for property ${propertyName}`);
}
