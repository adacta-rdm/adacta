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
	ConnectionLineType,
	ControlButton,
	Controls,
	MarkerType,
	Panel as ReactFlowPanel,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	useUpdateNodeInternals,
	type Connection,
	type Edge,
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
import { Switch } from "~/catalyst-ui/switch.tsx";

import "@xyflow/react/dist/style.css";

type PIDNodeData = { kind: PIDSymbolKind; label: string; orientation: PIDOrientation };
type PIDNode = Node<PIDNodeData, "pid-symbol">;
type PIDEdge = Edge<Record<string, never>, "step">;

export interface PIDGraph {
	nodes: PIDGraphNode[];
	edges: PIDGraphEdge[];
}

export interface PIDGraphNode {
	id: string;
	kind: PIDSymbolKind;
	label: string;
	orientation: PIDOrientation;
	position: { x: number; y: number };
}

export interface PIDGraphEdge {
	id: string;
	source: string;
	target: string;
	sourceHandle: string | null;
	targetHandle: string | null;
}

type PaletteDrag = {
	pointerId: number;
	kind: PIDSymbolKind;
	startX: number;
	startY: number;
	moved: boolean;
};
type EditorTool = "select" | "pan";

const nodeTypes = { "pid-symbol": PIDSymbolNode };
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
	const displayedEdges = edges.map((edge) => {
		const color = edge.selected ? "var(--adacta-color-accent)" : "var(--adacta-color-foreground)";

		return {
			...edge,
			markerEnd: { type: MarkerType.ArrowClosed, color },
			style: {
				...edge.style,
				stroke: color,
				strokeWidth: edge.selected ? 2 : "var(--pid-line-width)",
			},
		};
	});

	function addNode(kind: PIDSymbolKind, position?: { x: number; y: number }) {
		const symbol = getPIDSymbol(kind);
		const number = nextNodeNumber.current++;
		const id = `pid-node-${crypto.randomUUID()}`;

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
					id: `pid-edge-${crypto.randomUUID()}`,
					type: "step",
					markerEnd: {
						type: MarkerType.ArrowClosed,
						color: "var(--adacta-color-foreground)",
					},
					style: {
						stroke: "var(--adacta-color-foreground)",
						strokeWidth: "var(--pid-line-width)",
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
					onNodesChange={readOnly ? undefined : onNodesChange}
					onEdgesChange={readOnly ? undefined : onEdgesChange}
					onConnect={readOnly ? undefined : connect}
					colorMode="system"
					connectionLineType={ConnectionLineType.Step}
					defaultViewport={{ x: 0, y: 0, zoom: 1 }}
					defaultEdgeOptions={{
						type: "step",
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
							<p className="mt-2 text-sm text-foreground-muted">
								Press Delete, or use the button below.
							</p>
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
		type: "step",
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
