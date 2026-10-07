import {
	ArrowsPointingInIcon,
	ArrowsPointingOutIcon,
	ChevronDownIcon,
	MagnifyingGlassIcon,
	TrashIcon,
	XMarkIcon,
} from "@heroicons/react/20/solid";
import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	Background,
	BackgroundVariant,
	ConnectionMode,
	ConnectionLineType,
	ControlButton,
	Controls,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	useUpdateNodeInternals,
	useViewport,
	type Connection,
	type EdgeChange,
	type InternalNode,
	type NodeChange,
	type NodeOrigin,
	type NodePositionChange,
	type XYPosition,
} from "@xyflow/react";
import {
	useEffect,
	useRef,
	useState,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from "react";

import { PIDConnection, PIDConnectionSample } from "~/app/components/PIDEditorConnections.tsx";
import { PIDEditorDebugPanel } from "~/app/components/PIDEditorDebugPanel.tsx";
import { PIDSymbolNode } from "~/app/components/PIDEditorSymbolNode.tsx";
import { PIDEditorToolbar } from "~/app/components/PIDEditorToolbar.tsx";
import {
	getPIDAnchorAlignment,
	PID_HELPER_LINE_SNAP_DISTANCE,
	PIDHelperLinesRenderer,
	type PIDHelperAnchor,
	type PIDHelperLines,
} from "~/app/components/PIDHelperLines.tsx";
import {
	getPIDSymbol,
	PIDSymbol,
	pidInstrumentPresets,
	pidSymbolGroups,
	type PIDOrientation,
	type PIDSymbolKind,
} from "~/app/components/PIDSymbol.tsx";
import { PIDHandleVisibilityContext } from "~/app/components/pid-symbols/ConnectablePIDSymbol.tsx";
import {
	PID_EDGE_KINDS,
	PID_LENGTH_UNITS,
	type PIDEdgeKind,
	type PIDGraph,
	type PIDInletCount,
	type PIDLength,
	type PIDLengthUnit,
} from "~/app/lib/PID.ts";
import {
	copyPIDSubgraph,
	instantiatePIDClipboard,
	type PIDClipboardFragment,
} from "~/app/lib/PIDClipboard.ts";
import {
	arrowsAfterKindChange,
	defaultEndArrow,
	moveArrowPosition,
	nextArrowPosition,
	removeArrowPosition,
} from "~/app/lib/PIDEdgeArrows.ts";
import {
	edgeData,
	edgeKind,
	editorEdges,
	editorNodes,
	holdersFirst,
	pidGraph,
	withContents,
	type PIDEdge,
	type PIDEdgeData,
	type PIDNode,
} from "~/app/lib/PIDEditorGraph.ts";
import {
	clonePIDGraph,
	commitPIDHistory,
	createPIDHistory,
	pidGraphsEqual,
	redoPIDHistory,
	type PIDHistory,
	undoPIDHistory,
} from "~/app/lib/PIDHistory.ts";
import {
	alignPIDBoxes,
	countPIDLayoutCollisions,
	distributePIDBoxes,
	hasPIDLayoutMovement,
	nudgePIDNodes,
	PID_GRID_SIZE,
	snapPIDPosition,
	type PIDAlignment,
	type PIDDistributionAxis,
	type PIDLayoutDelta,
} from "~/app/lib/PIDLayout.ts";
import { Switch } from "~/catalyst-ui/switch.tsx";

import "@xyflow/react/dist/style.css";

type PaletteDrag = {
	pointerId: number;
	kind: PIDSymbolKind;
	startX: number;
	startY: number;
	moved: boolean;
};
type EditorTool = "select" | "pan";
type HelperLineSession = {
	nodeId: string;
	startPosition: XYPosition;
	movingAnchors: PIDHelperAnchor[];
	stationaryAnchors: PIDHelperAnchor[];
};

const nodeTypes = { "pid-symbol": PIDSymbolNode };

export { connectionDrawing } from "~/app/components/PIDEditorConnections.tsx";
const edgeTypes = { "pid-connection": PIDConnection };
const PID_NUDGE_STEP = PID_GRID_SIZE;
const PID_LARGE_NUDGE_STEP = PID_GRID_SIZE * 5;

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
export function PIDEditor({
	value,
	readOnly = false,
	onChange,
	onSymbolClick,
	selectedSymbolKey,
	actions,
	equipment = [],
	samples = [],
}: PIDEditorProps) {
	return (
		<ReactFlowProvider>
			<PIDEditorContents
				value={value}
				readOnly={readOnly}
				onChange={onChange}
				onSymbolClick={onSymbolClick}
				selectedSymbolKey={selectedSymbolKey}
				actions={actions}
				equipment={equipment}
				samples={samples}
			/>
		</ReactFlowProvider>
	);
}

export interface PIDEquipmentOption {
	id: number;
	name: string;
	productName: string | null;
}

export interface PIDSampleOption {
	id: number;
	name: string;
	batchName: string;
}

export interface PIDEditorProps {
	value: PIDGraph;
	readOnly?: boolean;
	onChange?: (value: PIDGraph) => void;
	onSymbolClick?: (key: string | null) => void;
	selectedSymbolKey?: string | null;

	/**
	 * Controls shown at the right of the tool bar, such as saving the diagram.
	 *
	 * They belong to the editor rather than to the page around it, because the
	 * canvas can be made to fill the window. A control left on the page would
	 * be out of reach for as long as it did.
	 */
	actions?: ReactNode;
	equipment?: PIDEquipmentOption[];
	samples?: PIDSampleOption[];
}

function PIDEditorContents({
	value,
	readOnly,
	onChange,
	onSymbolClick,
	selectedSymbolKey,
	actions,
	equipment = [],
	samples = [],
}: PIDEditorProps & { readOnly: boolean }) {
	const [nodes, setNodes] = useNodesState<PIDNode>(editorNodes(value));
	const [edges, setEdges] = useEdgesState<PIDEdge>(editorEdges(value));
	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const [history, setHistory] = useState<PIDHistory>(createPIDHistory);
	const historyRef = useRef(history);
	const openHistoryGroup = useRef<PIDGraph | undefined>(undefined);
	const pressedNudgeKeys = useRef(new Set<string>());
	const [clipboard, setClipboard] = useState<PIDClipboardFragment>();
	const pasteCount = useRef(0);
	const externalValue = useRef(clonePIDGraph(value));
	const reportedValue = useRef(clonePIDGraph(value));

	// The kind given to the next connection drawn. It stays as chosen until it
	// is changed, so a run of jacketed pipes needs one choice rather than one
	// per line.
	const [nextEdgeKind, setNextEdgeKind] = useState<PIDEdgeKind>("pipe");
	const [showGrid, setShowGrid] = useState(false);
	const [showHandles, setShowHandles] = useState(false);

	// Whether the diagram covers the window. A P&ID is read as a whole, and a
	// large one does not fit beside the rest of the page.
	const [expanded, setExpanded] = useState(false);

	// Whether a symbol is being dragged. The cursor is held at the closed hand
	// while this is true. See the "pid-editor--dragging" rule in app.css.
	const [dragging, setDragging] = useState(false);
	const [helperLines, setHelperLines] = useState<PIDHelperLines>({});

	// The symbol that would hold the one being dragged, if it were released
	// now. It is outlined while the drag lasts, so the reader sees what is
	// about to happen before it happens.
	const [holderCandidate, setHolderCandidate] = useState<string>();
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
	const editor = useRef<HTMLDivElement>(null);
	const canvas = useRef<HTMLDivElement>(null);
	const helperLineSession = useRef<HelperLineSession | undefined>(undefined);
	const { screenToFlowPosition, zoomTo, getInternalNode } = useReactFlow<PIDNode, PIDEdge>();
	const { zoom } = useViewport();
	const updateNodeInternals = useUpdateNodeInternals();

	useEffect(() => {
		if (pidGraphsEqual(value, externalValue.current)) return;
		if (pidGraphsEqual(value, reportedValue.current)) {
			externalValue.current = clonePIDGraph(value);
			return;
		}

		externalValue.current = clonePIDGraph(value);
		const nextNodes = editorNodes(value);
		const nextEdges = editorEdges(value);
		const nextHistory = createPIDHistory();
		nodesRef.current = nextNodes;
		edgesRef.current = nextEdges;
		historyRef.current = nextHistory;
		setNodes(nextNodes);
		setEdges(nextEdges);
		setHistory(nextHistory);
		setClipboard(undefined);
		openHistoryGroup.current = undefined;
		pasteCount.current = 0;
		nextNodeNumber.current = value.nodes.length + 1;
	}, [setEdges, setNodes, value]);

	useEffect(() => {
		const graph = pidGraph(nodes, edges);
		reportedValue.current = clonePIDGraph(graph);
		onChange?.(graph);
	}, [edges, nodes, onChange]);

	// While the diagram covers the window, Escape returns it to the page and
	// the page behind it is held still.
	useEffect(() => {
		if (!expanded) return;

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		function onKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") setExpanded(false);
		}

		document.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = previousOverflow;
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [expanded]);

	const selectedNodes = nodes.filter((node) => node.selected);
	const selectedEdges = edges.filter((edge) => edge.selected);
	const selectedLayoutBoxes = selectedNodes.flatMap((node) => {
		if (node.parentId !== undefined) return [];

		const box = symbolBox(node.id);
		return box ? [{ id: node.id, ...box }] : [];
	});
	const selectedItemCount = selectedNodes.length + selectedEdges.length;
	const selectedNode = selectedItemCount === 1 ? selectedNodes[0] : undefined;
	const selectedEdge = selectedItemCount === 1 ? selectedEdges[0] : undefined;
	const selectionSummary = [
		selectionPart(selectedNodes.length, "symbol"),
		selectionPart(selectedEdges.length, "connection"),
	]
		.filter(Boolean)
		.join(" · ");
	const selectionTitle = selectedNode
		? "Selected symbol"
		: selectedEdge
			? "Selected connection"
			: selectedEdges.length === 0
				? `${selectionPart(selectedNodes.length, "symbol")} selected`
				: selectedNodes.length === 0
					? `${selectionPart(selectedEdges.length, "connection")} selected`
					: `${selectedItemCount} items selected`;
	const hasMixedSelection = selectedNodes.length > 0 && selectedEdges.length > 0;
	const normalizedPaletteFilter = paletteFilter.trim().toLocaleLowerCase();
	const visibleSymbolGroups = pidSymbolGroups
		.map((group) => ({
			...group,
			symbols: group.symbols.filter((symbol) =>
				symbol.label.toLocaleLowerCase().includes(normalizedPaletteFilter),
			),
		}))
		.filter((group) => group.symbols.length > 0);
	// The symbol a dragged symbol would be put inside is outlined. React Flow
	// puts the class on the element it draws for the symbol.
	const helperNodeRoles = new Map<string, "moving" | "target">();
	for (const line of [helperLines.horizontal, helperLines.vertical]) {
		if (!line) continue;

		helperNodeRoles.set(line.moving.nodeId, "moving");
		for (const anchor of line.alignedStationary) {
			helperNodeRoles.set(anchor.nodeId, "target");
		}
	}
	const displayedNodes = nodes.map((node) => {
		const classes = [
			node.id === holderCandidate ? "pid-symbol-holder" : "",
			helperNodeRoles.get(node.id) === "moving" ? "pid-symbol-helper-moving" : "",
			helperNodeRoles.get(node.id) === "target" ? "pid-symbol-helper-target" : "",
		].filter(Boolean);

		const highlighted = readOnly && selectedSymbolKey && node.data.symbolKey === selectedSymbolKey;
		return classes.length === 0 && !highlighted
			? node
			: { ...node, className: classes.join(" "), selected: highlighted || node.selected };
	});
	const displayedEdges = edges;
	const canUndo = history.past.length > 0;
	const canRedo = history.future.length > 0;
	const canCopySelection = selectedNodes.length > 0;
	const canPaste = clipboard !== undefined;
	const canAlignSelection = selectedLayoutBoxes.length >= 2;
	const canDistributeSelection = selectedLayoutBoxes.length >= 3;
	const alignmentLayouts: Record<PIDAlignment, PIDLayoutDelta[]> = {
		left: alignPIDBoxes(selectedLayoutBoxes, "left"),
		right: alignPIDBoxes(selectedLayoutBoxes, "right"),
		top: alignPIDBoxes(selectedLayoutBoxes, "top"),
		bottom: alignPIDBoxes(selectedLayoutBoxes, "bottom"),
	};
	const distributionLayouts: Record<PIDDistributionAxis, PIDLayoutDelta[]> = {
		horizontal: distributePIDBoxes(selectedLayoutBoxes, "horizontal"),
		vertical: distributePIDBoxes(selectedLayoutBoxes, "vertical"),
	};
	const alignmentChanges = {
		left: hasPIDLayoutMovement(alignmentLayouts.left),
		right: hasPIDLayoutMovement(alignmentLayouts.right),
		top: hasPIDLayoutMovement(alignmentLayouts.top),
		bottom: hasPIDLayoutMovement(alignmentLayouts.bottom),
	};
	const distributionChanges = {
		horizontal: hasPIDLayoutMovement(distributionLayouts.horizontal),
		vertical: hasPIDLayoutMovement(distributionLayouts.vertical),
	};
	const alignmentCollisions = {
		left: countPIDLayoutCollisions(selectedLayoutBoxes, alignmentLayouts.left),
		right: countPIDLayoutCollisions(selectedLayoutBoxes, alignmentLayouts.right),
		top: countPIDLayoutCollisions(selectedLayoutBoxes, alignmentLayouts.top),
		bottom: countPIDLayoutCollisions(selectedLayoutBoxes, alignmentLayouts.bottom),
	};
	const distributionCollisions = {
		horizontal: countPIDLayoutCollisions(selectedLayoutBoxes, distributionLayouts.horizontal),
		vertical: countPIDLayoutCollisions(selectedLayoutBoxes, distributionLayouts.vertical),
	};

	function replaceNodes(next: PIDNode[]) {
		nodesRef.current = next;
		setNodes(next);
	}

	function replaceEdges(next: PIDEdge[]) {
		edgesRef.current = next;
		setEdges(next);
	}

	function changeCurrentNodes(change: (current: PIDNode[]) => PIDNode[]) {
		replaceNodes(change(nodesRef.current));
	}

	function changeCurrentEdges(change: (current: PIDEdge[]) => PIDEdge[]) {
		replaceEdges(change(edgesRef.current));
	}

	function setHistoryValue(next: PIDHistory) {
		historyRef.current = next;
		setHistory(next);
	}

	function currentGraph() {
		return pidGraph(nodesRef.current, edgesRef.current);
	}

	function beginHistoryGroup() {
		openHistoryGroup.current ??= currentGraph();
	}

	function finishHistoryGroup() {
		const before = openHistoryGroup.current;
		if (!before) return;

		openHistoryGroup.current = undefined;
		setHistoryValue(commitPIDHistory(historyRef.current, before, currentGraph()));
	}

	function performEdit(edit: () => void) {
		if (openHistoryGroup.current) {
			edit();
			return;
		}

		const before = currentGraph();
		edit();
		setHistoryValue(commitPIDHistory(historyRef.current, before, currentGraph()));
	}

	function restoreGraph(graph: PIDGraph) {
		const selectedNodeIds = new Set(
			nodesRef.current.filter((node) => node.selected).map((node) => node.id),
		);
		const selectedEdgeIds = new Set(
			edgesRef.current.filter((edge) => edge.selected).map((edge) => edge.id),
		);
		const restoredNodes = editorNodes(graph).map((node) => ({
			...node,
			selected: selectedNodeIds.has(node.id),
		}));
		const restoredEdges = editorEdges(graph).map((edge) => ({
			...edge,
			selected: selectedEdgeIds.has(edge.id),
		}));

		replaceNodes(restoredNodes);
		replaceEdges(restoredEdges);
		requestAnimationFrame(() => updateNodeInternals(restoredNodes.map((node) => node.id)));
	}

	function undo() {
		finishHistoryGroup();
		const step = undoPIDHistory(historyRef.current, currentGraph());
		if (!step.graph) return;

		setHistoryValue(step.history);
		restoreGraph(step.graph);
	}

	function redo() {
		finishHistoryGroup();
		const step = redoPIDHistory(historyRef.current, currentGraph());
		if (!step.graph) return;

		setHistoryValue(step.history);
		restoreGraph(step.graph);
	}

	function applyLayout(deltas: PIDLayoutDelta[]) {
		if (deltas.length === 0) return;

		const deltaById = new Map(deltas.map((delta) => [delta.id, delta]));
		performEdit(() => {
			changeCurrentNodes((current) =>
				current.map((node) => {
					const delta = deltaById.get(node.id);
					if (!delta) return node;

					return {
						...node,
						position: {
							x: node.position.x + delta.x,
							y: node.position.y + delta.y,
						},
					};
				}),
			);
		});

		setHelperLines({});
		setHolderCandidate(undefined);
		requestAnimationFrame(() => updateNodeInternals(deltas.map((delta) => delta.id)));
	}

	function alignSelectedNodes(alignment: PIDAlignment) {
		if (!canAlignSelection || alignmentCollisions[alignment] > 0 || !alignmentChanges[alignment]) {
			return;
		}
		applyLayout(alignmentLayouts[alignment]);
	}

	function distributeSelectedNodes(axis: PIDDistributionAxis) {
		if (!canDistributeSelection || distributionCollisions[axis] > 0 || !distributionChanges[axis]) {
			return;
		}
		applyLayout(distributionLayouts[axis]);
	}

	function nudgeSelectedNodes(movement: XYPosition) {
		const currentNodes = nodesRef.current;
		const deltas = nudgePIDNodes(
			currentNodes.map((node) => {
				const internal = getInternalNode(node.id);

				return {
					id: node.id,
					parentId: node.parentId,
					position: node.position,
					width: internal?.measured.width,
					height: internal?.measured.height,
				};
			}),
			currentNodes.filter((node) => node.selected).map((node) => node.id),
			movement,
		);

		if (hasPIDLayoutMovement(deltas)) applyLayout(deltas);
	}

	function selectedClipboardFragment(): PIDClipboardFragment | undefined {
		const detachedRootPositions = new Map(
			selectedNodes.flatMap((node) => {
				const box = symbolBox(node.id);
				return box
					? [[node.id, { x: box.x + box.width / 2, y: box.y + box.height / 2 }] as const]
					: [];
			}),
		);

		return copyPIDSubgraph(
			currentGraph(),
			selectedNodes.map((node) => node.id),
			detachedRootPositions,
		);
	}

	function insertClipboardFragment(fragment: PIDClipboardFragment, offset: number) {
		const pasted = instantiatePIDClipboard(
			fragment,
			(kind) => randomId(kind === "node" ? "pid-node" : "pid-edge"),
			{ x: offset, y: offset },
		);
		const pastedNodes = editorNodes({ nodes: pasted.nodes, edges: [] }).map((node) => ({
			...node,
			selected: true,
		}));
		const pastedEdges = editorEdges({ nodes: [], edges: pasted.edges });

		performEdit(() => {
			changeCurrentNodes((current) =>
				holdersFirst([...current.map((node) => ({ ...node, selected: false })), ...pastedNodes]),
			);
			changeCurrentEdges((current) => [
				...current.map((edge) => ({ ...edge, selected: false })),
				...pastedEdges,
			]);
		});

		setHelperLines({});
		setHolderCandidate(undefined);
		requestAnimationFrame(() => updateNodeInternals(pastedNodes.map((node) => node.id)));
	}

	function duplicateSelection() {
		const fragment = selectedClipboardFragment();
		if (!fragment) return;

		insertClipboardFragment(fragment, 20);
	}

	function copySelection() {
		const fragment = selectedClipboardFragment();
		if (!fragment) return;

		setClipboard(fragment);
		pasteCount.current = 0;
	}

	function pasteClipboard() {
		if (!clipboard) return;

		pasteCount.current += 1;
		insertClipboardFragment(clipboard, pasteCount.current * 20);
	}

	function addNode(kind: PIDSymbolKind, position?: { x: number; y: number }) {
		const symbol = getPIDSymbol(kind);
		const number = nextNodeNumber.current++;
		const id = randomId("pid-node");
		const snappedPosition = position ? snapPIDPosition(position) : undefined;

		performEdit(() => {
			changeCurrentNodes((current) => [
				...current.map((node) => ({ ...node, selected: false })),
				{
					id,
					type: "pid-symbol",
					position: snappedPosition ?? {
						x: 160 + ((number - 1) % 3) * 150,
						y: 120 + Math.floor((number - 1) / 3) * 130,
					},
					data: {
						kind,
						label: symbol.label,
						symbolKey: null,
						equipmentId: null,
						sampleId: null,
						secondaryLabel: null,
						contained: false,
						inletCount: 1,
						orientation: 0,
					},
					selected: true,
				},
			]);
			changeCurrentEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
		});
	}

	function connect(connection: Connection) {
		// The new connection is selected, so the inspector opens on it and its
		// kind can be set without hunting for it again.
		performEdit(() => {
			changeCurrentNodes((current) => current.map((node) => ({ ...node, selected: false })));

			changeCurrentEdges((current) =>
				addEdge<PIDEdge>(
					{
						...connection,
						id: randomId("pid-edge"),
						type: "pid-connection",
						data: {
							kind: nextEdgeKind,
							endArrow: defaultEndArrow(nextEdgeKind),
							arrowPositions: [],
							weight: 1,
							material: null,
							innerDiameter: null,
							outerDiameter: null,
							length: null,
						},
						selected: true,
					},
					current.map((edge) => ({ ...edge, selected: false })),
				),
			);
		});
	}

	function validConnection(connection: Connection | PIDEdge) {
		if (connection.source === connection.target) return false;

		return (
			connectionEndAllows(connection.source, connection.sourceHandle, "source") &&
			connectionEndAllows(connection.target, connection.targetHandle, "target")
		);
	}

	function connectionEndAllows(
		nodeId: string,
		handleId: string | null | undefined,
		role: "source" | "target",
	) {
		const node = getInternalNode(nodeId);
		if (!node || !handleId) return false;
		if (node.data.kind === "junction") return true;

		return node.internals.handleBounds?.[role]?.some((handle) => handle.id === handleId) ?? false;
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

		performEdit(() => {
			changeCurrentNodes((current) =>
				current.map((node) =>
					node.id === selectedNode.id ? { ...node, data: { ...node.data, label } } : node,
				),
			);
		});
	}

	function updateSelectedNode(update: Partial<PIDNode["data"]>) {
		if (!selectedNode) return;
		performEdit(() => {
			changeCurrentNodes((current) =>
				current.map((node) =>
					node.id === selectedNode.id ? { ...node, data: { ...node.data, ...update } } : node,
				),
			);
		});
	}

	function setSelectedNodeTag(secondaryLabel: string) {
		if (!selectedNode) return;

		performEdit(() => {
			changeCurrentNodes((current) =>
				current.map((node) =>
					node.id === selectedNode.id
						? { ...node, data: { ...node.data, secondaryLabel: secondaryLabel || null } }
						: node,
				),
			);
		});
	}

	function orientSelectedNode(orientation: PIDOrientation) {
		if (!selectedNode) return;

		performEdit(() => {
			changeCurrentNodes((current) =>
				current.map((node) =>
					node.id === selectedNode.id ? { ...node, data: { ...node.data, orientation } } : node,
				),
			);
		});

		// React Flow caches handle positions. Recalculate them after the rotated
		// symbol and its connection points have reached the DOM.
		requestAnimationFrame(() => updateNodeInternals(selectedNode.id));
	}

	function setSelectedNodeInletCount(inletCount: PIDInletCount) {
		if (!selectedNode || selectedNode.data.kind !== "three-way-valve") return;
		if (selectedNode.data.inletCount === inletCount) return;

		performEdit(() => {
			changeCurrentNodes((current) =>
				current.map((node) =>
					node.id === selectedNode.id ? { ...node, data: { ...node.data, inletCount } } : node,
				),
			);
			changeCurrentEdges((current) =>
				current.filter(
					(edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id,
				),
			);
		});

		// Changing the count reverses every handle. Recalculate them after React
		// has rendered the new source and target roles.
		requestAnimationFrame(() => updateNodeInternals(selectedNode.id));
	}

	/**
	 * Returns where a symbol sits on the canvas, measured from its top left
	 * corner. Returns undefined before React Flow has measured the symbol.
	 */
	function symbolBox(id: string) {
		const internal = getInternalNode(id);
		if (!internal) return undefined;

		const { x, y } = internal.internals.positionAbsolute;

		return {
			x,
			y,
			width: internal.measured.width ?? 0,
			height: internal.measured.height ?? 0,
		};
	}

	/**
	 * Returns the symbol that would hold the given one, or undefined when none
	 * would.
	 *
	 * A symbol is held by the one its centre lies within. Only a larger symbol
	 * qualifies, because two symbols of the same size overlap rather than
	 * contain one another. The smallest qualifying symbol wins, so releasing a
	 * thermocouple over a vessel that already holds a catalyst bed attaches it
	 * to the bed.
	 */
	function holderUnder(dragged: PIDNode): string | undefined {
		const box = symbolBox(dragged.id);
		const center = nodeCanvasCenter(dragged);
		if (!box || !center) return undefined;

		const area = box.width * box.height;

		// A symbol cannot be held by itself or by anything it holds.
		const excluded = withContents(nodes, [dragged.id]);

		let best: { id: string; area: number } | undefined;

		for (const node of nodes) {
			if (excluded.has(node.id)) continue;

			// A note is a piece of text rather than a body, so nothing sits
			// inside it.
			if (node.data.kind === "note") continue;

			const other = symbolBox(node.id);
			if (!other) continue;

			if (center.x < other.x || center.x > other.x + other.width) continue;
			if (center.y < other.y || center.y > other.y + other.height) continue;

			const otherArea = other.width * other.height;
			if (otherArea <= area) continue;

			if (best === undefined || otherArea < best.area) best = { id: node.id, area: otherArea };
		}

		return best?.id;
	}

	/**
	 * Return a node's stored center in canvas coordinates.
	 */
	function nodeCanvasCenter(node: PIDNode): XYPosition | undefined {
		if (node.parentId === undefined) return node.position;

		const parent = symbolBox(node.parentId);
		if (!parent) return undefined;

		return { x: parent.x + node.position.x, y: parent.y + node.position.y };
	}

	/**
	 * Puts a symbol inside another, so that it travels with it.
	 *
	 * The position of a held symbol is measured from the corner of the symbol
	 * that holds it. The symbol therefore keeps the place on the canvas where
	 * it was released.
	 */
	function holdNode(heldNode: PIDNode, holderId: string) {
		const center = nodeCanvasCenter(heldNode);
		const holder = symbolBox(holderId);
		if (!center || !holder) return;

		const position = {
			x: center.x - holder.x,
			y: center.y - holder.y,
		};

		performEdit(() => {
			changeCurrentNodes((current) =>
				holdersFirst(
					current.map((node) =>
						node.id === heldNode.id
							? {
									...node,
									parentId: holderId,
									extent: "parent" as const,
									position,
									data: { ...node.data, contained: true },
								}
							: node,
					),
				),
			);
		});
	}

	/**
	 * Takes the selected symbol out of the one holding it. The symbol stays
	 * where it is on the canvas and stops travelling with its former holder.
	 */
	function releaseSelectedNode() {
		if (!selectedNode) return;

		const box = symbolBox(selectedNode.id);
		if (!box) return;

		const position = snapPIDPosition({
			x: box.x + box.width / 2,
			y: box.y + box.height / 2,
		});

		performEdit(() => {
			changeCurrentNodes((current) =>
				holdersFirst(
					current.map((node) =>
						node.id === selectedNode.id
							? {
									...node,
									parentId: undefined,
									extent: undefined,
									position,
									data: { ...node.data, contained: false },
								}
							: node,
					),
				),
			);
		});
	}

	function dragNode(node: PIDNode, dragged: PIDNode[]) {
		// A group of symbols moves as it is. Only a single symbol is put inside
		// another, because a group has no one position to judge.
		setHolderCandidate(dragged.length === 1 ? holderUnder(node) : undefined);
	}

	function startNodeDrag(node: PIDNode, dragged: PIDNode[]) {
		beginHistoryGroup();
		setDragging(true);
		setHelperLines({});
		helperLineSession.current =
			dragged.length === 1 ? createHelperLineSession(node, nodes, getInternalNode) : undefined;
	}

	function changeNodes(changes: NodeChange<PIDNode>[]) {
		const snappedChanges = changes.map((change) => {
			if (change.type !== "position" || !change.position) return change;

			const node = getInternalNode(change.id);
			const parent = node?.parentId ? getInternalNode(node.parentId) : undefined;
			const canvasOffset = parent?.internals.positionAbsolute ?? { x: 0, y: 0 };

			return { ...change, position: snapPIDPosition(change.position, canvasOffset) };
		});
		const session = helperLineSession.current;
		const draggedChanges = snappedChanges.filter(
			(change): change is NodePositionChange =>
				change.type === "position" && Boolean(change.dragging && change.position),
		);

		if (!session || draggedChanges.length !== 1 || draggedChanges[0].id !== session.nodeId) {
			if (draggedChanges.length > 0) setHelperLines({});
			applyNodeChange(snappedChanges);
			return;
		}

		const draggedChange = draggedChanges[0];
		const draggedPosition = draggedChange.position;
		if (!draggedPosition) return;

		const movement = {
			x: draggedPosition.x - session.startPosition.x,
			y: draggedPosition.y - session.startPosition.y,
		};
		const movingAnchors = session.movingAnchors.map((anchor) => ({
			...anchor,
			x: anchor.x + movement.x,
			y: anchor.y + movement.y,
		}));
		const alignment = getPIDAnchorAlignment(
			movingAnchors,
			session.stationaryAnchors,
			PID_HELPER_LINE_SNAP_DISTANCE / zoom,
		);
		const node = getInternalNode(session.nodeId);
		const parent = node?.parentId ? getInternalNode(node.parentId) : undefined;
		const canvasOffset = parent?.internals.positionAbsolute ?? { x: 0, y: 0 };
		const helperPosition = {
			x: draggedPosition.x + alignment.delta.x,
			y: draggedPosition.y + alignment.delta.y,
		};
		const gridPosition = snapPIDPosition(helperPosition, canvasOffset);
		const acceptsHorizontalCorrection = Math.abs(helperPosition.x - gridPosition.x) < 0.001;
		const acceptsVerticalCorrection = Math.abs(helperPosition.y - gridPosition.y) < 0.001;
		const alignedChanges = snappedChanges.map((change) =>
			change.type === "position" && change.id === session.nodeId && change.position
				? {
						...change,
						position: {
							x: acceptsHorizontalCorrection ? helperPosition.x : change.position.x,
							y: acceptsVerticalCorrection ? helperPosition.y : change.position.y,
						},
					}
				: change,
		);

		// Helper lines may pull a centre to another grid point when zoomed out,
		// but a fractional correction must not override the grid invariant.
		setHelperLines({
			horizontal: acceptsVerticalCorrection ? alignment.lines.horizontal : undefined,
			vertical: acceptsHorizontalCorrection ? alignment.lines.vertical : undefined,
		});
		applyNodeChange(alignedChanges);
	}

	function applyNodeChange(changes: NodeChange<PIDNode>[]) {
		const apply = () =>
			changeCurrentNodes((current) => applyNodeChanges<PIDNode>(changes, current));
		const changesGraph = changes.some(
			(change) => change.type !== "select" && change.type !== "dimensions",
		);

		if (changesGraph) {
			performEdit(apply);
		} else {
			apply();
		}
	}

	function changeEdges(changes: EdgeChange<PIDEdge>[]) {
		const apply = () =>
			changeCurrentEdges((current) => applyEdgeChanges<PIDEdge>(changes, current));
		const changesGraph = changes.some((change) => change.type !== "select");

		if (changesGraph) {
			performEdit(apply);
		} else {
			apply();
		}
	}

	function dropNode(node: PIDNode, dragged: PIDNode[]) {
		const droppedNode = nodesRef.current.find((candidate) => candidate.id === node.id) ?? node;

		setDragging(false);
		setHolderCandidate(undefined);
		setHelperLines({});
		helperLineSession.current = undefined;

		if (dragged.length === 1) {
			const holderId = holderUnder(droppedNode);
			if (holderId !== undefined && holderId !== droppedNode.parentId)
				holdNode(droppedNode, holderId);
		}

		finishHistoryGroup();
	}

	/**
	 * Changes some of what is recorded about the selected connection and leaves
	 * the rest as it is.
	 */
	function editSelectedEdge(change: Partial<PIDEdgeData>) {
		if (!selectedEdge) return;

		performEdit(() => {
			changeCurrentEdges((current) =>
				current.map((edge) =>
					edge.id === selectedEdge.id ? { ...edge, data: { ...edgeData(edge), ...change } } : edge,
				),
			);
		});
	}

	function changeSelectedEdgeKind(kind: PIDEdgeKind) {
		if (!selectedEdge) return;

		const current = edgeData(selectedEdge);
		editSelectedEdge({
			kind,
			...arrowsAfterKindChange(current.kind, kind, current),
		});
	}

	function addSelectedEdgeArrow() {
		if (!selectedEdge) return;

		const current = edgeData(selectedEdge);
		const position = nextArrowPosition(current.arrowPositions);
		if (position !== undefined) {
			editSelectedEdge({ arrowPositions: [...current.arrowPositions, position] });
		}
	}

	function deleteSelectedItems() {
		const currentNodes = nodesRef.current;
		const currentEdges = edgesRef.current;
		const selectedEdgeIds = new Set(
			currentEdges.filter((edge) => edge.selected).map((edge) => edge.id),
		);
		const selectedNodeIdsOnly = currentNodes.filter((node) => node.selected).map((node) => node.id);
		if (selectedEdgeIds.size === 0 && selectedNodeIdsOnly.length === 0) return;

		// Deleting a symbol deletes what sits inside it. A symbol left behind
		// would name a holder that is no longer in the diagram.
		const selectedNodeIds = withContents(currentNodes, selectedNodeIdsOnly);

		performEdit(() => {
			changeCurrentNodes((current) => current.filter((node) => !selectedNodeIds.has(node.id)));
			changeCurrentEdges((current) =>
				current.filter(
					(edge) =>
						!selectedEdgeIds.has(edge.id) &&
						!selectedNodeIds.has(edge.source) &&
						!selectedNodeIds.has(edge.target),
				),
			);
		});
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

	useEffect(() => {
		if (readOnly) return;

		function onKeyDown(event: KeyboardEvent) {
			if (!editor.current?.contains(event.target as globalThis.Node)) return;

			const key = event.key.toLocaleLowerCase();
			const command = event.metaKey || event.ctrlKey;
			const editingText = isEditableTarget(event.target);
			const nudgeMovement = movementForNudgeKey(
				event.key,
				event.shiftKey ? PID_LARGE_NUDGE_STEP : PID_NUDGE_STEP,
			);

			if (
				nudgeMovement &&
				!command &&
				!event.altKey &&
				!isNudgeBlockedTarget(event.target) &&
				activeTool === "select" &&
				selectedNodes.length > 0
			) {
				event.preventDefault();
				event.stopPropagation();

				if (pressedNudgeKeys.current.size === 0) beginHistoryGroup();
				pressedNudgeKeys.current.add(event.key);
				nudgeSelectedNodes(nudgeMovement);
				return;
			}

			if (command && !editingText && key === "d" && canCopySelection) {
				event.preventDefault();
				duplicateSelection();
				return;
			}

			if (command && !editingText && key === "c" && canCopySelection) {
				event.preventDefault();
				copySelection();
				return;
			}

			if (command && !editingText && key === "v" && canPaste) {
				event.preventDefault();
				pasteClipboard();
				return;
			}

			if (command && key === "z") {
				event.preventDefault();
				if (event.shiftKey) {
					redo();
				} else {
					undo();
				}
				return;
			}

			if (command && key === "y") {
				event.preventDefault();
				redo();
				return;
			}

			if (!command && (event.key === "Backspace" || event.key === "Delete")) {
				if (editingText) return;

				event.preventDefault();
				deleteSelectedItems();
			}
		}

		function onKeyUp(event: KeyboardEvent) {
			if (!pressedNudgeKeys.current.delete(event.key)) return;
			if (pressedNudgeKeys.current.size === 0) finishHistoryGroup();
		}

		function onWindowBlur() {
			if (pressedNudgeKeys.current.size === 0) return;

			pressedNudgeKeys.current.clear();
			finishHistoryGroup();
		}

		document.addEventListener("keydown", onKeyDown, true);
		document.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", onWindowBlur);
		return () => {
			document.removeEventListener("keydown", onKeyDown, true);
			document.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("blur", onWindowBlur);
		};
	});

	return (
		<div
			ref={editor}
			className={[
				"pid-editor overflow-hidden border border-border bg-surface",
				expanded ? "fixed inset-0 z-50 flex flex-col" : "mt-6 rounded-xl",
				dragging ? "pid-editor--dragging" : "",
			]
				.filter(Boolean)
				.join(" ")}
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

			<div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-surface-muted px-4 py-3">
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
					<div className="flex items-center gap-2">
						<span id="pid-handles-label" className="text-sm text-foreground-muted">
							Handles
						</span>
						<Switch
							aria-labelledby="pid-handles-label"
							checked={showHandles}
							onChange={setShowHandles}
						/>
					</div>

					<button
						type="button"
						aria-pressed={expanded}
						title={expanded ? "Return the diagram to the page" : "Fill the window"}
						className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1.5 text-xs font-semibold text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
						onClick={() => setExpanded((current) => !current)}
					>
						{expanded ? (
							<ArrowsPointingInIcon className="size-4" />
						) : (
							<ArrowsPointingOutIcon className="size-4" />
						)}
						{expanded ? "Exit" : "Expand"}
					</button>

					{actions ? (
						<div className="flex items-center gap-2 border-l border-border pl-4">{actions}</div>
					) : null}
				</div>
			</div>

			{/*
				In the page the canvas takes what the window leaves below the heading,
				and never less than a useful drawing area. Filling the window, it takes
				whatever is left beside the tool bar.
			*/}
			<div
				ref={canvas}
				tabIndex={readOnly ? undefined : -1}
				className={
					expanded
						? "relative min-h-0 flex-1 bg-canvas focus:outline-none"
						: "relative h-[calc(100svh-14rem)] min-h-[42rem] bg-canvas focus:outline-none"
				}
			>
				<PIDHandleVisibilityContext.Provider
					value={{
						visible: showHandles,
						interactive: !readOnly && activeTool === "select",
					}}
				>
					<ReactFlow<PIDNode, PIDEdge>
						className={[
							"pid-editor-canvas",
							readOnly ? "pid-editor-canvas--read-only" : "",
							activeTool === "pan" ? "pid-editor-canvas--pan" : "",
						]
							.filter(Boolean)
							.join(" ")}
						nodes={displayedNodes}
						edges={displayedEdges}
						nodeTypes={nodeTypes}
						edgeTypes={edgeTypes}
						onNodesChange={readOnly ? undefined : changeNodes}
						onEdgesChange={readOnly ? undefined : changeEdges}
						onConnect={readOnly ? undefined : connect}
						onNodeClick={(_event, node) => onSymbolClick?.(node.data.symbolKey ?? null)}
						onNodeDragStart={(_event, node, dragged) => startNodeDrag(node, dragged)}
						onNodeDrag={(_event, node, dragged) => dragNode(node, dragged)}
						onNodeDragStop={(_event, node, dragged) => dropNode(node, dragged)}
						onSelectionDragStart={() => {
							beginHistoryGroup();
							setDragging(true);
							setHelperLines({});
							helperLineSession.current = undefined;
						}}
						onSelectionDragStop={() => {
							setDragging(false);
							setHelperLines({});
							finishHistoryGroup();
						}}
						onSelectionEnd={() => canvas.current?.focus({ preventScroll: true })}
						colorMode="light"
						connectionMode={ConnectionMode.Loose}
						connectionLineType={ConnectionLineType.Step}
						isValidConnection={validConnection}
						defaultViewport={{ x: 0, y: 0, zoom: 1 }}
						defaultEdgeOptions={{
							type: "pid-connection",
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
						deleteKeyCode={null}
						selectionOnDrag={!readOnly && activeTool === "select"}
					>
						{!readOnly ? (
							<PIDEditorToolbar
								activeTool={activeTool}
								setActiveTool={setActiveTool}
								canCopySelection={canCopySelection}
								canPaste={canPaste}
								duplicateSelection={duplicateSelection}
								copySelection={copySelection}
								pasteClipboard={pasteClipboard}
								canAlignSelection={canAlignSelection}
								selectionCount={selectedLayoutBoxes.length}
								alignmentCollisions={alignmentCollisions}
								alignmentChanges={alignmentChanges}
								alignSelectedNodes={alignSelectedNodes}
								canDistributeSelection={canDistributeSelection}
								distributionCollisions={distributionCollisions}
								distributionChanges={distributionChanges}
								distributeSelectedNodes={distributeSelectedNodes}
								canUndo={canUndo}
								canRedo={canRedo}
								undo={undo}
								redo={redo}
							/>
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
						<PIDHelperLinesRenderer lines={helperLines} />
					</ReactFlow>
				</PIDHandleVisibilityContext.Provider>

				{import.meta.env.DEV ? (
					<PIDEditorDebugPanel
						nodes={nodes}
						lines={helperLines}
						getInternalNode={getInternalNode}
					/>
				) : null}

				{!readOnly && selectedItemCount > 0 ? (
					<aside className="absolute bottom-3 left-14 z-10 flex max-h-[calc(100%-1.5rem)] w-60 flex-col rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur-sm">
						<h3 className="px-4 pt-4 text-sm font-semibold text-foreground">{selectionTitle}</h3>

						{/*
							Only the fields scroll. The delete button therefore stays in
							view however many fields the selection has.
						*/}
						<div className="min-h-0 flex-1 overflow-y-auto px-4">
							{selectedNode ? (
								<div className="mt-4 space-y-5">
									<label className="block">
										<span className="text-xs font-medium text-foreground-muted">
											{selectedNode.data.kind === "instrument" ? "Function" : "Label"}
										</span>
										<input
											value={selectedNode.data.label}
											onFocus={beginHistoryGroup}
											onBlur={finishHistoryGroup}
											onChange={(event) => {
												beginHistoryGroup();
												renameSelectedNode(event.target.value);
											}}
											className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
										/>
									</label>

									<label className="block">
										<span className="text-xs font-medium text-foreground-muted">
											Diagram symbol key
										</span>
										<input
											value={selectedNode.data.symbolKey ?? ""}
											placeholder="e.g. Thermocouple_Inlet"
											onFocus={beginHistoryGroup}
											onBlur={finishHistoryGroup}
											onChange={(event) =>
												updateSelectedNode({ symbolKey: event.target.value || null })
											}
											className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
										/>
										<span className="mt-1 block text-[0.6875rem] text-foreground-muted">
											Stable and unique within this rig.
										</span>
									</label>

									{selectedNode.data.kind === "sample" ? (
										<label className="block">
											<span className="text-xs font-medium text-foreground-muted">Sample</span>
											<select
												value={selectedNode.data.sampleId ?? ""}
												onChange={(event) =>
													updateSelectedNode({
														sampleId: event.target.value ? Number(event.target.value) : null,
													})
												}
												className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-foreground"
											>
												<option value="">No sample</option>
												{samples.map((sample) => (
													<option key={sample.id} value={sample.id}>
														{sample.batchName} — {sample.name}
													</option>
												))}
											</select>
										</label>
									) : (
										<label className="block">
											<span className="text-xs font-medium text-foreground-muted">Equipment</span>
											<select
												value={selectedNode.data.equipmentId ?? ""}
												onChange={(event) =>
													updateSelectedNode({
														equipmentId: event.target.value ? Number(event.target.value) : null,
													})
												}
												className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-foreground"
											>
												<option value="">No equipment</option>
												{equipment.map((item) => (
													<option key={item.id} value={item.id}>
														{item.name}
														{item.productName ? ` — ${item.productName}` : " — no product"}
													</option>
												))}
											</select>
										</label>
									)}

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
													onFocus={beginHistoryGroup}
													onBlur={finishHistoryGroup}
													onChange={(event) => {
														beginHistoryGroup();
														setSelectedNodeTag(event.target.value);
													}}
													className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
												/>
											</label>
										</>
									) : null}

									{selectedNode.parentId === undefined ? null : (
										<div>
											<span className="text-xs font-medium text-foreground-muted">Inside</span>
											<p className="mt-1 truncate text-sm text-foreground">
												{nodeLabel(nodes, selectedNode.parentId)}
											</p>
											<button
												type="button"
												className="mt-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus"
												onClick={releaseSelectedNode}
											>
												Take out
											</button>
										</div>
									)}

									{selectedNode.data.kind === "three-way-valve" ? (
										<fieldset>
											<legend className="text-xs font-medium text-foreground-muted">Inlets</legend>
											<div className="mt-1 grid grid-cols-2 gap-1">
												{([1, 2] as const).map((inletCount) => (
													<button
														key={inletCount}
														type="button"
														aria-pressed={selectedNode.data.inletCount === inletCount}
														className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:font-semibold focus-visible:outline-2 focus-visible:outline-focus"
														onClick={() => setSelectedNodeInletCount(inletCount)}
													>
														{inletCount}
													</button>
												))}
											</div>
											<p className="mt-1 text-[0.6875rem] text-foreground-muted">
												Changing this removes the valve&apos;s connections because their directions
												reverse.
											</p>
										</fieldset>
									) : null}

									<fieldset>
										<legend className="text-xs font-medium text-foreground-muted">
											Orientation
										</legend>
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
								<div className="mt-4 space-y-5">
									{/* A fieldset does not shrink below its content unless it is told to. */}
									<fieldset className="min-w-0">
										<legend className="text-xs font-semibold text-foreground">
											The connection
										</legend>
										<p className="mt-0.5 text-[0.6875rem] text-foreground-muted">
											What is actually installed between the two symbols.
										</p>

										<div className="mt-2 grid grid-cols-2 gap-1">
											{edgeKinds.map((kind) => (
												<button
													key={kind}
													type="button"
													aria-pressed={edgeKind(selectedEdge) === kind}
													title={PID_EDGE_KINDS[kind].description}
													className="rounded-md border border-border px-2 py-1.5 text-xs text-foreground hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-surface-muted aria-pressed:font-semibold focus-visible:outline-2 focus-visible:outline-focus"
													onClick={() => changeSelectedEdgeKind(kind)}
												>
													{PID_EDGE_KINDS[kind].name}
												</button>
											))}
										</div>

										{/* Only process lines have pipe dimensions. */}
										{PID_EDGE_KINDS[edgeKind(selectedEdge)].carriesProcessFluid ? (
											<div className="mt-3 space-y-2">
												<label className="block">
													<span className="text-xs font-medium text-foreground-muted">
														Material
													</span>
													<input
														value={selectedEdge.data?.material ?? ""}
														placeholder="Stainless steel 1.4571"
														onFocus={beginHistoryGroup}
														onBlur={finishHistoryGroup}
														onChange={(event) => {
															beginHistoryGroup();
															editSelectedEdge({ material: event.target.value || null });
														}}
														className="mt-1 block w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-focus focus:outline-none"
													/>
												</label>

												<LengthField
													label="Inner diameter"
													value={selectedEdge.data?.innerDiameter ?? null}
													onChange={(innerDiameter) => editSelectedEdge({ innerDiameter })}
													onEditStart={beginHistoryGroup}
													onEditEnd={finishHistoryGroup}
												/>
												<LengthField
													label="Outer diameter"
													value={selectedEdge.data?.outerDiameter ?? null}
													onChange={(outerDiameter) => editSelectedEdge({ outerDiameter })}
													onEditStart={beginHistoryGroup}
													onEditEnd={finishHistoryGroup}
												/>
												<LengthField
													label="Length"
													value={selectedEdge.data?.length ?? null}
													onChange={(length) => editSelectedEdge({ length })}
													onEditStart={beginHistoryGroup}
													onEditEnd={finishHistoryGroup}
												/>
											</div>
										) : null}
									</fieldset>

									<fieldset className="min-w-0">
										<legend className="text-xs font-semibold text-foreground">Drawing</legend>
										<p className="mt-0.5 text-[0.6875rem] text-foreground-muted">
											How the line appears. A heavy line may still be a narrow pipe.
										</p>

										<span className="mt-2 block text-xs font-medium text-foreground-muted">
											Weight
										</span>
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
													onClick={() => editSelectedEdge({ weight })}
												>
													{weight}
												</button>
											))}
										</div>

										{PID_EDGE_KINDS[edgeKind(selectedEdge)].supportsArrows ? (
											<div className="mt-4 border-t border-border pt-3">
												<div className="flex items-center justify-between gap-3">
													<span className="text-xs font-medium text-foreground-muted">Arrows</span>
													<button
														type="button"
														disabled={(selectedEdge.data?.arrowPositions.length ?? 0) >= 99}
														className="rounded-md border border-border px-2 py-1 text-[0.6875rem] font-medium text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
														onClick={addSelectedEdgeArrow}
													>
														Add arrow
													</button>
												</div>

												<div className="mt-2 flex items-center justify-between gap-3">
													<span className="text-xs text-foreground">At end</span>
													<Switch
														aria-label="Arrow at end"
														checked={
															selectedEdge.data?.endArrow ?? defaultEndArrow(edgeKind(selectedEdge))
														}
														onChange={(endArrow) => editSelectedEdge({ endArrow })}
													/>
												</div>

												{(selectedEdge.data?.arrowPositions ?? []).length > 0 ? (
													<div className="mt-3 space-y-2">
														{(selectedEdge.data?.arrowPositions ?? []).map((position, index) => (
															<div
																key={index}
																className="grid grid-cols-[minmax(0,1fr)_2.5rem_auto] items-center gap-2"
															>
																<input
																	type="range"
																	min={1}
																	max={99}
																	step={1}
																	value={position}
																	aria-label={`Arrow ${index + 1} position`}
																	className="min-w-0 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
																	onFocus={beginHistoryGroup}
																	onBlur={finishHistoryGroup}
																	onChange={(event) => {
																		beginHistoryGroup();
																		editSelectedEdge({
																			arrowPositions: moveArrowPosition(
																				selectedEdge.data?.arrowPositions ?? [],
																				index,
																				Number(event.target.value),
																			),
																		});
																	}}
																/>
																<output className="text-right text-xs tabular-nums text-foreground-muted">
																	{position}%
																</output>
																<button
																	type="button"
																	aria-label={`Remove arrow ${index + 1}`}
																	title="Remove arrow"
																	className="rounded p-1 text-foreground-muted hover:bg-danger-surface hover:text-danger-surface-foreground focus-visible:outline-2 focus-visible:outline-focus"
																	onClick={() =>
																		editSelectedEdge({
																			arrowPositions: removeArrowPosition(
																				selectedEdge.data?.arrowPositions ?? [],
																				index,
																			),
																		})
																	}
																>
																	<XMarkIcon className="size-3.5" />
																</button>
															</div>
														))}
													</div>
												) : null}
											</div>
										) : null}
									</fieldset>
								</div>
							) : hasMixedSelection ? (
								<p className="mt-2 text-xs text-foreground-muted">{selectionSummary}</p>
							) : null}
						</div>

						{selectedNodes.length > 0 ? (
							<div className="mt-3 border-t border-border px-4 py-3">
								<p className="text-xs font-medium text-foreground">
									Move {selectedNodes.length > 1 ? "selection" : "symbol"}
								</p>
								<table className="mt-2 w-full text-xs text-foreground-muted">
									<tbody>
										<tr>
											<th className="py-0.5 text-left font-medium text-foreground">Drag symbol</th>
											<td className="py-0.5 text-left whitespace-nowrap">
												{selectedNodes.length > 1 ? "Move group" : "Move freely"}
											</td>
										</tr>
										<tr>
											<th className="py-0.5 text-left font-medium text-foreground">
												<kbd className="whitespace-nowrap rounded border border-border bg-surface-muted px-1.5 py-0.5 font-sans font-medium">
													Arrow keys
												</kbd>
											</th>
											<td className="py-0.5 text-left whitespace-nowrap">1 grid step</td>
										</tr>
										<tr>
											<th className="py-0.5 text-left font-medium text-foreground">
												<span className="flex items-center gap-1">
													<kbd className="whitespace-nowrap rounded border border-border bg-surface-muted px-1.5 py-0.5 font-sans font-medium">
														Shift
													</kbd>
													<span>+</span>
													<kbd className="whitespace-nowrap rounded border border-border bg-surface-muted px-1.5 py-0.5 font-sans font-medium">
														Arrow keys
													</kbd>
												</span>
											</th>
											<td className="py-0.5 text-left whitespace-nowrap">5 grid steps</td>
										</tr>
									</tbody>
								</table>
							</div>
						) : null}

						<button
							type="button"
							className="m-2 inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-sm font-semibold text-foreground-muted hover:bg-danger-surface hover:text-danger-surface-foreground focus-visible:outline-2 focus-visible:outline-focus"
							onClick={deleteSelectedItems}
						>
							<TrashIcon className="size-4" />
							{selectedItemCount === 1 ? "Delete" : "Delete selection"}
						</button>
					</aside>
				) : null}

				{!readOnly ? (
					<aside className="absolute top-3 right-3 bottom-3 z-10 flex w-60 max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur-sm max-lg:top-24">
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

function createHelperLineSession(
	node: PIDNode,
	nodes: PIDNode[],
	getInternalNode: (id: string) => InternalNode<PIDNode> | undefined,
): HelperLineSession | undefined {
	const internalNode = getInternalNode(node.id);
	if (!internalNode) return undefined;

	const stationaryAnchors = nodes
		.filter((candidate) => candidate.id !== node.id)
		.flatMap((candidate) => {
			const internalCandidate = getInternalNode(candidate.id);

			return internalCandidate ? helperAnchors(internalCandidate) : [];
		});

	return {
		nodeId: node.id,
		startPosition: { ...node.position },
		movingAnchors: helperAnchors(internalNode),
		stationaryAnchors,
	};
}

/**
 * Return the measured center of one symbol.
 */
function helperAnchors(node: InternalNode<PIDNode>): PIDHelperAnchor[] {
	const width = node.measured.width;
	const height = node.measured.height;
	if (width === undefined || height === undefined) return [];

	return [
		{
			nodeId: node.id,
			x: node.internals.positionAbsolute.x + width / 2,
			y: node.internals.positionAbsolute.y + height / 2,
		},
	];
}

/**
 * Edits one measured length, as a number beside the unit it is given in.
 *
 * A length is recorded only once both parts are present. Clearing the number
 * therefore removes the measurement. Choosing a unit before typing a number
 * records nothing yet, and the chosen unit is used as soon as a number is
 * typed.
 */
function LengthField({
	label,
	value,
	onChange,
	onEditStart,
	onEditEnd,
}: {
	label: string;
	value: PIDLength | null;
	onChange: (value: PIDLength | null) => void;
	onEditStart: () => void;
	onEditEnd: () => void;
}) {
	const [unit, setUnit] = useState<PIDLengthUnit>(value?.unit ?? "mm");
	const chosenUnit = value?.unit ?? unit;

	return (
		<label className="block">
			<span className="text-xs font-medium text-foreground-muted">{label}</span>

			<span className="mt-1 flex gap-1">
				<input
					type="number"
					min={0}
					step="any"
					value={value?.value ?? ""}
					onFocus={onEditStart}
					onBlur={onEditEnd}
					onChange={(event) => {
						onEditStart();
						const typed = event.target.value;

						onChange(typed === "" ? null : { value: Number(typed), unit: chosenUnit });
					}}
					className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:border-focus focus:outline-none"
				/>

				<select
					aria-label={`Unit of ${label.toLocaleLowerCase()}`}
					value={chosenUnit}
					onFocus={onEditStart}
					onBlur={onEditEnd}
					onChange={(event) => {
						onEditStart();
						const nextUnit = event.target.value as PIDLengthUnit;

						setUnit(nextUnit);
						if (value) onChange({ ...value, unit: nextUnit });
					}}
					className="rounded-md border border-border bg-surface px-1.5 py-1.5 text-xs text-foreground focus:border-focus focus:outline-none"
				>
					{PID_LENGTH_UNITS.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			</span>
		</label>
	);
}

/**
 * Returns the label of one symbol, or the name of its kind where it has no
 * label. For example, an unnamed junction reads as "Junction".
 */
function nodeLabel(nodes: PIDNode[], id: string): string {
	const node = nodes.find((candidate) => candidate.id === id);
	if (!node) return "a symbol";

	return node.data.label || getPIDSymbol(node.data.kind).label;
}

function selectionPart(count: number, singular: string) {
	if (count === 0) return "";

	return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

function isEditableTarget(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLInputElement ||
		target instanceof HTMLTextAreaElement ||
		target instanceof HTMLSelectElement ||
		(target instanceof HTMLElement && target.isContentEditable)
	);
}

function isNudgeBlockedTarget(target: EventTarget | null): boolean {
	return (
		isEditableTarget(target) ||
		(target instanceof HTMLElement && target.closest("button, a, [role='menuitem']") !== null)
	);
}

function movementForNudgeKey(key: string, distance: number): XYPosition | undefined {
	if (key === "ArrowLeft") return { x: -distance, y: 0 };
	if (key === "ArrowRight") return { x: distance, y: 0 };
	if (key === "ArrowUp") return { x: 0, y: -distance };
	if (key === "ArrowDown") return { x: 0, y: distance };
}
