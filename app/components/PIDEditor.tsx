import {
	ChevronDownIcon,
	CursorArrowRaysIcon,
	HandRaisedIcon,
	MagnifyingGlassIcon,
	TrashIcon,
	XMarkIcon,
} from "@heroicons/react/20/solid";
import {
	addEdge,
	Background,
	BackgroundVariant,
	BaseEdge,
	ConnectionLineType,
	ControlButton,
	Controls,
	MarkerType,
	getSmoothStepPath,
	Panel as ReactFlowPanel,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	useUpdateNodeInternals,
	type Connection,
	type Edge,
	type EdgeMarker,
	type EdgeProps,
	type Node,
	type NodeOrigin,
	type NodeProps,
} from "@xyflow/react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import {
	getPIDSymbol,
	maximumSizeForPIDSymbol,
	PIDSymbol,
	pidInstrumentPresets,
	pidSymbolGroups,
	type PIDOrientation,
	type PIDSymbolKind,
} from "~/app/components/PIDSymbol.tsx";
import { getPIDSymbolComponents } from "~/app/components/pid-symbols/PIDSymbolRegistry.ts";
import { PID_EDGE_KINDS, type PIDEdgeKind, type PIDGraph } from "~/app/lib/PID.ts";
import { Switch } from "~/catalyst-ui/switch.tsx";
import { parallelLines } from "~/lib/parallel-lines/ParallelLines.ts";

import "@xyflow/react/dist/style.css";

type PIDNodeData = {
	kind: PIDSymbolKind;
	label: string;
	secondaryLabel: string | null;

	/**
	 * Whether this symbol sits inside another. A symbol that does draws no
	 * caption, because the caption would land on the one belonging to the
	 * symbol that holds it.
	 */
	contained: boolean;

	orientation: PIDOrientation;
};
type PIDNode = Node<PIDNodeData, "pid-symbol">;
type PIDEdgeData = { kind: PIDEdgeKind; weight: number };
type PIDEdge = Edge<PIDEdgeData, "pid-connection">;

type PaletteDrag = {
	pointerId: number;
	kind: PIDSymbolKind;
	startX: number;
	startY: number;
	moved: boolean;
};
type EditorTool = "select" | "pan";

const nodeTypes = { "pid-symbol": PIDSymbolNode };

const LINE_COLOR = "var(--adacta-color-foreground)";
const SELECTED_COLOR = "var(--adacta-color-accent)";
const NOTE_COLOR = "var(--adacta-color-foreground-muted)";

/**
 * The width a connection is drawn with. It is a little thinner than the
 * "--pid-line-width" the symbols use, so a symbol stays the stronger mark on
 * the page. The geometry needs the number, so the value cannot be read from
 * the stylesheet here.
 */
const LINE_WIDTH = 1;
const edgeTypes = { "pid-connection": PIDConnection };

/**
 * Returns an identifier for a new symbol or connection.
 *
 * crypto.randomUUID is defined only in a secure context. A development server
 * reached by host name over plain HTTP is not a secure context. For example,
 * the page at http://my-box.orb.local:5173 has no randomUUID, and calling it
 * throws. crypto.getRandomValues is defined in every context, so the random
 * part is built from it instead.
 */
function randomId(prefix: string): string {
	const bytes = new Uint8Array(16);
	crypto.getRandomValues(bytes);

	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

	return `${prefix}-${hex}`;
}

/**
 * Returns the kind of a connection, or "pipe" when the edge carries no data.
 *
 * React Flow permits an edge without data. Every edge created by this editor
 * carries a kind. The default therefore applies only to an edge created
 * elsewhere in React Flow.
 */
function edgeKind(edge: { data?: PIDEdgeData }): PIDEdgeKind {
	return edge.data?.kind ?? "pipe";
}

/**
 * Returns the arrow drawn at the end of a connection, or undefined when the
 * connection carries none.
 *
 * A pipe and a jacketed pipe both indicate the direction of flow.
 */
function arrowFor(kind: PIDEdgeKind, color: string): EdgeMarker | undefined {
	// A caption attaches a note, so nothing flows along it. A tracer runs beside
	// the pipe rather than along its centre, so an arrow on it would point from
	// off to one side. Neither carries one.
	if (kind === "caption" || kind === "traced") return undefined;

	return { type: MarkerType.ArrowClosed, color };
}

/**
 * The kinds offered in the connection inspector, in the order they appear.
 */
const edgeKinds = Object.keys(PID_EDGE_KINDS) as PIDEdgeKind[];
const nodeOrigin: NodeOrigin = [0.5, 0.5];

/**
 * A P&ID canvas that shows an existing graph and reports edits to it.
 *
 * The reported graph omits selection and other temporary canvas state. For
 * example, selecting a symbol does not become part of a saved diagram.
 */
