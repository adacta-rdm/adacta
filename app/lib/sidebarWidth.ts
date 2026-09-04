/**
 * The width of the navigation sidebar. The width is stored in a cookie.
 *
 * The server renders the page. A cookie is sent with the request. The server
 * can therefore draw the sidebar at the chosen width. Local storage is read
 * only after the browser takes over. The sidebar would then jump.
 */

export const DEFAULT_SIDEBAR_WIDTH = 256;
export const MIN_SIDEBAR_WIDTH = 224;
export const MAX_SIDEBAR_WIDTH = 480;

export const SIDEBAR_WIDTH_COOKIE = "adacta.sidebar.width";

/**
 * Hold a width inside the bounds the layout allows.
 */
export function clampSidebarWidth(width: number): number {
	return Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, width));
}

/**
 * The width sent with a request. The default width is used when there is none.
 *
 * The value comes from the browser. A value that is not a number is replaced
 * by the default. A value outside the bounds is held to them.
 */
export function sidebarWidthFromCookie(header: string | null): number {
	const value = header
		?.split(";")
		.map((cookie) => cookie.trim().split("=", 2))
		.find(([name]) => name === SIDEBAR_WIDTH_COOKIE)?.[1];

	const width = Number(value);

	return Number.isFinite(width) && value ? clampSidebarWidth(width) : DEFAULT_SIDEBAR_WIDTH;
}
