import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ArrowsPointingOutIcon, XMarkIcon } from "@heroicons/react/20/solid";
import {
	ConnectionMode,
	Controls,
	ReactFlow,
	type NodeMouseHandler,
	type NodeOrigin,
} from "@xyflow/react";
import clsx from "clsx";
import { memo, useCallback, useState } from "react";

import { PIDConnection } from "~/app/components/PIDEditorConnections.tsx";
import { PIDSymbolNode } from "~/app/components/PIDEditorSymbolNode.tsx";
import type { PIDGraph } from "~/app/lib/PID.ts";
import { editorEdges, editorNodes, type PIDEdge, type PIDNode } from "~/app/lib/PIDEditorGraph.ts";
import type {
	CsvSidecarPreview,
	MeasurementSidecar,
	SidecarColumn,
} from "~/app/lib/measurementSidecar.ts";

import "@xyflow/react/dist/style.css";

type MappingSelection =
	| { source: "column"; columnIndex: number }
	| { source: "node"; nodeId: string };

const nodeTypes = { "pid-symbol": PIDSymbolNode };
const edgeTypes = { "pid-connection": PIDConnection };
const nodeOrigin: NodeOrigin = [0.5, 0.5];

export type MeasurementMappingRig = {
	id: number;
	slug: string;
	name: string;
	symbolKeys: string[];
	graph: PIDGraph;
};

type CachedEditorGraph = {
	nodes: PIDNode[];
	edges: PIDEdge[];
	selections: Map<string, PIDNode[]>;
};

const editorGraphCache = new WeakMap<PIDGraph, CachedEditorGraph>();
const MAX_CACHED_GRAPH_SELECTIONS = 16;

