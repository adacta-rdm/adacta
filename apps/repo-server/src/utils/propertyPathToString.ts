export function propertyPathToString(path: string[] | readonly string[]) {
	return path.join(" -> ");
}
