import type { ReactElement } from "react";
import { useCallback, useMemo } from "react";

import { typedDiff } from "../../../utils/typedDiff";

interface IProps {
	renderMode: "markdown" | "react";
	beforeText: string;
	afterText: string;
}

export function useTextDiff(props: IProps) {
	const diff = useMemo(() => {
		const diffs = typedDiff.main(props.beforeText, props.afterText);
		typedDiff.cleanupSemantic(diffs);
		return diffs;
	}, [props.beforeText, props.afterText]);

	const render = useCallback(
		(mode: 0 | 1 | -1, text: string): string | ReactElement => {
			switch (mode) {
				case 0:
					return text;
				case 1:
					return props.renderMode === "markdown" ? (
						text
							.split("\n")
							.map((t) => (t.trim() ? `:ins-start:${t}:ins-end:` : t))
							.join("\n")
					) : (
						<ins>{text}</ins>
					);
				case -1:
					return props.renderMode === "markdown" ? (
						text
							.split("\n")
							.map((t) => (t.trim() ? `:del-start:${t}:del-end:` : t))
							.join("\n")
					) : (
						<del>{text}</del>
					);
			}
		},
		[props.renderMode]
	);

	return useMemo((): string | ReactElement[] => {
		const d = diff.map(([mode, text]) => render(mode, text));

		if (props.renderMode === "markdown") {
			return d.join("");
		}

		return d as ReactElement[];
	}, [diff, render, props.renderMode]);
}
