export function getPort(protocol: string, maybePort: string | undefined) {
	if (maybePort && maybePort.length > 0) {
		return Number(maybePort);
	}
	return protocol === "https:" ? 443 : 80;
}
