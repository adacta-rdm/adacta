import type { NodeProps } from "@xyflow/react";

import { maximumSizeForPIDSymbol } from "~/app/components/PIDSymbol.tsx";
import { getPIDSymbolComponents } from "~/app/components/pid-symbols/PIDSymbolRegistry.ts";
import type { PIDNode } from "~/app/lib/PIDEditorGraph.ts";

export function PIDSymbolNode({ id, data, selected }: NodeProps<PIDNode>) {
	const ConnectableSymbol = getPIDSymbolComponents(data.kind).ConnectableSymbol;
	const maximumSize = maximumSizeForPIDSymbol(data.kind, 56);
	const marked = selected || data.linkedSelected === true;

	// A note is its own text. Drawing the palette glyph as well would put a mark
	// on the diagram that stands for nothing.
	if (data.kind === "note") {
		return (
			<div
				data-pid-label-field="label"
				className={
					marked
						? "nodrag pid-label pid-symbol-selected max-w-48 cursor-text rounded bg-surface/90 px-1 text-xs leading-normal text-foreground"
						: "nodrag pid-label max-w-48 cursor-text rounded bg-surface/90 px-1 text-xs leading-normal text-foreground"
				}
			>
				{data.label || "Note"}
			</div>
		);
	}

	return (
		<div className="group/pid-node relative inline-flex items-center justify-center text-foreground">
			<ConnectableSymbol
				nodeId={id}
				selected={marked}
				inletCount={data.inletCount}
				orientation={data.orientation}
				maximumSize={maximumSize}
			/>

			{data.kind === "junction" || data.contained ? null : data.kind === "instrument" ? (
				<span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
					<span
						data-pid-label-field="label"
						className="pid-label pointer-events-auto max-w-full cursor-text truncate px-1 text-[0.5rem] font-medium"
					>
						{data.label}
					</span>
					<span
						data-pid-label-field="tag"
						className="pid-label pointer-events-auto max-w-full cursor-text truncate px-1 text-[0.5rem]"
					>
						{data.secondaryLabel ?? ""}
					</span>
				</span>
			) : (
				<span
					data-pid-label-field="label"
					className="nodrag pid-label absolute top-full left-1/2 mt-1 w-max max-w-32 -translate-x-1/2 cursor-text rounded px-1 text-center text-xs font-medium"
				>
					{data.label || "Unnamed"}
				</span>
			)}
		</div>
	);
}
