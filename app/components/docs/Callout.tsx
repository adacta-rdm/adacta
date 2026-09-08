import clsx from "clsx";

import { Icon } from "~/app/components/docs/Icon.tsx";

/**
 * A callout sits on a colored surface, so its text must take the foreground
 * paired with that surface. Typography would otherwise color bold text and
 * links for the page background, and on a dark surface that text disappears.
 * Every prose color is therefore set to the current text color.
 */
const INHERIT_PROSE_COLORS =
	"[--tw-prose-body:currentColor] [--tw-prose-bold:currentColor] [--tw-prose-headings:currentColor] [--tw-prose-links:currentColor] [--tw-prose-code:currentColor] [--tw-prose-bullets:currentColor] [--tw-prose-counters:currentColor]";

const styles = {
	note: {
		container: "bg-info-surface ring-1 ring-info-border",
		title: "text-info-surface-foreground",
		body: "text-info-surface-foreground",
	},
	warning: {
		container: "bg-warning-surface ring-1 ring-warning-border",
		title: "text-warning-surface-foreground",
		body: "text-warning-surface-foreground",
	},
};

const icons = {
	note: (props: { className?: string }) => <Icon icon="lightbulb" {...props} />,
	warning: (props: { className?: string }) => <Icon icon="warning" color="amber" {...props} />,
};

/**
 * A highlighted note or warning. Rendered from the Markdoc `callout` tag.
 * `type` selects the surface and the leading icon.
 */
export function Callout({
	title,
	children,
	type = "note",
}: {
	title: string;
	children: React.ReactNode;
	type?: keyof typeof styles;
}) {
	const IconComponent = icons[type];

	return (
		<div className={clsx("my-8 flex rounded-3xl p-6", styles[type].container)}>
			<IconComponent className="h-8 w-8 flex-none" />
			<div className="ml-4 flex-auto">
				<p className={clsx("not-prose font-display text-xl", styles[type].title)}>{title}</p>
				<div className={clsx("prose mt-2.5", INHERIT_PROSE_COLORS, styles[type].body)}>
					{children}
				</div>
			</div>
		</div>
	);
}
