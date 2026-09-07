import { Dialog, DialogPanel } from "@headlessui/react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

import { Navigation } from "~/app/components/docs/Navigation.tsx";

function MenuIcon(props: React.ComponentPropsWithoutRef<"svg">) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			strokeWidth="2"
			strokeLinecap="round"
			{...props}
		>
			<path d="M4 7h16M4 12h16M4 17h16" />
		</svg>
	);
}

function CloseIcon(props: React.ComponentPropsWithoutRef<"svg">) {
	return (
		<svg
			aria-hidden="true"
			viewBox="0 0 24 24"
			fill="none"
			strokeWidth="2"
			strokeLinecap="round"
			{...props}
		>
			<path d="M5 5l14 14M19 5l-14 14" />
		</svg>
	);
}

/**
 * The hamburger menu + slide-over nav dialog shown below the lg breakpoint,
 * where the sidebar is hidden. Ported from the template; the Next
 * usePathname/useSearchParams "close on navigation" effect becomes an effect on
 * react-router's location.key (which changes on every navigation, including to
 * the same path with a new hash). No Suspense wrapper is needed — RR's
 * useLocation is synchronous, unlike Next's useSearchParams.
 */
export function MobileNavigation() {
	const [isOpen, setIsOpen] = useState(false);
	const close = useCallback(() => setIsOpen(false), [setIsOpen]);
	const locationKey = useLocation().key;

	// Close the slide-over whenever the route changes so a tapped link does not
	// leave the menu covering the page it navigated to.
	useEffect(() => {
		close();
	}, [locationKey, close]);

	function onLinkClick(event: React.MouseEvent<HTMLAnchorElement>) {
		const link = event.currentTarget;
		if (
			link.pathname + link.search + link.hash ===
			window.location.pathname + window.location.search + window.location.hash
		) {
			close();
		}
	}

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className="relative"
				aria-label="Open navigation"
			>
				<MenuIcon className="h-6 w-6 stroke-slate-500" />
			</button>
			<Dialog
				open={isOpen}
				onClose={() => close()}
				className="fixed inset-0 z-50 flex items-start overflow-y-auto bg-slate-900/50 pr-10 backdrop-blur-sm lg:hidden"
				aria-label="Navigation"
			>
				<DialogPanel className="min-h-full w-full max-w-xs bg-white px-4 pt-5 pb-12 sm:px-6 dark:bg-slate-900">
					<div className="flex items-center">
						<button type="button" onClick={() => close()} aria-label="Close navigation">
							<CloseIcon className="h-6 w-6 stroke-slate-500" />
						</button>
						<Link
							to="/docs"
							className="ml-6 font-display text-xl font-bold text-slate-900 dark:text-white"
							aria-label="Docs home"
						>
							Adacta
						</Link>
					</div>
					<Navigation className="mt-5 px-1" onLinkClick={onLinkClick} />
				</DialogPanel>
			</Dialog>
		</>
	);
}
