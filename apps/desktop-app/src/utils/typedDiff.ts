import Diff from "text-diff";

type DiffElement = [-1 | 0 | 1, string];
abstract class DiffClass {
	abstract main: (beforeText: string, afterText: string) => DiffElement[];

	abstract cleanupSemantic: (diffs: DiffElement[]) => void;
}

export const typedDiff = new Diff({ timeout: 5 }) as DiffClass;