export function PIDEditor({ value, readOnly = false, onChange }: PIDEditorProps) {
	return (
		<ReactFlowProvider>
			<PIDEditorContents value={value} readOnly={readOnly} onChange={onChange} />
		</ReactFlowProvider>
	);
}

export interface PIDEditorProps {
	value: PIDGraph;
	readOnly?: boolean;
	onChange?: (value: PIDGraph) => void;
}

function PIDEditorContents({ value, readOnly, onChange }: PIDEditorProps & { readOnly: boolean }) {
	const [nodes, setNodes, onNodesChange] = useNodesState<PIDNode>(editorNodes(value));
	const [edges, setEdges, onEdgesChange] = useEdgesState<PIDEdge>(editorEdges(value));

	// The kind given to the next connection drawn. It stays as chosen until it
	// is changed, so a run of jacketed pipes needs one choice rather than one
	// per line.
	const [nextEdgeKind, setNextEdgeKind] = useState<PIDEdgeKind>("pipe");
	const [showGrid, setShowGrid] = useState(false);
	const [activeTool, setActiveTool] = useState<EditorTool>("select");
	const [paletteFilter, setPaletteFilter] = useState("");
	const [openPaletteGroups, setOpenPaletteGroups] = useState<Set<string>>(
		() => new Set(pidSymbolGroups.map((group) => group.label)),
	);
	const [dragPreview, setDragPreview] = useState<{
		kind: PIDSymbolKind;
		x: number;
		y: number;
	}>();
	const nextNodeNumber = useRef(value.nodes.length + 1);
	const paletteDrag = useRef<PaletteDrag | undefined>(undefined);
	const canvas = useRef<HTMLDivElement>(null);
	const { screenToFlowPosition, zoomTo } = useReactFlow<PIDNode, PIDEdge>();
	const updateNodeInternals = useUpdateNodeInternals();

	useEffect(() => {
		setNodes(editorNodes(value));
		setEdges(editorEdges(value));
		nextNodeNumber.current = value.nodes.length + 1;
	}, [setEdges, setNodes, value]);

	useEffect(() => {
		onChange?.(pidGraph(nodes, edges));
	}, [edges, nodes, onChange]);

	const selectedNodes = nodes.filter((node) => node.selected);
	const selectedEdges = edges.filter((edge) => edge.selected);
	const selectedItemCount = selectedNodes.length + selectedEdges.length;
	const selectedNode = selectedItemCount === 1 ? selectedNodes[0] : undefined;
	const selectedEdge = selectedItemCount === 1 ? selectedEdges[0] : undefined;
	const selectionSummary = [
		selectionPart(selectedNodes.length, "symbol"),
		selectionPart(selectedEdges.length, "connection"),
	]
		.filter(Boolean)
		.join(" · ");
	const normalizedPaletteFilter = paletteFilter.trim().toLocaleLowerCase();
	const visibleSymbolGroups = pidSymbolGroups
		.map((group) => ({
			...group,
			symbols: group.symbols.filter((symbol) =>
				symbol.label.toLocaleLowerCase().includes(normalizedPaletteFilter),
			),
		}))
		.filter((group) => group.symbols.length > 0);
	// PIDConnection draws the line and reads the kind from the edge. Only the
	// arrow is prepared here. Its color follows the selection.
	const displayedEdges = edges.map((edge) => {
		const color = edge.selected ? SELECTED_COLOR : LINE_COLOR;

		return { ...edge, markerEnd: arrowFor(edgeKind(edge), color) };
	});

	function addNode(kind: PIDSymbolKind, position?: { x: number; y: number }) {
		const symbol = getPIDSymbol(kind);
		const number = nextNodeNumber.current++;
		const id = randomId("pid-node");

		setNodes((current) => [
			...current.map((node) => ({ ...node, selected: false })),
			{
				id,
				type: "pid-symbol",
				position: position ?? {
					x: 160 + ((number - 1) % 3) * 150,
					y: 120 + Math.floor((number - 1) / 3) * 130,
				},
				data: { kind, label: symbol.label, secondaryLabel: null, contained: false, orientation: 0 },
				selected: true,
			},
		]);
		setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
	}

	function connect(connection: Connection) {
		// The new connection is selected, so the inspector opens on it and its
		// kind can be set without hunting for it again.
		setNodes((current) => current.map((node) => ({ ...node, selected: false })));

		setEdges((current) =>
			addEdge<PIDEdge>(
				{
					...connection,
					id: randomId("pid-edge"),
					type: "pid-connection",
					data: { kind: nextEdgeKind, weight: 1 },
					selected: true,
					markerEnd: {
						type: MarkerType.ArrowClosed,
						color: LINE_COLOR,
					},
				},
				current.map((edge) => ({ ...edge, selected: false })),
			),
		);
	}

	function startPaletteDrag(event: ReactPointerEvent<HTMLDivElement>, kind: PIDSymbolKind) {
		if (event.button !== 0) return;

		// Prevent the pointer gesture from selecting labels while the symbol is
		// moved. Pointer capture also keeps the drag active outside its palette card.
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);

		paletteDrag.current = {
			pointerId: event.pointerId,
			kind,
			startX: event.clientX,
			startY: event.clientY,
			moved: false,
		};
	}

	function movePaletteDrag(event: ReactPointerEvent<HTMLDivElement>) {
		const drag = paletteDrag.current;
		if (drag?.pointerId !== event.pointerId) return;

		const moved = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4;
		if (!drag.moved && !moved) return;

		drag.moved = true;
		setDragPreview({ kind: drag.kind, x: event.clientX, y: event.clientY });
	}

	function finishPaletteDrag(event: ReactPointerEvent<HTMLDivElement>) {
		const drag = paletteDrag.current;
		if (drag?.pointerId !== event.pointerId) return;

		paletteDrag.current = undefined;
		setDragPreview(undefined);

		if (!drag.moved) {
			addNode(drag.kind);
			return;
		}

		const bounds = canvas.current?.getBoundingClientRect();
		if (!bounds) return;

		const isInsideCanvas =
			event.clientX >= bounds.left &&
			event.clientX <= bounds.right &&
			event.clientY >= bounds.top &&
			event.clientY <= bounds.bottom;

		if (isInsideCanvas) {
			addNode(drag.kind, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
		}
	}

	function cancelPaletteDrag(event: ReactPointerEvent<HTMLDivElement>) {
		if (paletteDrag.current?.pointerId !== event.pointerId) return;

		paletteDrag.current = undefined;
		setDragPreview(undefined);
	}

	function renameSelectedNode(label: string) {
		if (!selectedNode) return;

		setNodes((current) =>
			current.map((node) =>
				node.id === selectedNode.id ? { ...node, data: { ...node.data, label } } : node,
			),
		);
	}

	function setSelectedNodeTag(secondaryLabel: string) {
		if (!selectedNode) return;

		setNodes((current) =>
			current.map((node) =>
				node.id === selectedNode.id
					? { ...node, data: { ...node.data, secondaryLabel: secondaryLabel || null } }
					: node,
			),
		);
	}

	function orientSelectedNode(orientation: PIDOrientation) {
		if (!selectedNode) return;

		setNodes((current) =>
			current.map((node) =>
				node.id === selectedNode.id ? { ...node, data: { ...node.data, orientation } } : node,
			),
		);

		// React Flow caches handle positions. Recalculate them after the rotated
		// symbol and its connection points have reached the DOM.
		requestAnimationFrame(() => updateNodeInternals(selectedNode.id));
	}

	function setSelectedEdgeKind(kind: PIDEdgeKind) {
		if (!selectedEdge) return;

		setEdges((current) =>
			current.map((edge) =>
				edge.id === selectedEdge.id
					? { ...edge, data: { kind, weight: edge.data?.weight ?? 1 } }
					: edge,
			),
		);
	}

	function setSelectedEdgeWeight(weight: number) {
		if (!selectedEdge) return;

		setEdges((current) =>
			current.map((edge) =>
				edge.id === selectedEdge.id ? { ...edge, data: { kind: edgeKind(edge), weight } } : edge,
			),
		);
	}

	function deleteSelectedItems() {
		const selectedEdgeIds = new Set(selectedEdges.map((edge) => edge.id));

		// Deleting a symbol deletes what sits inside it. A symbol left behind
		// would name a holder that is no longer in the diagram.
		const selectedNodeIds = withContents(
			nodes,
			selectedNodes.map((node) => node.id),
		);

		setNodes((current) => current.filter((node) => !selectedNodeIds.has(node.id)));
		setEdges((current) =>
			current.filter(
				(edge) =>
					!selectedEdgeIds.has(edge.id) &&
					!selectedNodeIds.has(edge.source) &&
					!selectedNodeIds.has(edge.target),
			),
		);
	}

	function togglePaletteGroup(label: string) {
		setOpenPaletteGroups((current) => {
			const next = new Set(current);

			if (next.has(label)) {
				next.delete(label);
			} else {
				next.add(label);
			}

			return next;
		});
	}

	return (
		<div
			className="pid-editor mt-6 overflow-hidden rounded-xl border border-border bg-surface"
			onPointerMove={movePaletteDrag}
			onPointerUp={finishPaletteDrag}
			onPointerCancel={cancelPaletteDrag}
			onPointerLeave={cancelPaletteDrag}
		>
			{dragPreview ? (
				<div
					className="pointer-events-none fixed z-50 rounded-md border border-accent bg-surface p-2 text-foreground shadow-lg"
					style={{
						left: dragPreview.x,
						top: dragPreview.y,
						transform: "translate(-50%, -50%)",
					}}
				>
					<PIDSymbol kind={dragPreview.kind} className="h-8 w-12" />
				</div>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
				<p className="text-sm text-foreground-muted">
					{readOnly
						? "Drag or scroll to explore the diagram."
						: "Drag a symbol onto the canvas, then connect its ports."}
				</p>

				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<span id="pid-grid-label" className="text-sm text-foreground-muted">
							Grid
						</span>
						<Switch aria-labelledby="pid-grid-label" checked={showGrid} onChange={setShowGrid} />
					</div>
				</div>
			</div>

			<div ref={canvas} className="relative h-[calc(100vh-18rem)] min-h-[42rem] bg-canvas">
				<ReactFlow<PIDNode, PIDEdge>
					className={
						readOnly
							? "pid-editor-canvas--read-only"
							: activeTool === "pan"
								? "pid-editor-canvas--pan"
								: undefined
					}
					nodes={nodes}
					edges={displayedEdges}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					onNodesChange={readOnly ? undefined : onNodesChange}
					onEdgesChange={readOnly ? undefined : onEdgesChange}
					onConnect={readOnly ? undefined : connect}
					colorMode="system"
					connectionLineType={ConnectionLineType.Step}
					defaultViewport={{ x: 0, y: 0, zoom: 1 }}
					defaultEdgeOptions={{
						type: "pid-connection",
						markerEnd: {
							type: MarkerType.ArrowClosed,
							color: LINE_COLOR,
						},
					}}
					nodeOrigin={nodeOrigin}
					minZoom={0.25}
					maxZoom={2}
					zoomOnScroll={false}
					zoomOnDoubleClick={false}
					panOnScroll
					panOnDrag={readOnly || activeTool === "pan" ? [0, 1] : [1]}
					nodesDraggable={!readOnly && activeTool === "select"}
					nodesConnectable={!readOnly && activeTool === "select"}
					elementsSelectable={!readOnly && activeTool === "select"}
					selectionKeyCode={null}
					selectionOnDrag={!readOnly && activeTool === "select"}
					snapToGrid
					snapGrid={[10, 10]}
				>
					{!readOnly ? (
						<ReactFlowPanel position="top-left" className="m-3">
							<div
								role="toolbar"
								aria-label="Diagram tools"
								className="flex gap-1 rounded-lg border border-border bg-surface/95 p-1 shadow-lg backdrop-blur-sm"
							>
								<button
									type="button"
									aria-label="Select"
									aria-pressed={activeTool === "select"}
									title="Select"
									className={toolButtonClass(activeTool === "select")}
									onClick={() => setActiveTool("select")}
								>
									<CursorArrowRaysIcon className="size-4" />
									Select
								</button>
								<button
									type="button"
									aria-label="Hand"
									aria-pressed={activeTool === "pan"}
									title="Pan canvas"
									className={toolButtonClass(activeTool === "pan")}
									onClick={() => setActiveTool("pan")}
								>
									<HandRaisedIcon className="size-4" />
									Hand
								</button>
							</div>
						</ReactFlowPanel>
					) : null}

					<Controls showInteractive={false}>
						<ControlButton
							onClick={() => void zoomTo(1, { duration: 200 })}
							title="Reset zoom"
							aria-label="Reset zoom"
						>
							<span className="text-[0.625rem] font-semibold">1:1</span>
						</ControlButton>
					</Controls>
					{showGrid ? (
						<Background
							variant={BackgroundVariant.Lines}
							gap={20}
							color="var(--adacta-color-border)"
						/>
					) : null}
				</ReactFlow>

				{!readOnly && selectedItemCount > 0 ? (
					<aside className="absolute bottom-3 left-14 z-10 w-52 rounded-lg border border-border bg-surface/95 p-4 shadow-lg backdrop-blur-sm">
						<h3 className="text-sm font-semibold text-foreground">
							{selectedNode
								? "Selected symbol"
								: selectedEdge
									? "Selected connection"
									: `${selectedItemCount} items selected`}
						</h3>

						{selectedNode ? (
							<div className="mt-4 space-y-5">
								<label className="block">
									<span className="text-xs font-medium text-foreground-muted">
										{selectedNode.data.kind === "instrument" ? "Function" : "Label"}
									</span>
									<input
										value={selectedNode.data.label}
										onChange={(event) => renameSelectedNode(event.target.value)}
										className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
									/>
								</label>

								{selectedNode.data.kind === "instrument" ? (
									<>
										<div>
											<span className="text-xs font-medium text-foreground-muted">Common</span>
											<div className="mt-1 flex flex-wrap gap-1">
												{pidInstrumentPresets.map((preset) => (
													<button
														key={preset.code}
														type="button"
														title={preset.label}
														aria-label={preset.label}
														aria-pressed={selectedNode.data.label === preset.code}
														className="rounded border border-border px-1.5 py-0.5 text-[0.6875rem] text-foreground hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:font-semibold focus-visible:outline-2 focus-visible:outline-focus"
														onClick={() => renameSelectedNode(preset.code)}
													>
														{preset.code}
													</button>
												))}
											</div>
										</div>

										<label className="block">
											<span className="text-xs font-medium text-foreground-muted">Tag</span>
											<input
												value={selectedNode.data.secondaryLabel ?? ""}
												onChange={(event) => setSelectedNodeTag(event.target.value)}
												className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
											/>
										</label>
									</>
								) : null}

								<fieldset>
									<legend className="text-xs font-medium text-foreground-muted">Orientation</legend>
									<div className="mt-1 grid grid-cols-2 gap-1">
										{([0, 1, 2, 3] as const).map((orientation) => (
											<button
												key={orientation}
												type="button"
												aria-pressed={selectedNode.data.orientation === orientation}
												className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:font-semibold focus-visible:outline-2 focus-visible:outline-focus"
												onClick={() => orientSelectedNode(orientation)}
											>
												{orientation * 90}°
											</button>
										))}
									</div>
								</fieldset>
							</div>
						) : selectedEdge ? (
							<fieldset className="mt-4">
								<legend className="text-xs font-medium text-foreground-muted">Kind</legend>
								<div className="mt-1 grid gap-1">
									{edgeKinds.map((kind) => (
										<button
											key={kind}
											type="button"
											aria-pressed={edgeKind(selectedEdge) === kind}
											title={PID_EDGE_KINDS[kind].description}
											className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:font-semibold focus-visible:outline-2 focus-visible:outline-focus"
											onClick={() => setSelectedEdgeKind(kind)}
										>
											{PID_EDGE_KINDS[kind].name}
										</button>
									))}
								</div>

								<legend className="mt-4 text-xs font-medium text-foreground-muted">Weight</legend>
								<div className="mt-1 grid grid-cols-3 gap-1">
									{[1, 2, 3].map((weight) => (
										<button
											key={weight}
											type="button"
											aria-pressed={(selectedEdge.data?.weight ?? 1) === weight}
											title={
												weight === 1
													? "A branch or a sampling line"
													: weight === 3
														? "A main line"
														: "Between a branch and a main line"
											}
											className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:font-semibold focus-visible:outline-2 focus-visible:outline-focus"
											onClick={() => setSelectedEdgeWeight(weight)}
										>
											{weight}
										</button>
									))}
								</div>
							</fieldset>
						) : (
							<div className="mt-2 space-y-1 text-sm text-foreground-muted">
								<p>{selectionSummary}</p>
								<p>Drag a selected symbol to move the group.</p>
							</div>
						)}

						<button
							type="button"
							className="mt-4 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-foreground-muted hover:bg-danger-surface hover:text-danger-surface-foreground focus-visible:outline-2 focus-visible:outline-focus"
							onClick={deleteSelectedItems}
						>
							<TrashIcon className="size-4" />
							{selectedItemCount === 1 ? "Delete" : "Delete selection"}
						</button>
					</aside>
				) : null}

				{!readOnly ? (
					<aside className="absolute inset-y-3 right-3 z-10 flex w-60 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur-sm">
						<div className="border-b border-border p-3">
							<h3 className="text-sm font-semibold text-foreground">Connection</h3>
							<p className="mt-0.5 text-xs text-foreground-muted">
								The kind used for the next line you draw.
							</p>

							<div className="mt-3 grid grid-cols-2 gap-1">
								{edgeKinds.map((kind) => (
									<button
										key={kind}
										type="button"
										aria-pressed={nextEdgeKind === kind}
										title={PID_EDGE_KINDS[kind].description}
										className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface p-1.5 text-center text-[0.6875rem] leading-tight text-foreground hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:font-semibold"
										onClick={() => setNextEdgeKind(kind)}
									>
										<PIDConnectionSample kind={kind} />
										<span>{PID_EDGE_KINDS[kind].name}</span>
									</button>
								))}
							</div>
						</div>

						<div className="border-b border-border p-3">
							<h3 className="text-sm font-semibold text-foreground">Equipment</h3>
							<p className="mt-0.5 text-xs text-foreground-muted">
								Click or drag a symbol to add it.
							</p>

							<div className="relative mt-3">
								<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-foreground-muted" />
								<input
									type="text"
									value={paletteFilter}
									onChange={(event) => setPaletteFilter(event.target.value)}
									placeholder="Filter symbols"
									aria-label="Filter P&ID symbols"
									className="w-full rounded-md border border-border bg-surface py-1.5 pr-8 pl-8 text-sm text-foreground placeholder:text-foreground-muted focus:border-focus focus:outline-none"
								/>
								{paletteFilter ? (
									<button
										type="button"
										aria-label="Clear symbol filter"
										onClick={() => setPaletteFilter("")}
										className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded p-1 text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
									>
										<XMarkIcon className="size-4" />
									</button>
								) : null}
							</div>
						</div>

						<div className="min-h-0 flex-1 overflow-y-auto p-2">
							{visibleSymbolGroups.length > 0 ? (
								<div className="space-y-1">
									{visibleSymbolGroups.map((group) => {
										const isOpen = normalizedPaletteFilter
											? true
											: openPaletteGroups.has(group.label);

										return (
											<section key={group.label}>
												<button
													type="button"
													aria-expanded={isOpen}
													onClick={() => togglePaletteGroup(group.label)}
													className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
												>
													<span>{group.label}</span>
													<ChevronDownIcon
														className={`size-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
													/>
												</button>

												{isOpen ? (
													<div className="mt-1 grid grid-cols-2 gap-1.5 pb-2">
														{group.symbols.map((symbol) => (
															<div
																key={symbol.kind}
																role="button"
																tabIndex={0}
																className="flex min-h-14 touch-none cursor-grab select-none flex-col items-center justify-center gap-1 rounded-md border border-border bg-surface p-1.5 text-center text-[0.6875rem] leading-tight text-foreground hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing"
																onKeyDown={(event) => {
																	if (event.key !== "Enter" && event.key !== " ") return;

																	event.preventDefault();
																	addNode(symbol.kind);
																}}
																onPointerDown={(event) => startPaletteDrag(event, symbol.kind)}
															>
																<PIDSymbol kind={symbol.kind} className="h-6 w-10" />
																<span>{symbol.label}</span>
															</div>
														))}
													</div>
												) : null}
											</section>
										);
									})}
								</div>
							) : (
								<p className="px-2 py-6 text-center text-sm text-foreground-muted">
									No matching symbols
								</p>
							)}
						</div>
					</aside>
				) : null}
			</div>
		</div>
	);
}

function editorNodes(value: PIDGraph): PIDNode[] {
	const nodes: PIDNode[] = value.nodes.map((node) => ({
		id: node.id,
		type: "pid-symbol",
		position: { ...node.position },

		// A symbol that sits inside another is kept within it while it is
		// dragged, and its position is measured from that symbol.
		...(node.parentId === null ? {} : { parentId: node.parentId, extent: "parent" as const }),

		data: {
			kind: node.kind,
			label: node.label,
			secondaryLabel: node.secondaryLabel,
			contained: node.parentId !== null,
			orientation: node.orientation,
		},
	}));

	return holdersFirst(nodes);
}

/**
 * Returns the given symbols together with everything inside them.
 *
 * A symbol may hold another that holds a third, so the search continues until
 * it finds nothing further.
 */
function withContents(nodes: PIDNode[], ids: string[]): Set<string> {
	const doomed = new Set(ids);
	let added = true;

	while (added) {
		added = false;

		for (const node of nodes) {
			if (node.parentId === undefined) continue;
			if (doomed.has(node.id)) continue;
			if (!doomed.has(node.parentId)) continue;

			doomed.add(node.id);
			added = true;
		}
	}

	return doomed;
}

/**
 * Returns the symbols with every holder before what it holds.
 *
 * React Flow reads the list in order and needs a symbol to exist before it
 * places anything inside it. One pass is not enough, because a holder may
 * itself sit inside another. The list is therefore walked until nothing moves.
 */
function holdersFirst(nodes: PIDNode[]): PIDNode[] {
	const placed = new Set<string>();
	const ordered: PIDNode[] = [];
	let remaining = nodes;

	while (remaining.length > 0) {
		const ready = remaining.filter(
			(node) => node.parentId === undefined || placed.has(node.parentId),
		);

		// A symbol naming a holder that is not in the diagram would otherwise
		// loop here. The route rejects such a diagram, so this only guards
		// against a graph built in some other way.
		if (ready.length === 0) return [...ordered, ...remaining];

		for (const node of ready) placed.add(node.id);

		ordered.push(...ready);
		remaining = remaining.filter((node) => !placed.has(node.id));
	}

	return ordered;
}

function editorEdges(value: PIDGraph): PIDEdge[] {
	return value.edges.map((edge) => ({
		id: edge.id,
		type: "pid-connection",
		data: { kind: edge.kind, weight: edge.weight },
		source: edge.source,
		target: edge.target,
		sourceHandle: edge.sourceHandle,
		targetHandle: edge.targetHandle,
	}));
}

function pidGraph(nodes: PIDNode[], edges: PIDEdge[]): PIDGraph {
	return {
		nodes: nodes.map((node) => ({
			id: node.id,
			kind: node.data.kind,
			label: node.data.label,
			secondaryLabel: node.data.secondaryLabel,
			parentId: node.parentId ?? null,
			orientation: node.data.orientation,
			position: { ...node.position },
		})),
		edges: edges.map((edge) => ({
			id: edge.id,
			kind: edgeKind(edge),
			weight: edge.data?.weight ?? 1,
			source: edge.source,
			target: edge.target,
			sourceHandle: edge.sourceHandle ?? null,
			targetHandle: edge.targetHandle ?? null,
		})),
	};
}

function selectionPart(count: number, singular: string) {
	if (count === 0) return "";

	return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function toolButtonClass(active: boolean) {
	return `flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-focus ${
		active
			? "bg-accent text-accent-foreground"
			: "text-foreground-muted hover:bg-surface-muted hover:text-foreground"
	}`;
}

/**
 * Draws one connection between two symbols according to its kind.
 *
 * A pipe is drawn as a single line. A jacketed pipe is drawn as a wide line
 * covered by a narrower line in the canvas color. Two parallel lines therefore
 * remain visible. A traced line uses a dash-dot pattern, which stands for the
 * tracer that heats or cools the pipe. A caption line is dashed, because it
 * carries no process fluid.
 *
 * The v2 editor drew a traced line as the process line with a separate dash-dot
 * tracer beside it. That needs a path offset by a fixed distance, which this
 * component does not compute. The pattern therefore sits on the process line
 * itself for now.
 */
function PIDConnection({
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
	selected,
	markerEnd,
}: EdgeProps<PIDEdge>) {
	// A P&ID uses right angles, so the corner radius is zero. The ends are
	// rounded to whole pixels. Two ports that sit a fraction of a pixel apart
	// would otherwise produce a short step in a line that should be straight.
	const [route] = getSmoothStepPath({
		sourceX: Math.round(sourceX),
		sourceY: Math.round(sourceY),
		targetX: Math.round(targetX),
		targetY: Math.round(targetY),
		sourcePosition,
		targetPosition,
		borderRadius: 0,
	});

	const kind = edgeKind({ data });

	// Selecting a connection changes its color. The width stays the same, so
	// the drawing does not shift as the selection moves.
	const color = selected ? SELECTED_COLOR : kind === "caption" ? NOTE_COLOR : LINE_COLOR;

	// A heavier line is drawn thicker, and its parallel lines move apart with
	// it, so the whole connection grows rather than only its centre.
	const lineWidth = LINE_WIDTH * (data?.weight ?? 1);
	const drawing = connectionDrawing(route, kind, lineWidth);

	return (
		<>
			{drawing.background ? <Crossing shape={drawing.background} /> : null}

			{drawing.lines.map((line, index) => (
				<BaseEdge
					key={index}
					path={line.path}
					markerEnd={line.arrow ? markerEnd : undefined}
					style={{ stroke: color, strokeWidth: lineWidth, strokeDasharray: line.dashes }}
				/>
			))}
		</>
	);
}

interface ConnectionDrawing {
	/**
	 * The shape filled behind the connection, where it has one.
	 */
	background?: string;

	/**
	 * The lines to stroke, in the order they are drawn.
	 */
	lines: { path: string; dashes?: string; arrow?: boolean }[];
}

/**
 * Returns the lines that make up one connection.
 *
 * The diagram and the sample shown in the palette are both built from this, so
 * the two cannot drift apart.
 *
 * A caption is a single line. A pipe is a centre line. A jacketed pipe adds a
 * line on each side of the centre, stopping them short so that the pipe alone
 * enters the symbol. A traced pipe drops the centre line and keeps the two side
 * lines, one solid and one dash-dot, because the tracer is a separate line
 * running along the pipe.
 *
 * Pass withArrow as false where no arrow is drawn. The jacket then needs only
 * its usual gap, rather than one wide enough to clear an arrow.
 */
function connectionDrawing(
	route: string,
	kind: PIDEdgeKind,
	lineWidth: number,
	withArrow = true,
): ConnectionDrawing {
	if (kind === "caption") {
		return { lines: [{ path: route }] };
	}

	if (kind === "pipe") {
		const lines = parallelLines(route, { spacing: 2 + lineWidth, lineWidth });

		return {
			background: lines.centerBackground,
			lines: [{ path: lines.center, arrow: withArrow }],
		};
	}

	if (kind === "jacketed") {
		const spacing = 2 + lineWidth;

		// The arrow is taller than the jacket is wide, so a jacket ending closer
		// than one spacing behind it appears to run into it.
		const outerEndGap = withArrow ? lineWidth + arrowLength(lineWidth) + spacing : spacing;
		const lines = parallelLines(route, { spacing, lineWidth, outerEndGap });

		return {
			background: lines.fullBackground,
			lines: [{ path: lines.left + lines.right }, { path: lines.center, arrow: withArrow }],
		};
	}

	// Both lines reach the symbol, because one of them is the pipe. Neither
	// carries an arrow: they run beside the centre, so an arrow on one of them
	// would point from the side.
	const lines = parallelLines(route, { spacing: 1 + lineWidth, lineWidth, outerEndGap: 0 });

	return {
		background: lines.fullBackground,
		lines: [{ path: lines.right }, { path: lines.left, dashes: tracerDashes(lineWidth) }],
	};
}

/**
 * Draws a short piece of one connection kind, for the selector in the palette.
 */
function PIDConnectionSample({ kind }: { kind: PIDEdgeKind }) {
	const width = 40;
	const height = 12;
	const middle = height / 2;

	const drawing = connectionDrawing(
		`M 1 ${middle} L ${width - 1} ${middle}`,
		kind,
		LINE_WIDTH,
		false,
	);

	return (
		<svg viewBox={`0 0 ${width} ${height}`} className="h-3 w-10 shrink-0" aria-hidden="true">
			{drawing.lines.map((line, index) => (
				<path
					key={index}
					d={line.path}
					fill="none"
					stroke={kind === "caption" ? NOTE_COLOR : "currentColor"}
					strokeWidth={LINE_WIDTH}
					strokeDasharray={line.dashes}
				/>
			))}
		</svg>
	);
}

/**
 * Fills a shape in the canvas color behind a connection.
 *
 * A line drawn underneath is hidden where the shape covers it. A reader can
 * therefore tell which of two crossing lines passes over the other.
 */
function Crossing({ shape }: { shape: string }) {
	// React Flow styles the paths inside an edge. Without an explicit "none" the
	// shape is outlined as well as filled.
	return (
		<path
			d={shape}
			fill="var(--adacta-color-canvas)"
			stroke="none"
			style={{ pointerEvents: "none" }}
		/>
	);
}

/**
 * Returns how far the arrow at the end of a connection reaches back from its
 * tip.
 *
 * React Flow draws the arrow in a marker 12.5 units wide whose view box is 20
 * units wide, and scales the marker by the width of the line it sits on. The
 * arrow covers 5 of those 20 units behind its tip.
 */
function arrowLength(lineWidth: number): number {
	return 5 * (12.5 / 20) * lineWidth;
}

/**
 * Returns the dash pattern for a tracer line, scaled to the width it is drawn
 * with. The pattern repeats a long dash and a short one.
 */
function tracerDashes(lineWidth: number): string {
	return [5, 2, 1, 1].map((part) => part * lineWidth).join(" ");
}

function PIDSymbolNode({ id, data, selected }: NodeProps<PIDNode>) {
	const ConnectableSymbol = getPIDSymbolComponents(data.kind).ConnectableSymbol;
	const maximumSize = maximumSizeForPIDSymbol(data.kind, 56);

	// A note is its own text. Drawing the palette glyph as well would put a mark
	// on the diagram that stands for nothing.
	if (data.kind === "note") {
		return (
			<div
				className={
					selected
						? "pid-symbol-selected max-w-48 rounded bg-surface/90 px-1 text-xs text-foreground"
						: "max-w-48 rounded bg-surface/90 px-1 text-xs text-foreground"
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
				selected={selected}
				orientation={data.orientation}
				maximumSize={maximumSize}
			/>

			{data.kind === "junction" || data.contained ? null : data.kind === "instrument" ? (
				<span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
					<span className="max-w-full truncate px-1 text-[0.5rem] font-medium">{data.label}</span>
					<span className="max-w-full truncate px-1 text-[0.5rem]">
						{data.secondaryLabel ?? ""}
					</span>
				</span>
			) : (
				<span className="pointer-events-none absolute top-full left-1/2 mt-1 w-max max-w-32 -translate-x-1/2 rounded bg-surface/90 px-1 text-center text-xs font-medium">
					{data.label || "Unnamed"}
				</span>
			)}
		</div>
	);
}
