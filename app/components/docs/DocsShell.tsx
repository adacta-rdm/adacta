import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { MobileNavigation } from "~/app/components/docs/MobileNavigation.tsx";
import { Navigation } from "~/app/components/docs/Navigation.tsx";
import { Search } from "~/app/components/docs/Search.tsx";

function GitHubIcon(props: React.ComponentPropsWithoutRef<"svg">) {
	return (
		<svg aria-hidden="true" viewBox="0 0 16 16" {...props}>
			<path d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z" />
		</svg>
	);
}

/**
 * The sticky top bar. It gains a shadow once the page is scrolled, so the bar
 * reads as lifted over the content it covers.
 *
 * The template's ThemeSelector slot is omitted. The theme follows the reader's
 * system setting, the same as the rest of the application.
 */
function Header() {
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		function onScroll() {
			setIsScrolled(window.scrollY > 0);
		}
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			window.removeEventListener("scroll", onScroll);
		};
	}, []);

	return (
		<header
			className={clsx(
				"sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-surface px-4 py-5 transition duration-500 sm:px-6 lg:px-8",
				// The shadow marks the header as lifted off the page once it covers
				// content. At the top of the page there is nothing to lift over.
				isScrolled ? "shadow-md shadow-foreground/5" : "shadow-none",
			)}
		>
			<div className="mr-6 flex lg:hidden">
				<MobileNavigation />
			</div>
			<div className="relative flex grow basis-0 items-center">
				<Link
					to="/docs"
					aria-label="Docs home"
					className="font-display text-2xl font-bold text-foreground"
				>
					Adacta
				</Link>
			</div>
			<div className="relative flex basis-0 items-center justify-end gap-6 sm:gap-8 md:grow">
				<Search />
				{/* Leave the docs and return to the application. "/" resolves to the
				    user's landing spot (login, account, or their repo inventory), so
				    a bare link is enough — no need to know where they came from. */}
				<Link to="/" className="text-sm font-medium text-foreground-muted hover:text-foreground">
					Back to app
				</Link>
				<a
					href="https://github.com/adacta-rdm/adacta"
					className="group"
					aria-label="GitHub"
					target="_blank"
					rel="noreferrer"
				>
					<GitHubIcon className="h-6 w-6 fill-foreground-muted group-hover:fill-foreground" />
				</a>
			</div>
		</header>
	);
}

/**
 * The docs app shell: sticky header plus the sticky left navigation sidebar,
 * wrapping the routed page content. Rendered once by the docs.tsx layout route;
 * `children` is the <Outlet />. Ported from the template's Layout, minus the
 * home-page Hero (the docs index is a normal doc here).
 */
export function DocsShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex w-full flex-col">
			<Header />

			<div className="relative mx-auto flex w-full max-w-8xl flex-auto justify-center sm:px-2 lg:px-8 xl:px-12">
				<div className="hidden lg:relative lg:block lg:flex-none">
					<div className="absolute inset-y-0 right-0 w-[50vw] border-r border-border bg-surface-muted" />
					<div className="sticky top-19 -ml-0.5 h-[calc(100vh-4.75rem)] w-64 overflow-x-hidden overflow-y-auto py-16 pr-8 pl-0.5 xl:w-72 xl:pr-16">
						<Navigation />
					</div>
				</div>
				{children}
			</div>
		</div>
	);
}
