import { EuiPageTemplate } from "@elastic/eui";
import type { ComponentProps } from "react";
import React from "react";

export function AdactaPageTemplate(props: ComponentProps<typeof EuiPageTemplate>) {
	return (
		<EuiPageTemplate
			restrictWidth={1200}
			// Avoids unnecessary scroll bars caused by accounting for the sticky header offset/padding
			grow={false}
			{...props}
		>
			{props.children}
		</EuiPageTemplate>
	);
}
