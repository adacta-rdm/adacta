import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { createRoutesStub, createStaticHandler, Outlet, type RouteObject } from "react-router";

import { PageBreadcrumbs, type BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";

/**
 * Load the stub's routes before rendering on the server. This also gives the
 * stub the errors and remaining loader data from a failed request.
 */
async function renderTrail(
	routes: RouteObject[] & Parameters<typeof createRoutesStub>[0],
	path: string,
) {
	const context = await createStaticHandler(routes).query(new Request(`http://localhost${path}`));
	if (context instanceof Response) throw context;

	const Stub = createRoutesStub(routes);

	return renderToStaticMarkup(<Stub initialEntries={[path]} hydrationData={context} />);
}

function TrailLayout() {
	return (
		<>
			<PageBreadcrumbs />
			<Outlet />
		</>
	);
}

const samplesHandle = { breadcrumb: "Samples" } satisfies BreadcrumbHandle;

const batchHandle = {
	breadcrumb: (loaderData) => loaderData?.name,
} satisfies BreadcrumbHandle<{ name: string }>;

describe("PageBreadcrumbs", () => {
	test("orders entries from the section to the selected page", async () => {
		const routes = [
			{
				path: "/samples",
				Component: TrailLayout,
				handle: samplesHandle,
				children: [
					{
						path: ":batchSlug",
						handle: { breadcrumb: "Batch" },
						children: [{ path: "edit", handle: { breadcrumb: "Edit" } }],
					},
				],
			},
		];

		const html = await renderTrail(routes, "/samples/pt/edit");

		expect(html).toMatch(/Samples<\/a>.*Batch<\/a>.*Edit<\/span>/);
		expect(html).toContain('aria-label="Breadcrumb"');
		expect(html).toContain("<ol");
		expect(html.match(/aria-hidden="true"/g)).toHaveLength(2);
	});

	test("links ancestors and marks the current page as plain text", async () => {
		const routes = [
			{
				path: "/samples",
				Component: TrailLayout,
				handle: samplesHandle,
				children: [{ path: "new", handle: { breadcrumb: "New batch" } }],
			},
		];

		const html = await renderTrail(routes, "/samples/new");

		expect(html).toContain('href="/samples"');
		expect(html).toMatch(/<span aria-current="page"[^>]*>New batch<\/span>/);
		expect(html).not.toContain('href="/samples/new"');
	});

	test("reads the label from the route's loader data", async () => {
		const routes = [
			{
				path: "/samples",
				Component: TrailLayout,
				handle: samplesHandle,
				children: [
					{ path: ":batchSlug", loader: () => ({ name: "Pt batch" }), handle: batchHandle },
				],
			},
		];

		const html = await renderTrail(routes, "/samples/pt");

		expect(html).toMatch(/aria-current="page"[^>]*>Pt batch<\/span>/);
	});

	test("keeps known entries when a loader fails", async () => {
		const routes = [
			{
				path: "/samples",
				Component: TrailLayout,
				handle: samplesHandle,
				children: [
					{
						path: ":batchSlug",
						loader: () => {
							throw new Response("Batch not found", { status: 404 });
						},
						handle: batchHandle,
						ErrorBoundary: () => <p>Batch not found</p>,
					},
				],
			},
		];

		const html = await renderTrail(routes, "/samples/missing");

		expect(html).toMatch(/href="\/samples"[^>]*>Samples<\/a>/);
		expect(html).not.toContain('aria-current="page"');
		expect(html).toContain("<p>Batch not found</p>");
		expect(html).not.toContain("undefined");
	});

	test("marks the entry of an index route as the current page", async () => {
		// React Router reports the path of an index route with a trailing slash,
		// for example "/inventory/" for the URL "/inventory".
		const routes = [
			{
				path: "/inventory",
				Component: TrailLayout,
				children: [{ index: true, handle: { breadcrumb: "Inventory" } }],
			},
		];

		const html = await renderTrail(routes, "/inventory");

		expect(html).toMatch(/aria-current="page"[^>]*>Inventory<\/span>/);
		expect(html).not.toContain("<a");
	});
});
