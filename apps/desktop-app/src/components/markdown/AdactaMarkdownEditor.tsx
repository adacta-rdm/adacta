import { EuiMarkdownEditor } from "@elastic/eui";
import type { ComponentProps } from "react";

import { processingList } from "./markdownPlugins";

type TProps = ComponentProps<typeof EuiMarkdownEditor>;

export function AdactaMarkdownEditor(props: TProps) {
	return (
		<EuiMarkdownEditor {...props} processingPluginList={processingList}>
			{props.children}
		</EuiMarkdownEditor>
	);
}
