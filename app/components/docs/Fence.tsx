import { Highlight } from "prism-react-renderer";
import { Fragment } from "react";

/**
 * Renders a fenced code block with Prism syntax highlighting. Token colors come
 * from styles/prism.css (an empty theme is passed here so Prism emits class
 * names rather than inline styles). Rendered from the Markdoc `fence` node.
 */
export function Fence({ children, language }: { children: string; language: string }) {
	return (
		<Highlight code={children.trimEnd()} language={language} theme={{ plain: {}, styles: [] }}>
			{({ className, style, tokens, getTokenProps }) => (
				<pre className={className} style={style}>
					<code>
						{tokens.map((line, lineIndex) => (
							<Fragment key={lineIndex}>
								{line
									.filter((token) => !token.empty)
									.map((token, tokenIndex) => (
										<span key={tokenIndex} {...getTokenProps({ token })} />
									))}
								{"\n"}
							</Fragment>
						))}
					</code>
				</pre>
			)}
		</Highlight>
	);
}
