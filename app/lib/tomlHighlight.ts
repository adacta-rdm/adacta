export type TomlTokenKind = "plain" | "key" | "string" | "number" | "boolean" | "comment" | "table";

export type TomlToken = { kind: TomlTokenKind; text: string };

/**
 * Tokenize a small TOML preview for display.
 */
export function highlightToml(text: string): TomlToken[][] {
	return text.split("\n").map(tokenizeLine);
}

function tokenizeLine(line: string): TomlToken[] {
	const commentAt = indexOutsideStrings(line, "#");
	const content = commentAt === -1 ? line : line.slice(0, commentAt);
	const comment = commentAt === -1 ? "" : line.slice(commentAt);
	const tokens: TomlToken[] = [];
	const table = content.match(/^(\s*)(\[\[?[^\]]+\]\]?)(\s*)$/);
	if (table) {
		push(tokens, "plain", table[1]!);
		push(tokens, "table", table[2]!);
		push(tokens, "plain", table[3]!);
	} else {
		const equalsAt = indexOutsideStrings(content, "=");
		if (equalsAt === -1) {
			push(tokens, "plain", content);
		} else {
			const left = content.slice(0, equalsAt);
			const keyStart = left.search(/\S/);
			const keyEnd = left.trimEnd().length;
			push(tokens, "plain", keyStart < 0 ? left : left.slice(0, keyStart));
			if (keyStart >= 0) push(tokens, "key", left.slice(keyStart, keyEnd));
			push(tokens, "plain", left.slice(keyEnd));
			push(tokens, "plain", "=");
			tokenizeValue(content.slice(equalsAt + 1), tokens);
		}
	}
	push(tokens, "comment", comment);
	return tokens;
}

function tokenizeValue(value: string, tokens: TomlToken[]) {
	const leading = value.match(/^\s*/)?.[0] ?? "";
	push(tokens, "plain", leading);
	const scalar = value.slice(leading.length);
	const quoted = scalar.match(/^(?:"(?:\\.|[^"\\])*"|'[^']*')/);
	if (quoted) {
		push(tokens, "string", quoted[0]);
		push(tokens, "plain", scalar.slice(quoted[0].length));
		return;
	}
	const boolean = scalar.match(/^(?:true|false)\b/);
	if (boolean) {
		push(tokens, "boolean", boolean[0]);
		push(tokens, "plain", scalar.slice(boolean[0].length));
		return;
	}
	const number = scalar.match(/^[+-]?(?:\d[\d_]*)(?:\.\d[\d_]*)?(?:[eE][+-]?\d[\d_]*)?\b/);
	if (number) {
		push(tokens, "number", number[0]);
		push(tokens, "plain", scalar.slice(number[0].length));
		return;
	}
	push(tokens, "plain", scalar);
}

function indexOutsideStrings(value: string, target: string): number {
	let quote = "";
	let escaped = false;
	for (let index = 0; index < value.length; index++) {
		const character = value[index]!;
		if (quote === '"' && character === "\\" && !escaped) {
			escaped = true;
			continue;
		}
		if ((character === '"' || character === "'") && !escaped) {
			quote = quote === character ? "" : quote || character;
		} else if (!quote && character === target) {
			return index;
		}
		escaped = false;
	}
	return -1;
}

function push(tokens: TomlToken[], kind: TomlTokenKind, text: string) {
	if (text) tokens.push({ kind, text });
}
