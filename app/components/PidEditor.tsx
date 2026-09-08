import { TrashIcon } from "@heroicons/react/20/solid";
import {
	addEdge,
	Background,
	BackgroundVariant,
	ConnectionLineType,
	Controls,
	MarkerType,
	MiniMap,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	useUpdateNodeInternals,
	type Connection,
	type Edge,
	type Node,
	type NodeProps,
} from "@xyflow/react";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import {
	getPidSymbol,
	PidSymbol,
	pidSymbolGroups,
	type PidOrientation,
	type PidSymbolKind,
} from "~/app/components/PidSymbol.tsx";
import { getPidSymbolComponents } from "~/app/components/pid-symbols/PidSymbolRegistry.ts";
import { Switch } from "~/catalyst-ui/switch.tsx";

import "@xyflow/react/dist/style.css";

type PidNodeData = { kind: PidSymbolKind; label: string; orientation: PidOrientation };
type PidNode = Node<PidNodeData, "pid-symbol">;
type PidEdge = Edge<Record<string, never>, "step">;
type PaletteDrag = {
	pointerId: number;
	kind: PidSymbolKind;
	startX: number;
	startY: number;
	moved: boolean;
};

const nodeTypes = { "pid-symbol": PidSymbolNode };

/**
 * An editable P&ID canvas without revision history or server persistence.
 *
 * The drawing behavior is adapted from the v2 editor. This first version keeps
 * the graph in component state while the node and equipment model is settled.
 */
export function PidEditor() {
	return (
		<ReactFlowProvider>
			<PidEditorContents />
		</ReactFlowProvider>
	);
}

