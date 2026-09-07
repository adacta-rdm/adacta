import {
	Combobox,
	ComboboxInput,
	ComboboxOption,
	ComboboxOptions,
	Dialog,
	DialogPanel,
} from "@headlessui/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { navigation } from "~/app/docs/navigation";
import { search, type SearchResult } from "~/app/lib/docs/searchIndex";

function SearchIcon(props: React.ComponentPropsWithoutRef<"svg">) {
	return (
		<svg aria-hidden="true" viewBox="0 0 20 20" {...props}>
			<path d="M16.293 17.707a1 1 0 0 0 1.414-1.414l-1.414 1.414ZM9 14a5 5 0 0 1-5-5H2a7 7 0 0 0 7 7v-2ZM4 9a5 5 0 0 1 5-5V2a7 7 0 0 0-7 7h2Zm5-5a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7v2Zm8.707 12.293-3.757-3.757-1.414 1.414 3.757 3.757 1.414-1.414ZM14 9a4.98 4.98 0 0 1-1.464 3.536l1.414 1.414A6.98 6.98 0 0 0 16 9h-2Zm-1.464 3.536A4.98 4.98 0 0 1 9 14v2a6.98 6.98 0 0 0 4.95-2.05l-1.414-1.414Z" />
		</svg>
	);
}

function CloseIcon(props: React.ComponentPropsWithoutRef<"svg">) {
	return (
		<svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" {...props}>
			<path d="M6 6l8 8M14 6l-8 8" strokeWidth={1.5} strokeLinecap="round" />
		</svg>
	);
}

/**
 * The "Page / Section" trail shown under a hit, derived from the nav structure
 * plus the hit's pageTitle (matching the template's hierarchy display).
 */
function trailFor(hit: SearchResult): string[] {
	const sectionTitle = navigation.find((section) =>
		section.links.some((link) => link.href === hit.url.split("#")[0]),
	)?.title;
	return [sectionTitle, hit.pageTitle].filter((x): x is string => typeof x === "string");
}

/**
 * Docs search: a ⌘K/Ctrl-K command palette over the FlexSearch index built in
 * lib/docs/searchIndex.
 *
 * Keyboard navigation, active-option highlighting, aria-activedescendant wiring,
 * and scroll-into-view are all provided by Headless UI's Combobox (already a
 * dependency) — not hand-rolled. This matters for Safari, which omits links from
 * the Tab order: Combobox keeps focus in the input and moves an active-option
 * index with ↑/↓, so results are reachable in every browser. Selecting an option
 * navigates to its url; the dialog then closes on the location change.
 */
export function Search() {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const location = useLocation();
	const navigate = useNavigate();

	// The corpus is tiny, so recomputing synchronously per keystroke is fine and
	// avoids any debounce/async machinery.
	const results = useMemo(() => search(query), [query]);

	// ⌘K (mac) / Ctrl-K toggles the palette — the discoverable docs-search
	// affordance; the header button opens it too.
	useEffect(() => {
		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
				event.preventDefault();
				setOpen((value) => !value);
			}
		}
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// Selecting a result navigates, changing location.key; close the palette
	// then. The query is deliberately kept, not cleared: reopening shows the last
	// search and its results, which is what a reader who is looking around a few
	// related pages expects. (Also runs on unrelated app navigations while closed
	// — harmless.)
	useEffect(() => {
		setOpen(false);
	}, [location.key]);

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="group flex h-6 w-6 items-center justify-center sm:justify-start md:h-auto md:w-60 md:flex-none md:rounded-lg md:py-2.5 md:pr-3.5 md:pl-4 md:text-sm md:ring-1 md:ring-slate-200 md:hover:ring-slate-300"
			>
				<SearchIcon className="h-5 w-5 flex-none fill-slate-400 group-hover:fill-slate-500" />
				<span className="sr-only md:not-sr-only md:ml-2 md:text-slate-500">Search docs</span>
				<kbd className="ml-auto hidden font-medium text-slate-400 md:block">
					<kbd className="font-sans">⌘</kbd>
					<kbd className="font-sans">K</kbd>
				</kbd>
			</button>

			<Dialog open={open} onClose={() => setOpen(false)} className="fixed inset-0 z-50">
				<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" aria-hidden="true" />
				{/* A prominent close affordance at the corner of the viewport, separate
				    from the in-field clear button below (which only empties the query). */}
				<button
					type="button"
					onClick={() => setOpen(false)}
					aria-label="Close search"
					className="fixed top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
				>
					<CloseIcon className="h-6 w-6" />
				</button>
				<div className="fixed inset-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-20 md:py-32 lg:px-8 lg:py-[15vh]">
					<DialogPanel
						// Escape should always close the whole palette. Headless UI's
						// Combobox otherwise swallows the first Escape to clear/close its
						// own listbox, so it takes two presses to dismiss the modal.
						// Handling it in the capture phase (before the Combobox's own
						// keydown) and stopping propagation gives the expected one-press
						// close.
						onKeyDownCapture={(event: React.KeyboardEvent<HTMLDivElement>) => {
							if (event.key === "Escape") {
								event.stopPropagation();
								setOpen(false);
							}
						}}
						className="mx-auto overflow-hidden rounded-xl bg-white shadow-xl sm:max-w-xl"
					>
						<Combobox
							onChange={(hit: SearchResult | null) => {
								if (hit) void navigate(hit.url);
							}}
						>
							<div className="relative flex h-12 items-center">
								<SearchIcon className="pointer-events-none absolute left-4 h-5 w-5 fill-slate-400" />
								<ComboboxInput
									ref={inputRef}
									autoFocus
									value={query}
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Find something..."
									className="flex-auto appearance-none bg-transparent pl-12 text-slate-900 outline-hidden placeholder:text-slate-400 sm:text-sm [&::-webkit-search-cancel-button]:hidden"
								/>
								{query !== "" && (
									<button
										type="button"
										onClick={() => {
											setQuery("");
											inputRef.current?.focus();
										}}
										aria-label="Clear search"
										className="mr-3 flex h-6 w-6 flex-none items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
									>
										<CloseIcon className="h-4 w-4" />
									</button>
								)}
							</div>
							{query !== "" && (
								<div className="border-t border-slate-200 bg-white px-2 py-3">
									{results.length > 0 ? (
										<ComboboxOptions static>
											{results.map((hit) => {
												const trail = trailFor(hit);
												return (
													<ComboboxOption
														key={hit.url}
														value={hit}
														className="group block cursor-pointer rounded-lg px-3 py-2 data-focus:bg-slate-100"
													>
														<div className="text-sm text-slate-700 group-data-focus:text-sky-600">
															{hit.title}
														</div>
														{trail.length > 0 && (
															<div className="mt-0.5 truncate text-xs whitespace-nowrap text-slate-500">
																{trail.join(" / ")}
															</div>
														)}
													</ComboboxOption>
												);
											})}
										</ComboboxOptions>
									) : (
										<p className="px-4 py-8 text-center text-sm text-slate-700">
											No results for &ldquo;
											<span className="wrap-break-word text-slate-900">{query}</span>
											&rdquo;
										</p>
									)}
								</div>
							)}
							<div className="flex justify-end border-t border-slate-200 px-4 py-2.5 text-xs text-slate-400">
								<span>
									Press{" "}
									<kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-sans text-slate-500">
										Esc
									</kbd>{" "}
									to close
								</span>
							</div>
						</Combobox>
					</DialogPanel>
				</div>
			</Dialog>
		</>
	);
}
