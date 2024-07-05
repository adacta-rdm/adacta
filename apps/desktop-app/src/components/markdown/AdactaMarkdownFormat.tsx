import { EuiMarkdownFormat } from "@elastic/eui";
import type { ComponentProps } from "react";

import { parsingList, processingList } from "./markdownPlugins";

type TProps = ComponentProps<typeof EuiMarkdownFormat>;

export function AdactaMarkdownFormat(props: TProps) {
	return (
		<EuiMarkdownFormat
			{...props}
			processingPluginList={processingList}
			parsingPluginList={parsingList}
		>
			{props.children}
		</EuiMarkdownFormat>
	);
}
