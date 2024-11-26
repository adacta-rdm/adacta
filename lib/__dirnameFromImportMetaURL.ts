/**
 * Pass in `import.meta.url` as the argument and it will return the directory name of the current, similar to
 * `__dirname` in commonjs.
 *
 * Avoids the use of Node APIs so that it also works in the browser.
 */
export function __dirnameFromImportMetaURL(importMetaURL: string): string {
	const { pathname } = new URL(importMetaURL);
	const lastSlash = pathname.lastIndexOf("/");

	return pathname.slice(0, lastSlash);
}