function PidEditorContents() {
	const [nodes, setNodes, onNodesChange] = useNodesState<PidNode>([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState<PidEdge>([]);
	const [selectedNodeId, setSelectedNodeId] = useState<string>();
	const [showGrid, setShowGrid] = useState(false);
	const [dragPreview, setDragPreview] = useState<{
		kind: PidSymbolKind;
		x: number;
		y: number;
	}>();
	const nextNodeNumber = useRef(1);
	const paletteDrag = useRef<PaletteDrag | undefined>(undefined);
	const canvas = useRef<HTMLDivElement>(null);
	const { screenToFlowPosition } = useReactFlow<PidNode, PidEdge>();
	const updateNodeInternals = useUpdateNodeInternals();

	const selectedNode = nodes.find((node) => node.id === selectedNodeId);
	const selectedEdge = edges.find((edge) => edge.selected);
	const displayedEdges = edges.map((edge) => {
		const color = edge.selected ? "var(--adacta-color-accent)" : "var(--adacta-color-foreground)";

		return {
			...edge,
			markerEnd: { type: MarkerType.ArrowClosed, color },
			style: { ...edge.style, stroke: color, strokeWidth: edge.selected ? 2 : 1.5 },
		};
	});

	function addNode(kind: PidSymbolKind, position?: { x: number; y: number }) {
		const symbol = getPidSymbol(kind);
		const number = nextNodeNumber.current++;
		const id = `pid-node-${number}`;

		setNodes((current) => [
			...current.map((node) => ({ ...node, selected: false })),
			{
				id,
				type: "pid-symbol",
				position: position ?? {
					x: 80 + ((number - 1) % 4) * 150,
					y: 70 + Math.floor((number - 1) / 4) * 130,
				},
				data: { kind, label: symbol.label, orientation: 0 },
				selected: true,
			},
		]);
		setEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
		setSelectedNodeId(id);
	}

	function connect(connection: Connection) {
		setEdges((current) =>
			addEdge<PidEdge>(
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
						strokeWidth: 1.5,
					},
				},
				current,
			),
		);
	}

	function startPaletteDrag(event: ReactPointerEvent<HTMLDivElement>, kind: PidSymbolKind) {
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
		setNodes((current) =>
			current.map((node) =>
				node.id === selectedNodeId ? { ...node, data: { ...node.data, label } } : node,
			),
		);
	}

	function orientSelectedNode(orientation: PidOrientation) {
		if (!selectedNodeId) return;

		setNodes((current) =>
			current.map((node) =>
				node.id === selectedNodeId ? { ...node, data: { ...node.data, orientation } } : node,
			),
		);

		// React Flow caches handle positions. Recalculate them after the rotated
		// symbol and its connection points have reached the DOM.
		requestAnimationFrame(() => updateNodeInternals(selectedNodeId));
	}

	function deleteSelectedItem() {
		if (selectedEdge) {
			setEdges((current) => current.filter((edge) => edge.id !== selectedEdge.id));
			return;
		}

		if (!selectedNodeId) return;

		setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
		setEdges((current) =>
			current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId),
		);
		setSelectedNodeId(undefined);
	}

	return (
		<div
			className="mt-6 overflow-hidden rounded-xl border border-border bg-surface"
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
					<PidSymbol kind={dragPreview.kind} className="h-8 w-12" />
				</div>
			) : null}

			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
				<p className="text-sm text-foreground-muted">
					Drag a symbol onto the canvas, then connect its handles. Changes are not saved yet.
				</p>

				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2">
						<span id="pid-grid-label" className="text-sm text-foreground-muted">
							Grid
						</span>
						<Switch aria-labelledby="pid-grid-label" checked={showGrid} onChange={setShowGrid} />
					</div>

					{selectedNode || selectedEdge ? (
						<button
							type="button"
							className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold text-foreground-muted hover:bg-danger-surface hover:text-danger-surface-foreground focus-visible:outline-2 focus-visible:outline-focus"
							onClick={deleteSelectedItem}
						>
							<TrashIcon className="size-4" />
							Delete selected
						</button>
					) : null}
				</div>
			</div>

			<div className="grid min-h-[36rem] grid-cols-1 lg:grid-cols-[15rem_minmax(0,1fr)_13rem]">
				<aside className="border-b border-border p-3 lg:h-[36rem] lg:overflow-y-auto lg:border-r lg:border-b-0">
					<h3 className="text-sm font-semibold text-foreground">Equipment</h3>
					<p className="mt-1 text-xs text-foreground-muted">Click or drag a symbol to add it.</p>

					<div className="mt-4 space-y-5">
						{pidSymbolGroups.map((group) => (
							<section key={group.label}>
								<h4 className="text-xs font-semibold text-foreground-muted">{group.label}</h4>

								<div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-2">
									{group.symbols.map((symbol) => (
										<div
											key={symbol.kind}
											role="button"
											tabIndex={0}
											className="flex min-h-20 touch-none cursor-grab select-none flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface p-2 text-center text-xs text-foreground hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing"
											onKeyDown={(event) => {
												if (event.key !== "Enter" && event.key !== " ") return;

												event.preventDefault();
												addNode(symbol.kind);
											}}
											onPointerDown={(event) => startPaletteDrag(event, symbol.kind)}
										>
											<PidSymbol kind={symbol.kind} className="h-9 w-14" />
											<span>{symbol.label}</span>
										</div>
									))}
								</div>
							</section>
						))}
					</div>
				</aside>

				<div ref={canvas} className="h-[36rem] min-w-0 bg-canvas">
					<ReactFlow<PidNode, PidEdge>
						nodes={nodes}
						edges={displayedEdges}
						nodeTypes={nodeTypes}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={connect}
						onNodeClick={(_, node) => setSelectedNodeId(node.id)}
						onEdgeClick={() => setSelectedNodeId(undefined)}
						onPaneClick={() => setSelectedNodeId(undefined)}
						onNodesDelete={(deleted) => {
							if (deleted.some((node) => node.id === selectedNodeId)) {
								setSelectedNodeId(undefined);
							}
						}}
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
						nodeOrigin={[0.5, 0.5]}
						minZoom={0.25}
						maxZoom={2}
						snapToGrid
						snapGrid={[10, 10]}
					>
						<MiniMap
							maskColor="color-mix(in srgb, var(--adacta-color-canvas) 75%, transparent)"
							nodeColor="var(--adacta-color-surface-muted)"
						/>
						<Controls />
						{showGrid ? (
							<Background
								variant={BackgroundVariant.Lines}
								gap={20}
								color="var(--adacta-color-border)"
							/>
						) : null}
					</ReactFlow>
				</div>

				<aside className="border-t border-border p-4 lg:border-t-0 lg:border-l">
					<h3 className="text-sm font-semibold text-foreground">
						{selectedNode ? "Selected node" : selectedEdge ? "Selected connection" : "Selection"}
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
							Press Delete or use the action above to remove this connection.
						</p>
					) : (
						<p className="mt-2 text-sm text-foreground-muted">Select a node to edit its label.</p>
					)}
				</aside>
			</div>
		</div>
	);
}

function PidSymbolNode({ id, data, selected }: NodeProps<PidNode>) {
	const ConnectableSymbol = getPidSymbolComponents(data.kind).ConnectableSymbol;

	return (
		<div className="group/pid-node flex flex-col items-center text-foreground">
			<ConnectableSymbol
				nodeId={id}
				selected={selected}
				orientation={data.orientation}
				maximumSize={56}
			/>
			<span className="mt-1 max-w-32 rounded bg-surface/90 px-1 text-center text-xs font-medium">
				{data.label || "Unnamed"}
			</span>
		</div>
	);
}
