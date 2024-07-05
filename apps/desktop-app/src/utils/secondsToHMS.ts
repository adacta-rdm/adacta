/**
 * Splits the provided value into hours, minutes and seconds
 * @param value in seconds
 */
export function secondsToHMS(value: number) {
	const [div, mod] = divmod(value, 60);
	// Seconds are the modulo part
	const sec = mod;

	// Split division part into hours and minuites
	const [hour, min] = divmod(div, 60);
	return [hour, min, sec];
}

function divmod(a: number, b: number) {
	return [Number.parseInt(String(a / b)), a % b];
}
