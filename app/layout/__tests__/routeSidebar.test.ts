import { describe, expect, test } from "bun:test";

import type { UIMatch } from "react-router";

import {
	leftSidebarFromMatches,
	rightSidebarFromMatches,
	type RightSidebar,
} from "../routeSidebar.ts";

const ParentPanel = () => null;
const ChildPanel = () => null;
const ParentLeftSidebar = () => null;
const ChildLeftSidebar = () => null;

const parent: RightSidebar = {
	id: "parent",
	title: "Parent details",
	defaultOpen: true,
	component: ParentPanel,
};

const child: RightSidebar = {
	id: "child",
	title: "Child details",
	defaultOpen: false,
	component: ChildPanel,
};

function match(handle: unknown): UIMatch {
	return { id: "route", pathname: "/", params: {}, loaderData: undefined, handle };
}

describe("rightSidebarFromMatches", () => {
	test("uses the deepest route sidebar", () => {
		expect(
			rightSidebarFromMatches([match({ rightSidebar: parent }), match({ rightSidebar: child })]),
		).toBe(child);
	});

	test("inherits a parent route sidebar", () => {
		expect(rightSidebarFromMatches([match({ rightSidebar: parent }), match(undefined)])).toBe(
			parent,
		);
	});

	test("ignores malformed handles", () => {
		expect(rightSidebarFromMatches([match({ rightSidebar: { title: "Missing fields" } })])).toBe(
			undefined,
		);
	});
});

describe("leftSidebarFromMatches", () => {
	test("inherits the section sidebar from its parent route", () => {
		expect(
			leftSidebarFromMatches([
				match({ leftSidebar: ParentLeftSidebar }),
				match({ breadcrumb: "Entry" }),
			]),
		).toBe(ParentLeftSidebar);
	});

	test("uses the deepest valid section sidebar", () => {
		expect(
			leftSidebarFromMatches([
				match({ leftSidebar: ParentLeftSidebar }),
				match({ leftSidebar: ChildLeftSidebar }),
			]),
		).toBe(ChildLeftSidebar);
	});

	test("ignores a handle without a sidebar component", () => {
		expect(leftSidebarFromMatches([match({ leftSidebar: "catalog" })])).toBe(undefined);
	});
});
