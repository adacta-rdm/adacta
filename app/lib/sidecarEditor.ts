export type SidecarEditorNode = {
	id: string;
	kind: "sample" | "equipment";
	label: string;
	symbolKey: string;
	equipment?: {
		id: number;
		slug: string;
		serialNumber: string | null;
		channels: { key: string; role: string }[];
	};
	sample?: { id: number; slug: string | null };
};

export type SidecarEditorIssue = { from: number; to: number; message: string };
export type PIDSidecarWarning = { nodeId: string; message: string };
export type SidecarReference = { path: string; key: string; from: number; to: number };
export type SidecarTodo = { path: string; from: number; to: number };

export function adjacentFinding<T extends { from: number; to: number }>(
	findings: readonly T[],
	offset: number,
	direction: -1 | 1,
	includeCurrent = false,
): T | undefined {
	const ordered = [...findings].sort((a, b) => a.from - b.from || a.to - b.to);
	if (direction === 1)
		return (
			ordered.find((finding) =>
				includeCurrent ? finding.from >= offset : finding.from > offset,
			) ?? ordered[0]
		);
	for (let index = ordered.length - 1; index >= 0; index--) {
		if (includeCurrent ? ordered[index]!.from <= offset : ordered[index]!.from < offset)
			return ordered[index];
	}
	return ordered.at(-1);
}
