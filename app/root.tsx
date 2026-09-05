import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import { ErrorPanel, ErrorPanelAction } from "~/app/components/ErrorPanel";
import { container } from "~/app/middleware/container";
import interVariable from "~/vendor/inter/InterVariable-latin.woff2?url";

import type { Route } from "./+types/root";

import "./app.css";

/**
 * Preloading starts the font download with the page. Without it, the font is
 * found only once the stylesheet is read, and text drawn before then changes
 * face when the font arrives. That change is a flash of unstyled text, or FOUT.
 *
 * A font is always fetched under CORS rules, so "crossOrigin" is required even
 * on this origin. Without it the file is fetched twice.
 */
export const links: Route.LinksFunction = () => [
	{
		rel: "preload",
		href: interVariable,
		as: "font",
		type: "font/woff2",
		crossOrigin: "anonymous",
	},
];

/**
 * Runs before every loader and action in the app.
 */
export const middleware: Route.MiddlewareFunction[] = [container];

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<Meta />
				<Links />
			</head>
			<body>
				{children}
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	);
}

export default function App() {
	return <Outlet />;
}

/**
 * Catches what no route below has caught. A repository page is caught by the
 * repository layout instead, which keeps the sidebar. This page therefore has
 * no sidebar to offer, so it sends the reader to the repository list.
 */
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
	return (
		<main className="flex min-h-svh flex-col justify-center bg-canvas">
			<ErrorPanel error={error}>
				<ErrorPanelAction href="/">Back to repositories</ErrorPanelAction>
			</ErrorPanel>
		</main>
	);
}
