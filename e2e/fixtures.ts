import {
	test as base,
	expect,
	type APIRequestContext,
	type Locator,
	type Page,
} from "@playwright/test";
import { href } from "react-router";

export const test = base;

export { expect };

declare const resolvedURL: unique symbol;

/**
 * An address read from a rendered link.
 */
export type ResolvedURL = string & { readonly [resolvedURL]: true };

/**
 * Match an exact address after removing React Router's internal `index`
 * parameter. Other parameters remain part of the address.
 */
function urlIgnoringIndex(expected: string): (actual: URL) => boolean {
	const expectedURL = new URL(expected, "http://e2e.invalid");
	expectedURL.searchParams.delete("index");

	return (actual) => {
		const actualURL = new URL(actual);
		actualURL.searchParams.delete("index");

		return (
			actualURL.pathname === expectedURL.pathname &&
			actualURL.search === expectedURL.search &&
			actualURL.hash === expectedURL.hash
		);
	};
}

async function expectResolvedURL(page: Page, expected: string): Promise<void> {
	await expect(page).toHaveURL(urlIgnoringIndex(expected));
}

/**
 * Assert an address that was read from a rendered link.
 */
export function expectURL(page: Page, expected: ResolvedURL): Promise<void>;
/**
 * Assert an address described by a React Router route.
 */
export function expectURL<Path extends Parameters<typeof href>[0]>(
	page: Page,
	path: Path,
	...args: Parameters<typeof href<Path>> extends [unknown, ...infer Args] ? Args : never
): Promise<void>;
export async function expectURL(page: Page, path: string, ...args: object[]): Promise<void> {
	const expected = args.length === 0 ? path : href(path as never, ...(args as never));
	await expectResolvedURL(page, expected);
}

/**
 * Open a rendered link and return its destination. The link provides dynamic
 * identifiers that a test must not construct.
 */
export async function followLink(page: Page, link: Locator): Promise<ResolvedURL> {
	const destination = await link.getAttribute("href");
	if (destination === null) throw new Error("Expected a link with an href.");

	await link.click();
	await expectResolvedURL(page, destination);

	return destination as ResolvedURL;
}

/**
 * Return the user in the current Better Auth session. A browser without a
 * session returns null.
 */
export async function currentAuthUser(
	request: APIRequestContext,
): Promise<{ email: string; name: string } | null> {
	const response = await request.get("/api/auth/get-session");
	if (!response.ok()) return null;

	const body = (await response.json()) as { user?: { email: string; name: string } } | null;
	return body?.user ?? null;
}
