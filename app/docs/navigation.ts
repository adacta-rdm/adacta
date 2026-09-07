/**
 * The docs sidebar structure: ordered sections, each with ordered links. This
 * is the one file (besides the markdown itself) a documentation author edits.
 * Adding a doc means creating app/docs/<slug>.md and adding a link
 * here; the route and rendering are automatic.
 *
 * `href` is the full route path. The landing page ("Introduction") is the docs
 * index at /docs; every other page is /docs/<slug>, matching its markdown
 * filename.
 */
export interface NavigationLink {
	title: string;
	href: string;
}

export interface NavigationSection {
	title: string;
	links: NavigationLink[];
}

export const navigation: NavigationSection[] = [
	{
		title: "User Manual",
		links: [
			{ title: "Introduction", href: "/docs" },
			{ title: "Core concepts", href: "/docs/concepts" },
			{ title: "Adacta workflow", href: "/docs/workflow" },
			{ title: "Catalog", href: "/docs/catalog" },
			{ title: "Stations", href: "/docs/stations" },
			{ title: "Inventory and facilities", href: "/docs/inventory-and-facilities" },
			{ title: "Facility flowcharts and states", href: "/docs/flowcharts-and-states" },
			{ title: "Tags", href: "/docs/tags" },
			{ title: "Samples and batches", href: "/docs/samples-and-batches" },
			{ title: "Resources", href: "/docs/resources" },
			{ title: "Importing files", href: "/docs/importing-files" },
			{ title: "Planned data import", href: "/docs/planned-data-import" },
			{ title: "Setup evidence and change types", href: "/docs/setup-evidence" },
			{ title: "Importing data", href: "/docs/importing-data" },
			{ title: "Best practices", href: "/docs/best-practices" },
			{ title: "Troubleshooting", href: "/docs/troubleshooting" },
		],
	},
];
