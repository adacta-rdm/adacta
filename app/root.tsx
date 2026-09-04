import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import { ErrorPanel, ErrorPanelAction } from "~/app/components/ErrorPanel";
import { container } from "~/app/middleware/container";

import type { Route } from "./+types/root";

import "./app.css";

export const links: Route.LinksFunction = () => [
	{ rel: "preconnect", href: "https://fonts.googleapis.com" },
	{
		rel: "preconnect",
		href: "https://fonts.gstatic.com",
		crossOrigin: "anonymous",
	},
	{
		rel: "stylesheet",
		href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
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
