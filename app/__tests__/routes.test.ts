import { describe, expect, test } from "bun:test";

import type { RouteConfigEntry } from "@react-router/dev/routes";
import { matchRoutes, type RouteObject } from "react-router";

// The route scanner receives this directory from the build tool in development.
const directoryKey = "__reactRouterAppDirectory";
const previousDirectory = Reflect.get(globalThis, directoryKey);
Reflect.set(globalThis, directoryKey, new URL("../", import.meta.url).pathname);
const { default: config } = await import("~/app/routes.ts");
if (previousDirectory === undefined) Reflect.deleteProperty(globalThis, directoryKey);
else Reflect.set(globalThis, directoryKey, previousDirectory);

function routeObjects(entries: RouteConfigEntry[]): RouteObject[] {
	return entries.map((entry): RouteObject => {
		const route = { id: entry.file, path: entry.path };

		return entry.index
			? { ...route, index: true }
			: { ...route, children: entry.children ? routeObjects(entry.children) : undefined };
	});
}

const routes = routeObjects(config);

describe("routes", () => {
	test.each([
		["/", "routes/_index.tsx"],
		["/inventory", "routes/inventory._index.tsx"],
		["/inventory/rig-1/data/mfc-log", "routes/inventory.$entrySlug.data.$recordingSlug.tsx"],
		["/inventory/rig-1/notes", "routes/inventory.$entrySlug.notes.tsx"],
		["/catalog", "routes/catalog._index.tsx"],
		["/catalog/maker/product", "routes/catalog.$manufacturerSlug.$productSlug.tsx"],
		["/samples", "routes/samples._index.tsx"],
		["/samples/pt-batch", "routes/samples.$batchSlug._index.tsx"],
		["/samples/pt-batch/edit", "routes/samples.$batchSlug.edit.tsx"],
		["/files/import", "routes/files.import.tsx"],
		["/files/originals/123", "routes/files.originals.$fileId.ts"],
		["/users", "routes/users.tsx"],
		["/unknown/page", "routes/$.tsx"],
	])("keeps %s inside the application layout", (path, file) => {
		const matches = matchRoutes(routes, path);

		expect(matches?.[0]?.route.id).toBe("routes/_app.tsx");
		expect(matches?.at(-1)?.route.id).toBe(file);
	});

	test.each([
		["/login", "routes/login.tsx"],
		["/api/auth/get-session", "routes/api.auth.$.ts"],
		["/docs", "routes/docs._index.tsx"],
		["/docs/catalog", "routes/docs.$slug.tsx"],
		["/docs/inventory", "routes/docs.$slug.tsx"],
		["/docs/samples", "routes/docs.$slug.tsx"],
	])("opens %s outside the application layout", (path, file) => {
		const matches = matchRoutes(routes, path);

		expect(matches?.map((match) => match.route.id)).not.toContain("routes/_app.tsx");
		expect(matches?.at(-1)?.route.id).toBe(file);
	});
});
