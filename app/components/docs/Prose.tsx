import clsx from "clsx";

/**
 * Typographic wrapper for rendered markdown. It applies the Tailwind Typography
 * `prose` styles plus the docs-specific tweaks: a heading scroll offset for the
 * sticky header, the link underline effect, and the code block chrome.
 *
 * Colors come from the semantic roles in theme.css. Typography draws its own
 * colors from `--tw-prose-*` variables, so each role is assigned to the
 * matching variable here. One theme therefore drives both the prose and the
 * surrounding chrome.
 *
 * Polymorphic via `as` so it can wrap an <article>, <div>, or similar.
 */
export function Prose<T extends React.ElementType = "div">({
	as,
	className,
	...props
}: React.ComponentPropsWithoutRef<T> & {
	as?: T;
}) {
	const Component = as ?? "div";

	return (
		<Component
			className={clsx(
				className,
				"prose max-w-none",
				// Typography reads its colors from these variables.
				"[--tw-prose-body:var(--color-foreground-muted)] [--tw-prose-headings:var(--color-foreground)] [--tw-prose-bold:var(--color-foreground)] [--tw-prose-lead:var(--color-foreground-muted)] [--tw-prose-links:var(--color-link)] [--tw-prose-counters:var(--color-foreground-muted)] [--tw-prose-bullets:var(--color-border-strong)] [--tw-prose-hr:var(--color-border)] [--tw-prose-quotes:var(--color-foreground)] [--tw-prose-quote-borders:var(--color-border)] [--tw-prose-captions:var(--color-foreground-muted)] [--tw-prose-code:var(--color-foreground)] [--tw-prose-th-borders:var(--color-border-strong)] [--tw-prose-td-borders:var(--color-border)]",
				// headings
				"prose-headings:scroll-mt-28 prose-headings:font-display prose-headings:font-normal lg:prose-headings:scroll-mt-34",
				/*
					The link underline is drawn as an inset shadow rather than a border,
					so it can sit below the text baseline. The background color is the
					page behind it, which erases the part of the line the descenders
					cross.
				*/
				"prose-a:font-semibold prose-a:no-underline",
				"[--tw-prose-background:var(--color-canvas)] [--tw-prose-underline:var(--color-link-underline)]",
				"prose-a:shadow-[inset_0_-2px_0_0_var(--tw-prose-background),inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline)] prose-a:hover:[--tw-prose-underline-size:6px]",
				// A code block stays dark in both themes; see theme.css.
				"prose-pre:rounded-xl prose-pre:bg-code-surface prose-pre:text-code-foreground prose-pre:ring-1 prose-pre:ring-code-border prose-pre:shadow-lg",
			)}
			{...props}
		/>
	);
}
