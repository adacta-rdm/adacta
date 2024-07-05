import { EuiLink, EuiToolTip, getDefaultEuiMarkdownProcessingPlugins } from "@elastic/eui";
import { getDefaultEuiMarkdownParsingPlugins } from "@elastic/eui";

import type { IDiffToken } from "./plugins/DiffPlugin";
import { DiffPlugin } from "./plugins/DiffPlugin";

// export const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();

function UserSuppliedLink(data: { href: string; children: string[] }) {
	return (
		<EuiToolTip
			position="top"
			content={<p>This is a user supplied link and therefore disabled for security reasons</p>}
		>
			<>
				<EuiLink color={"subdued"}>{data.children}</EuiLink>
			</>
		</EuiToolTip>
	);
}

export const processingList = getDefaultEuiMarkdownProcessingPlugins();
processingList[1][1].components.a = UserSuppliedLink;
processingList[1][1].components.diff = (p) => {
	const props = p as IDiffToken;
	switch (props.instruction) {
		case "ins":
			return <ins>{props.contents}</ins>;
		case "del":
			return <del>{props.contents}</del>;
	}

	throw new Error("Error in diff plugin");
};

export const parsingList = getDefaultEuiMarkdownParsingPlugins();
parsingList.push(DiffPlugin);
