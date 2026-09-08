import clsx from "clsx";
import { useId } from "react";

import { InstallationIcon } from "~/app/components/docs/icons/InstallationIcon.tsx";
import { LightbulbIcon } from "~/app/components/docs/icons/LightbulbIcon.tsx";
import { PluginsIcon } from "~/app/components/docs/icons/PluginsIcon.tsx";
import { PresetsIcon } from "~/app/components/docs/icons/PresetsIcon.tsx";
import { ThemingIcon } from "~/app/components/docs/icons/ThemingIcon.tsx";
import { WarningIcon } from "~/app/components/docs/icons/WarningIcon.tsx";

const icons = {
	installation: InstallationIcon,
	presets: PresetsIcon,
	plugins: PluginsIcon,
	theming: ThemingIcon,
	lightbulb: LightbulbIcon,
	warning: WarningIcon,
};

/*
	These fills are read by the light drawing alone, which never shows on a dark
	page. They are therefore fixed light values rather than theme roles.
*/
const iconStyles = {
	blue: "[--icon-foreground:var(--color-slate-900)] [--icon-background:var(--color-white)]",
	amber: "[--icon-foreground:var(--color-amber-900)] [--icon-background:var(--color-amber-100)]",
};

export function Icon({
	icon,
	color = "blue",
	className,
	...props
}: {
	color?: keyof typeof iconStyles;
	icon: keyof typeof icons;
} & Omit<React.ComponentPropsWithoutRef<"svg">, "color">) {
	const id = useId();
	const IconComponent = icons[icon];

	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 32 32"
			fill="none"
			className={clsx(className, iconStyles[color])}
			{...props}
		>
			<IconComponent id={id} color={color} />
		</svg>
	);
}

const gradients = {
	blue: [
		{ stopColor: "#0EA5E9" },
		{ stopColor: "#22D3EE", offset: ".527" },
		{ stopColor: "#818CF8", offset: 1 },
	],
	amber: [
		{ stopColor: "#FDE68A", offset: ".08" },
		{ stopColor: "#F59E0B", offset: ".837" },
	],
};

export function Gradient({
	color = "blue",
	...props
}: {
	color?: keyof typeof gradients;
} & Omit<React.ComponentPropsWithoutRef<"radialGradient">, "color">) {
	return (
		<radialGradient cx={0} cy={0} r={1} gradientUnits="userSpaceOnUse" {...props}>
			{gradients[color].map((stop, stopIndex) => (
				<stop key={stopIndex} {...stop} />
			))}
		</radialGradient>
	);
}

/**
 * Renders its children only in light mode. Each icon is drawn twice, because
 * the light drawing uses a flat fill that would disappear on a dark page.
 */
export function LightMode({ className, ...props }: React.ComponentPropsWithoutRef<"g">) {
	return <g className={clsx("dark:hidden", className)} {...props} />;
}

/**
 * Renders its children only in dark mode, as the counterpart to LightMode.
 */
export function DarkMode({ className, ...props }: React.ComponentPropsWithoutRef<"g">) {
	return <g className={clsx("hidden dark:inline", className)} {...props} />;
}
