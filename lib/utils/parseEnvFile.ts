export function parseEnvFile(input: string): Record<string, string> {
	const output: Record<string, string> = {};

	for (let i = 0; i < input.split("\n").length; i++) {
		const line = input.split("\n")[i];
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const [key, ...rest] = trimmed.split("=");

		let value = rest.join("=").trim();
		if (value.startsWith('"')) {
			const error = () => {
				throw new Error(`Invalid value on line ${i + 1}: ${line}`);
			};

			// Get last occurrence of quote
			const endQuoteIndex = value.lastIndexOf('"');
			if (endQuoteIndex === -1) error();

			try {
				value = JSON.parse(value.slice(0, endQuoteIndex + 1)) as string;
			} catch (e) {
				error();
			}
		} else {
			// Get first occurrence of comment
			const commentIndex = value.indexOf("#");
			if (commentIndex !== -1) {
				value = value.slice(0, commentIndex).trim();
			}
		}

		output[key] = value;
	}

	return output;
}
