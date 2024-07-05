export function getPortString(port: string | undefined) {
	if (!port) return "";
	return `:${port}`;
}
