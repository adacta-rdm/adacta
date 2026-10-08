import type { ComponentType } from "react";
import type { UIMatch } from "react-router";

export type RightSidebar = {
	id: string;
	title: string;
	defaultOpen: boolean;
	defaultWidth?: number;
	component: ComponentType;
};

export type RightSidebarHandle = {
	rightSidebar: RightSidebar;
};

export type LeftSidebar = ComponentType;

export type LeftSidebarHandle = {
	leftSidebar: LeftSidebar;
};

export function leftSidebarFromMatches(matches: UIMatch[]): LeftSidebar | undefined {
	for (let index = matches.length - 1; index >= 0; index -= 1) {
		const handle = matches[index]?.handle;
		if (isLeftSidebarHandle(handle)) return handle.leftSidebar;
	}
}

export function rightSidebarFromMatches(matches: UIMatch[]): RightSidebar | undefined {
	for (let index = matches.length - 1; index >= 0; index -= 1) {
		const handle = matches[index]?.handle;
		if (isRightSidebarHandle(handle)) return handle.rightSidebar;
	}
}

function isRightSidebarHandle(value: unknown): value is RightSidebarHandle {
	if (!value || typeof value !== "object" || !("rightSidebar" in value)) return false;

	const sidebar = value.rightSidebar;
	return (
		sidebar !== null &&
		typeof sidebar === "object" &&
		"id" in sidebar &&
		typeof sidebar.id === "string" &&
		"title" in sidebar &&
		typeof sidebar.title === "string" &&
		"defaultOpen" in sidebar &&
		typeof sidebar.defaultOpen === "boolean" &&
		"component" in sidebar &&
		typeof sidebar.component === "function"
	);
}

function isLeftSidebarHandle(value: unknown): value is LeftSidebarHandle {
	if (!value || typeof value !== "object" || !("leftSidebar" in value)) return false;
	return typeof value.leftSidebar === "function";
}
