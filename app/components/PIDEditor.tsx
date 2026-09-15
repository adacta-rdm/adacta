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
	pidSymbolGroups,
	type PIDOrientation,
	type PIDSymbolKind,
} from "~/app/components/PIDSymbol.tsx";
import { getPIDSymbolComponents } from "~/app/components/pid-symbols/PIDSymbolRegistry.ts";
import type { PIDEdgeKind, PIDGraph } from "~/app/lib/PID.ts";
import { Switch } from "~/catalyst-ui/switch.tsx";

import "@xyflow/react/dist/style.css";

type PIDNodeData = { kind: PIDSymbolKind; label: string; orientation: PIDOrientation };
type PIDNode = Node<PIDNodeData, "pid-symbol">;
type PIDEdgeData = { kind: PIDEdgeKind };
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
 * Returns the arrow drawn at the end of a connection.
 *
 * A pipe and a jacketed pipe both indicate the direction of flow. A caption
 * line attaches a note to a symbol. It therefore carries no arrow.
 */
function arrowFor(kind: PIDEdgeKind, color: string): EdgeMarker | undefined {
	if (kind === "caption") return undefined;

	// An SVG marker scales with the width of its stroke by default. The jacket
	// uses a wide stroke. A fixed size therefore keeps this arrow the same size
	// as the arrow on a pipe.
	if (kind === "jacketed") {
		return {
			type: MarkerType.ArrowClosed,
			color,
			width: 19,
			height: 19,
			markerUnits: "userSpaceOnUse",
		};
	}

	return { type: MarkerType.ArrowClosed, color };
}

/**
 * Each kind of connection is shown under this name in the editor.
 */
const edgeKindLabels: Record<PIDEdgeKind, string> = {
	pipe: "Pipe",
	jacketed: "Jacketed",
	caption: "Caption",
};
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
		const color = edge.selected ? "var(--adacta-color-accent)" : "var(--adacta-color-foreground)";

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
				data: { kind, label: symbol.label, orientation: 0 },
				selected: true,
			},
		]);
		setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
	}

	function connect(connection: Connection) {
		setEdges((current) =>
			addEdge<PIDEdge>(
				{
					...connection,
					id: randomId("pid-edge"),
					type: "pid-connection",
					data: { kind: "pipe" },
					markerEnd: {
						type: MarkerType.ArrowClosed,
						color: "var(--adacta-color-foreground)",
					},
				},
				current,
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
			current.map((edge) => (edge.id === selectedEdge.id ? { ...edge, data: { kind } } : edge)),
		);
	}

	function deleteSelectedItems() {
		const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
		const selectedEdgeIds = new Set(selectedEdges.map((edge) => edge.id));

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
							color: "var(--adacta-color-foreground)",
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
									<span className="text-xs font-medium text-foreground-muted">Label</span>
									<input
										value={selectedNode.data.label}
										onChange={(event) => renameSelectedNode(event.target.value)}
										className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
									/>
								</label>

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
									{(["pipe", "jacketed", "caption"] as const).map((kind) => (
										<button
											key={kind}
											type="button"
											aria-pressed={edgeKind(selectedEdge) === kind}
											className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:font-semibold focus-visible:outline-2 focus-visible:outline-focus"
											onClick={() => setSelectedEdgeKind(kind)}
										>
											{edgeKindLabels[kind]}
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
	return value.nodes.map((node) => ({
		id: node.id,
		type: "pid-symbol",
		position: { ...node.position },
		data: {
			kind: node.kind,
			label: node.label,
			orientation: node.orientation,
		},
	}));
}

function editorEdges(value: PIDGraph): PIDEdge[] {
	return value.edges.map((edge) => ({
		id: edge.id,
		type: "pid-connection",
		data: { kind: edge.kind },
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
			orientation: node.data.orientation,
			position: { ...node.position },
		})),
		edges: edges.map((edge) => ({
			id: edge.id,
			kind: edgeKind(edge),
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
 * remain visible. A caption line is dashed, because it carries no process
 * fluid.
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
	// A P&ID uses right angles. The corner radius is therefore zero.
	const [path] = getSmoothStepPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		borderRadius: 0,
	});

	const kind = edgeKind({ data });
	const color = selected ? "var(--adacta-color-accent)" : "var(--adacta-color-foreground)";
	const width = selected ? 2 : "var(--pid-line-width)";

	if (kind === "jacketed") {
		return (
			<>
				<BaseEdge path={path} markerEnd={markerEnd} style={{ stroke: color, strokeWidth: 5 }} />
				<BaseEdge path={path} style={{ stroke: "var(--adacta-color-canvas)", strokeWidth: 2 }} />
			</>
		);
	}

	return (
		<BaseEdge
			path={path}
			markerEnd={markerEnd}
			style={{
				stroke: color,
				strokeWidth: width,
				strokeDasharray: kind === "caption" ? "4 3" : undefined,
			}}
		/>
	);
}

function PIDSymbolNode({ id, data, selected }: NodeProps<PIDNode>) {
	const ConnectableSymbol = getPIDSymbolComponents(data.kind).ConnectableSymbol;
	const maximumSize = maximumSizeForPIDSymbol(data.kind, 56);

	return (
		<div className="group/pid-node relative inline-flex items-center justify-center text-foreground">
			<ConnectableSymbol
				nodeId={id}
				selected={selected}
				orientation={data.orientation}
				maximumSize={maximumSize}
			/>
			<span className="pointer-events-none absolute top-full left-1/2 mt-1 w-max max-w-32 -translate-x-1/2 rounded bg-surface/90 px-1 text-center text-xs font-medium">
				{data.label || "Unnamed"}
			</span>
		</div>
	);
}
