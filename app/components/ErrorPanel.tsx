/**
 * The block shown in place of a page that could not be loaded.
 *
 * It centers itself in the space it is given. Inside the repository layout
 * that is the content area, so the sidebar stays and is the way out. On a full
 * page it is the window, and the caller passes a link instead.
 *
 * The stack is shown only while developing. A reader gets the sentence.
 */
import type { ReactNode } from "react";

import { describeError } from "~/app/lib/error/describeError.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

export function ErrorPanel({ error, children }: { error: unknown; children?: ReactNode }) {
	const { status, title, message } = describeError(error);
	const stack = import.meta.env.DEV && error instanceof Error ? error.stack : undefined;

	return (
		<div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 text-center">
			{status !== undefined && (
				<p className="text-5xl font-semibold tracking-tight text-foreground-muted">{status}</p>
			)}

			<Heading className="mt-4">{title}</Heading>

			<Text className="mt-2 max-w-prose">{message}</Text>

			{children && <div className="mt-8 flex flex-wrap justify-center gap-3">{children}</div>}

			{stack && (
				<pre className="mt-8 max-w-full overflow-x-auto rounded-lg border border-border bg-surface-muted p-4 text-left text-xs text-foreground-muted">
					<code>{stack}</code>
				</pre>
			)}
		</div>
	);
}

/**
 * A link styled as the one action a reader is most likely to want.
 */
export function ErrorPanelAction({ href, children }: { href: string; children: ReactNode }) {
	return (
		<a
			href={href}
			className="inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
		>
			{children}
		</a>
	);
}
