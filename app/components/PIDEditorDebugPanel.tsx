import type { InternalNode } from "@xyflow/react";

import type { PIDHelperLines } from "~/app/components/PIDHelperLines.tsx";
import type { PIDNode } from "~/app/lib/PIDEditorGraph.ts";

export function PIDEditorDebugPanel({
	nodes,
	lines,
	getInternalNode,
}: {
	nodes: PIDNode[];
	lines: PIDHelperLines;
	getInternalNode: (id: string) => InternalNode<PIDNode> | undefined;
}) {
	return (
		<details className="absolute top-3 right-3 z-20 w-[42rem] max-w-[calc(100%-1.5rem)] rounded-lg border border-border bg-surface/95 text-xs text-foreground shadow-lg backdrop-blur-sm">
			<summary className="cursor-pointer px-3 py-2 font-semibold select-none">
				Debug geometry
			</summary>
			<div className="max-h-[calc(100svh-6rem)] overflow-auto border-t border-border px-3 py-2">
				<section>
					<h3 className="font-semibold text-foreground-muted">Rendered nodes</h3>
					<table className="mt-1 w-full border-collapse text-left tabular-nums">
						<thead className="text-[0.6875rem] text-foreground-muted">
							<tr>
								<th className="py-1 pr-2 font-medium">Node</th>
								<th className="py-1 pr-2 font-medium">Position</th>
								<th className="py-1 font-medium">Size</th>
							</tr>
						</thead>
						<tbody>
							{nodes.map((node) => {
								const internal = getInternalNode(node.id);
								const measured = internal?.measured;
								const absolute = internal?.internals.positionAbsolute;

								return (
									<tr key={node.id} className="border-t border-border align-top">
										<th className="py-1 pr-2 text-left font-medium">
											{node.id}
											<span className="block font-normal text-foreground-muted">
												{node.data.kind}
											</span>
										</th>
										<td className="py-1 pr-2 whitespace-nowrap">
											{modelPosition(node)}
											<br />
											<span className="text-foreground-muted">
												abs {absolutePosition(absolute)}
											</span>
										</td>
										<td className="py-1 whitespace-nowrap">
											{measured?.width === undefined || measured.height === undefined
												? "—"
												: `${format(measured.width)} × ${format(measured.height)}`}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</section>

				<section className="mt-3 border-t border-border pt-2">
					<h3 className="font-semibold text-foreground-muted">Helper lines</h3>
					{lines.horizontal || lines.vertical ? (
						<ul className="mt-1 space-y-1 tabular-nums">
							{lines.horizontal ? (
								<li>
									Horizontal y={format(lines.horizontal.stationary.y)} · moving{" "}
									{lines.horizontal.moving.nodeId} · targets {lineTargets(lines.horizontal)}
								</li>
							) : null}
							{lines.vertical ? (
								<li>
									Vertical x={format(lines.vertical.stationary.x)} · moving{" "}
									{lines.vertical.moving.nodeId} · targets {lineTargets(lines.vertical)}
								</li>
							) : null}
						</ul>
					) : (
						<p className="mt-1 text-foreground-muted">No active helper lines.</p>
					)}
				</section>
			</div>
		</details>
	);
}

function modelPosition(node: PIDNode): string {
	return `(${format(node.position.x)}, ${format(node.position.y)})`;
}

function absolutePosition(position: { x: number; y: number } | undefined): string {
	return position === undefined ? "—" : `(${format(position.x)}, ${format(position.y)})`;
}

function lineTargets(line: { alignedStationary: { nodeId: string }[] }): string {
	return line.alignedStationary.map((anchor) => anchor.nodeId).join(", ") || "—";
}

function format(value: number): string {
	return Number.isInteger(value)
		? String(value)
		: value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
