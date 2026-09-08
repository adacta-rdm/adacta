import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";

import type { TocSection, TocSubsection } from "~/app/lib/docs/collectSections.ts";

/**
 * The "On this page" sidebar. Highlights the section currently scrolled into
 * view via a scroll listener that measures each heading's position (client-only
 * effect; ids come from the sections computed server-side). Ported from the
 * template; next/link -> react-router Link, 'use client' dropped (react-router
 * SSR is whole-route, so the effect simply runs after hydration).
 */
export function TableOfContents({ tableOfContents }: { tableOfContents: TocSection[] }) {
	const [currentSection, setCurrentSection] = useState(tableOfContents[0]?.id);

	const getHeadings = useCallback((tableOfContents: TocSection[]) => {
		return tableOfContents
			.flatMap((node) => [node.id, ...node.children.map((child) => child.id)])
			.map((id) => {
				const el = document.getElementById(id);
				if (!el) return null;

				const style = window.getComputedStyle(el);
				const scrollMt = parseFloat(style.scrollMarginTop);

				const top = window.scrollY + el.getBoundingClientRect().top - scrollMt;
				return { id, top };
			})
			.filter((x): x is { id: string; top: number } => x !== null);
	}, []);

	useEffect(() => {
		if (tableOfContents.length === 0) return;
		const headings = getHeadings(tableOfContents);
		function onScroll() {
			const top = window.scrollY;
			let current = headings[0].id;
			for (const heading of headings) {
				if (top >= heading.top - 10) {
					current = heading.id;
				} else {
					break;
				}
			}
			setCurrentSection(current);
		}
		window.addEventListener("scroll", onScroll, { passive: true });
		onScroll();
		return () => {
			window.removeEventListener("scroll", onScroll);
		};
	}, [getHeadings, tableOfContents]);

	function isActive(section: TocSection | TocSubsection) {
		if (section.id === currentSection) {
			return true;
		}
		if (!("children" in section)) {
			return false;
		}
		return section.children.findIndex(isActive) > -1;
	}

	return (
		<div className="hidden xl:sticky xl:top-19 xl:-mr-6 xl:block xl:h-[calc(100vh-4.75rem)] xl:flex-none xl:overflow-y-auto xl:py-16 xl:pr-6">
			<nav aria-labelledby="on-this-page-title" className="w-56">
				{tableOfContents.length > 0 && (
					<>
						<h2
							id="on-this-page-title"
							className="font-display text-sm font-medium text-foreground"
						>
							On this page
						</h2>
						<ol role="list" className="mt-4 space-y-3 text-sm">
							{tableOfContents.map((section) => (
								<li key={section.id}>
									<h3>
										<Link
											to={`#${section.id}`}
											className={clsx(
												isActive(section)
													? "text-link"
													: "font-normal text-foreground-muted hover:text-foreground",
											)}
										>
											{section.title}
										</Link>
									</h3>
									{section.children.length > 0 && (
										<ol role="list" className="mt-2 space-y-3 pl-5 text-foreground-muted">
											{section.children.map((subSection) => (
												<li key={subSection.id}>
													<Link
														to={`#${subSection.id}`}
														className={isActive(subSection) ? "text-link" : "hover:text-foreground"}
													>
														{subSection.title}
													</Link>
												</li>
											))}
										</ol>
									)}
								</li>
							))}
						</ol>
					</>
				)}
			</nav>
		</div>
	);
}