export function MeasurementMappingPreview({
	sidecar,
	csv,
	rig,
}: {
	sidecar: MeasurementSidecar;
	csv: CsvSidecarPreview;
	rig: MeasurementMappingRig;
}) {
	const [selection, setSelection] = useState<MappingSelection | undefined>(() => {
		const columnIndex = sidecar.columns.findIndex((column) => "symbol_key" in column);
		return columnIndex < 0 ? undefined : { source: "column", columnIndex };
	});
	const [inspectorOpen, setInspectorOpen] = useState(false);

	const selectedColumn =
		selection?.source === "column" ? sidecar.columns[selection.columnIndex] : undefined;
	const selectedDiagramNode =
		selection?.source === "node"
			? rig.graph.nodes.find((node) => node.id === selection.nodeId)
			: undefined;
	const selectedSymbolKey = channelSymbol(selectedColumn) ?? selectedDiagramNode?.symbolKey ?? null;
	const selectedNodeId = selection?.source === "node" ? selection.nodeId : undefined;
	const selectedColumnIndexes = new Set(
		selection?.source === "column"
			? [selection.columnIndex]
			: sidecar.columns.flatMap((column, index) =>
					channelSymbol(column) === selectedSymbolKey && selectedSymbolKey !== null ? [index] : [],
				),
	);
	const channelColumns = sidecar.columns.filter((column) => "symbol_key" in column);
	const matchedColumns = channelColumns.filter((column) =>
		rig.symbolKeys.includes(column.symbol_key),
	).length;

	const selectNode: NodeMouseHandler<PIDNode> = useCallback((_event, node) => {
		setSelection({ source: "node", nodeId: node.id });
	}, []);

	return (
		<div className="grid min-h-[32rem] w-full min-w-0 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
			<section
				className="min-w-0 border-b border-border lg:border-r lg:border-b-0"
				aria-label="Sidecar columns"
			>
				<div className="flex min-h-16 min-w-0 items-center border-b border-border px-4 py-3">
					<div className="min-w-0">
						<h3 className="text-sm font-semibold text-foreground">Sidecar columns</h3>
						<p className="mt-0.5 text-xs text-foreground-muted">
							{matchedColumns} of {channelColumns.length} recorded columns match this P&amp;ID.
						</p>
					</div>
				</div>
				<ol className="max-h-80 overflow-y-auto p-2 lg:max-h-[27rem]">
					{sidecar.columns.map((column, index) => {
						const symbolKey = channelSymbol(column);
						const matched = symbolKey !== null && rig.symbolKeys.includes(symbolKey);
						const selected = selectedColumnIndexes.has(index);

						return (
							<li key={`${column.name}-${index}`}>
								<button
									type="button"
									aria-pressed={selected}
									className={clsx(
										"flex w-full items-start gap-3 rounded-md px-2 py-2.5 text-left focus-visible:outline-2 focus-visible:outline-focus",
										selected ? "bg-surface-muted" : "hover:bg-surface-muted/60",
									)}
									onClick={() => setSelection({ source: "column", columnIndex: index })}
								>
									<span
										className={clsx(
											"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold tabular-nums",
											selected
												? "border-accent bg-accent text-accent-foreground"
												: "border-border bg-surface text-foreground-muted",
										)}
									>
										{index + 1}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium text-foreground">
											{column.name || "Unnamed column"}
										</span>
										<span className="mt-0.5 block truncate text-xs text-foreground-muted">
											{columnDescription(column)}
										</span>
										{symbolKey !== null && !matched ? (
											<span className="mt-1 block text-xs font-medium text-warning-surface-foreground">
												No P&amp;ID element matches {symbolKey}
											</span>
										) : null}
									</span>
								</button>
							</li>
						);
					})}
				</ol>
			</section>

			<section className="flex min-w-0 flex-col" aria-label={`${rig.name} P&ID mapping`}>
				<div className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-4 py-3">
					<div className="min-w-0" aria-live="polite">
						<h3 className="truncate text-sm font-semibold text-foreground">{rig.name} P&amp;ID</h3>
						<p className="mt-0.5 truncate text-xs text-foreground-muted">
							{selectionDescription(
								selection,
								selectedColumn,
								selectedDiagramNode,
								selectedColumnIndexes.size,
							)}
						</p>
					</div>
					<p className="hidden shrink-0 text-xs text-foreground-muted sm:block">
						Select a column or element
					</p>
				</div>
				{rig.graph.nodes.length > 0 ? (
					<>
						<div className="pid-editor pid-editor-canvas--read-only relative hidden min-h-80 flex-1 bg-diagram-surface lg:block">
							<ReadOnlyPIDCanvas
								graph={rig.graph}
								selectedNodeId={selectedNodeId}
								selectedSymbolKey={selectedSymbolKey}
								onNodeClick={selectNode}
							/>
						</div>
						<div className="grid min-h-44 place-items-center bg-diagram-surface px-4 py-6 text-center lg:hidden">
							<div className="w-full max-w-sm">
								<p className="text-sm text-foreground-muted">
									Open a focused view to inspect equipment, pipes, and recorded channels.
								</p>
								<button
									type="button"
									className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
									onClick={() => setInspectorOpen(true)}
								>
									<ArrowsPointingOutIcon className="size-5" />
									Inspect P&amp;ID
								</button>
								<p className="mt-2 text-xs text-foreground-muted">
									The inspector opens at the currently selected element.
								</p>
							</div>
						</div>
						<Dialog
							open={inspectorOpen}
							onClose={setInspectorOpen}
							className="fixed inset-0 z-50 lg:hidden"
						>
							<DialogPanel className="flex h-dvh w-screen flex-col bg-surface pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
								<header className="flex min-h-16 items-center justify-between gap-4 border-b border-border px-4 py-3">
									<div className="min-w-0">
										<DialogTitle className="truncate text-sm font-semibold text-foreground">
											{rig.name} P&amp;ID
										</DialogTitle>
										<p className="mt-0.5 truncate text-xs text-foreground-muted">
											{selectionDescription(
												selection,
												selectedColumn,
												selectedDiagramNode,
												selectedColumnIndexes.size,
											)}
										</p>
									</div>
									<button
										type="button"
										aria-label="Close P&ID inspector"
										className="flex size-11 shrink-0 items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
										onClick={() => setInspectorOpen(false)}
									>
										<XMarkIcon className="size-6" />
									</button>
								</header>
								<div className="measurement-mapping-inspector pid-editor pid-editor-canvas--read-only relative min-h-0 flex-1 bg-diagram-surface">
									<ReadOnlyPIDCanvas
										graph={rig.graph}
										selectedNodeId={selectedNodeId}
										selectedSymbolKey={selectedSymbolKey}
										onNodeClick={selectNode}
										focused
										controls
									/>
								</div>
								<p className="border-t border-border px-4 py-3 text-center text-xs text-foreground-muted">
									Drag to pan. Pinch or use the controls to zoom. Fit view shows the complete rig.
								</p>
							</DialogPanel>
						</Dialog>
					</>
				) : (
					<div className="grid min-h-80 place-items-center p-6 text-center">
						<p className="max-w-sm text-sm text-foreground-muted">
							This rig has no P&amp;ID elements to compare with the sidecar.
						</p>
					</div>
				)}
				{selectedColumn && selection?.source === "column" ? (
					<ColumnValues columnIndex={selection.columnIndex} csv={csv} />
				) : null}
			</section>
		</div>
	);
}

export const ReadOnlyPIDCanvas = memo(function ReadOnlyPIDCanvas({
	graph,
	selectedNodeId,
	selectedSymbolKey,
	onNodeClick,
	focused = false,
	controls = false,
}: {
	graph: PIDGraph;
	selectedNodeId?: string;
	selectedSymbolKey: string | null;
	onNodeClick: NodeMouseHandler<PIDNode>;
	focused?: boolean;
	controls?: boolean;
}) {
	return (
		<MappingCanvas
			nodes={cachedEditorNodes(graph, selectedNodeId, selectedSymbolKey)}
			edges={cachedEditorGraph(graph).edges}
			selectNode={onNodeClick}
			focused={focused}
			controls={controls}
		/>
	);
});

