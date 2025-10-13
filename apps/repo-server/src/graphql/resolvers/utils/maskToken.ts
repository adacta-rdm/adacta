/**
 * This helper censors everything of a string expect for the first `unmaskeLenght` characters
 * This can be used to represent an API key token without having to disclose it completely.
 * @param token
 * @param unmaskedLength
 */
export function maskToken(token: string, unmaskedLength = 4) {
	return token.slice(0, unmaskedLength).padEnd(token.length, "*");
}
