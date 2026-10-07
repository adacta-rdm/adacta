import { highlightToml, type TomlTokenKind } from "~/app/lib/tomlHighlight.ts";

const tokenClasses = {
	plain: "",
	key: "text-accent font-semibold",
	string: "text-success",
	number: "text-warning-surface-foreground",
	boolean: "text-info",
	comment: "text-foreground-muted italic",
	table: "text-foreground-muted font-semibold",
} satisfies Record<TomlTokenKind, string>;

export function TomlCode({ text }: { text: string }) {
	return (
		<>
			{highlightToml(text).map((line, lineIndex) => (
				<span key={lineIndex}>
					{lineIndex > 0 ? "\n" : null}
					{line.map((token, tokenIndex) => (
						<span key={tokenIndex} className={tokenClasses[token.kind]}>
							{token.text}
						</span>
					))}
				</span>
			))}
		</>
	);
}