const MappingCanvas = memo(function MappingCanvas({
	nodes,
	edges,
	selectNode,
	focused = false,
	controls = false,
}: {
	nodes: PIDNode[];
	edges: PIDEdge[];
	selectNode: NodeMouseHandler<PIDNode>;
	focused?: boolean;
	controls?: boolean;
}) {
	const selectedNodes = nodes.filter((node) => node.selected);
	const focusNodes = focused && selectedNodes.length > 0 ? selectedNodes : undefined;

	return (
		<ReactFlow<PIDNode, PIDEdge>
			nodes={nodes}
			edges={edges}
			nodeTypes={nodeTypes}
			edgeTypes={edgeTypes}
			nodeOrigin={nodeOrigin}
			colorMode="light"
			fitView
			fitViewOptions={{
				padding: focused ? 0.75 : 0.2,
				minZoom: focused ? 0.75 : 0.25,
				maxZoom: focused ? 1.5 : 1.25,
				nodes: focusNodes,
			}}
			connectionMode={ConnectionMode.Loose}
			minZoom={0.25}
			maxZoom={2}
			zoomOnScroll={focused}
			zoomOnDoubleClick={focused}
			panOnScroll={!focused}
			panOnDrag={[0, 1]}
			nodesDraggable={false}
			nodesConnectable={false}
			elementsSelectable
			onNodeClick={selectNode}
		>
			{controls ? <Controls showInteractive={false} /> : null}
		</ReactFlow>
	);
});

function cachedEditorGraph(graph: PIDGraph): CachedEditorGraph {
	const cached = editorGraphCache.get(graph);
	if (cached) return cached;

	const converted = {
		nodes: editorNodes(graph).map((node) => ({
			...node,
			selected: false,
			draggable: false,
			focusable: true,
			ariaLabel: diagramNodeLabel(node),
		})),
		edges: editorEdges(graph).map((edge) => ({ ...edge, selectable: false })),
		selections: new Map<string, PIDNode[]>(),
	};
	editorGraphCache.set(graph, converted);
	return converted;
}

function cachedEditorNodes(
	graph: PIDGraph,
	selectedNodeId: string | undefined,
	selectedSymbolKey: string | null,
): PIDNode[] {
	const converted = cachedEditorGraph(graph);
	const selectionKey = selectedNodeId
		? `node:${selectedNodeId}`
		: selectedSymbolKey
			? `symbol:${selectedSymbolKey}`
			: "none";
	const cached = converted.selections.get(selectionKey);
	if (cached) {
		converted.selections.delete(selectionKey);
		converted.selections.set(selectionKey, cached);
		return cached;
	}

	const selectedNodes = converted.nodes.map((node) => ({
		...node,
		selected: selectedNodeId
			? node.id === selectedNodeId
			: selectedSymbolKey !== null && node.data.symbolKey === selectedSymbolKey,
	}));
	converted.selections.set(selectionKey, selectedNodes);
	if (converted.selections.size > MAX_CACHED_GRAPH_SELECTIONS) {
		const oldestKey = converted.selections.keys().next().value;
		if (oldestKey !== undefined) converted.selections.delete(oldestKey);
	}
	return selectedNodes;
}

function ColumnValues({ columnIndex, csv }: { columnIndex: number; csv: CsvSidecarPreview }) {
	const values = csv.rows.map((row) => row[columnIndex]).filter((value) => value !== undefined);
	if (values.length === 0) return null;
	return (
		<div className="flex items-center gap-2 overflow-x-auto border-t border-border px-4 py-2 text-xs">
			<span className="shrink-0 font-medium text-foreground-muted">Preview values</span>
			{values.map((value, index) => (
				<code key={index} className="rounded-md bg-surface-muted px-2 py-1 text-foreground">
					{value || "Empty"}
				</code>
			))}
		</div>
	);
}

function channelSymbol(column: SidecarColumn | undefined): string | null {
	return column && "symbol_key" in column ? column.symbol_key : null;
}

function columnDescription(column: SidecarColumn): string {
	if ("symbol_key" in column) {
		return `${column.symbol_key} · ${column.channel} (${column.role}) · ${column.unit}`;
	}
	if ("skip" in column) return "Not recorded";
	return column.axis === "time" ? `Time axis · ${column.timezone}` : "Date axis";
}

function diagramNodeLabel(node: PIDNode): string {
	return [node.data.label, node.data.secondaryLabel, node.data.symbolKey]
		.filter(Boolean)
		.join(" · ");
}

function selectionDescription(
	selection: MappingSelection | undefined,
	column: SidecarColumn | undefined,
	node: MeasurementMappingRig["graph"]["nodes"][number] | undefined,
	columnCount: number,
): string {
	if (!selection) return "No recorded column is available.";
	if (selection.source === "column" && column) {
		const symbolKey = channelSymbol(column);
		return symbolKey
			? `Column ${selection.columnIndex + 1} maps through ${symbolKey}.`
			: `Column ${selection.columnIndex + 1} is not linked to a P&ID element.`;
	}
	if (!node) return "The selected P&ID element is unavailable.";
	if (!node.symbolKey) return `${node.label} has no symbol key and no linked sidecar columns.`;
	return `${node.label || node.symbolKey} records ${columnCount} ${columnCount === 1 ? "column" : "columns"}.`;
}
