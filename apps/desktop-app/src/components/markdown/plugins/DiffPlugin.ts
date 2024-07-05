/* eslint-disable @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return */
import type { ParserFunction, Plugin } from "unified/types/ts3.4/index";

export interface IDiffToken {
	type: "diff";
	instruction: string;
	contents: string;
}

/**
 * Adds support for having ins/del HTML tags within markdown.
 * The tags provide the following result:
 * 	  INPUT										OUTPUT
 * 	- [ins-start]NEWLY INSERTED[ins-end]		<ins>NEWLY INSERTED</ins>
 *  - [del-start]REMOVED CONTENT[del-end]		<del>REMOVED CONTENT</del>
 *
 * These additional tags are internally used to render diffs in markdown content
 */
export const DiffPlugin: Plugin = function Diff() {
	const Parser = this.Parser as ParserFunction;
	const tokenizers = Parser.prototype.inlineTokenizers;
	const methods = Parser.prototype.inlineMethods;

	// function to parse a matching string
	function tokenizeDiff(
		eat: (arg0: any) => { (arg0: IDiffToken): any; new (): any },
		value: string,
		silent: boolean
	) {
		const tokenMatch = value.match(/^:(?:(ins|del)-start):(.*?):(?:ins-end|del-end):/);

		if (!tokenMatch) return false; // no match
		const [full, mode, contents] = tokenMatch;

		if (silent) {
			return true;
		}

		const instruction: IDiffToken = {
			type: "diff",
			instruction: mode,
			contents: contents,
		};

		return eat(full)(instruction);
	}

	// function to detect where the next diff match might be found
	tokenizeDiff.locator = (value: string, fromIndex: number) => {
		return value.indexOf(":", fromIndex);
	};

	// define the diff plugin and inject it just before the existing text plugin
	tokenizers.diff = tokenizeDiff;
	methods.splice(methods.indexOf("text"), 0, "diff");
};
