/*
	Tree rows stay as wide as the sidebar. Each row carries its own depth as
	padding. Guide lines mark nested lists without adding list margins.
*/
export const SIDEBAR_TREE_ROW = "flex items-center gap-2 px-2 py-1";
const NESTED_LIST = "relative before:absolute before:inset-y-0 before:w-px before:bg-border";
export const SIDEBAR_TREE_LEVEL_1_LIST = `${NESTED_LIST} before:left-4`;
export const SIDEBAR_TREE_LEVEL_1_ROW = "pl-6";
export const SIDEBAR_TREE_LEVEL_2_LIST = `${NESTED_LIST} before:left-8`;
export const SIDEBAR_TREE_LEVEL_2_ITEM = "block pl-9";
