export function splitPropertyNameIntoVirtualGroups(oldPath: readonly string[]) {
	const virtualGroupSeparator = "/";

	return oldPath.flatMap((path) => {
		return path.split(virtualGroupSeparator);
	});
}
