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
	useNodesInitialized,
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
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	type ReactNode,
} from "react";

import { PIDConnection, PIDConnectionSample } from "~/app/components/PIDEditorConnections.tsx";
import { PIDSymbolNode } from "~/app/components/PIDEditorSymbolNode.tsx";
import { PIDEditorToolbar } from "~/app/components/PIDEditorToolbar.tsx";
import { pidGridOriginOffset, snapPIDNodePosition } from "~/app/components/PIDGridOrigin.ts";
import {
	getPIDAnchorAlignment,
	PID_HELPER_LINE_SNAP_DISTANCE,
	PIDHelperLinesRenderer,
	type PIDHelperAnchor,
	type PIDHelperLines,
} from "~/app/components/PIDHelperLines.tsx";
import {
	getPIDSymbol,
	maximumSizeForPIDSymbol,
	PIDSymbol,
	pidInstrumentPresets,
	pidSymbolGroups,
	searchPIDSymbolGroups,
	type PIDOrientation,
	type PIDSymbolKind,
} from "~/app/components/PIDSymbol.tsx";
import {
	PIDHandleVisibilityContext,
	rotatePIDPort,
	type PIDPort,
} from "~/app/components/pid-symbols/ConnectablePIDSymbol.tsx";
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
import { splitPIDEdgeData, unambiguousSplitCandidate } from "~/app/lib/PIDEdgeSplit.ts";
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
type SplitCandidate = {
	edgeId: string;
	point: XYPosition;
	fraction: number;
	incomingHandle: string;
	outgoingHandle: string;
};

const junctionPorts = [
	{ id: "inlet", type: "source", side: "left", x: 0, y: 0.5 },
	{ id: "branch-inlet", type: "source", side: "top", x: 0.5, y: 0 },
	{ id: "outlet", type: "source", side: "right", x: 1, y: 0.5 },
	{ id: "branch", type: "source", side: "bottom", x: 0.5, y: 1 },
] as const satisfies readonly PIDPort[];

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
	readOnlySelectionEnabled = false,
	onChange,
	onSymbolClick,
	selectedSymbolKey,
	focusedSymbol,
	focusedNode,
	autoZoomToSelection,
	actions,
	equipment = [],
	samples = [],
}: PIDEditorProps) {
	return (
		<ReactFlowProvider>
			<PIDEditorContents
				value={value}
				readOnly={readOnly}
				readOnlySelectionEnabled={readOnlySelectionEnabled}
				onChange={onChange}
				onSymbolClick={onSymbolClick}
				selectedSymbolKey={selectedSymbolKey}
				focusedSymbol={focusedSymbol}
				focusedNode={focusedNode}
				autoZoomToSelection={autoZoomToSelection}
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
	readOnlySelectionEnabled?: boolean;
	onChange?: (value: PIDGraph) => void;
	onSymbolClick?: (key: string | null) => void;
	selectedSymbolKey?: string | null;
	focusedSymbol?: { key: string; request: number } | null;
	focusedNode?: { nodeId: string; request: number } | null;
	autoZoomToSelection: boolean;

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
	readOnlySelectionEnabled,
	onChange,
	onSymbolClick,
	selectedSymbolKey,
	focusedSymbol,
	focusedNode,
	autoZoomToSelection,
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
	const [inspectorSide, setInspectorSide] = useState<"left" | "right">("left");
	const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
	const [inspectorPosition, setInspectorPosition] = useState<{ x: number; y: number }>();
	const hasInspectorPosition = inspectorPosition !== undefined;
	const [collapsedInspectorTop, setCollapsedInspectorTop] = useState<number>();
	const inspectorRef = useRef<HTMLElement>(null);
	const inspectorWasMoved = useRef(false);

	// The symbol that would hold the one being dragged, if it were released
	// now. It is outlined while the drag lasts, so the reader sees what is
	// about to happen before it happens.
	const [holderCandidate, setHolderCandidate] = useState<string>();
	const [splitCandidate, setSplitCandidate] = useState<SplitCandidate>();
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
	const labelInput = useRef<HTMLInputElement>(null);
	const tagInput = useRef<HTMLInputElement>(null);
	const inspectorDrag = useRef<{ pointerId: number; offsetX: number; offsetY: number } | undefined>(
		undefined,
	);
	const helperLineSession = useRef<HelperLineSession | undefined>(undefined);
	const { screenToFlowPosition, zoomTo, fitView, getInternalNode } = useReactFlow<
		PIDNode,
		PIDEdge
	>();
	const nodesInitialized = useNodesInitialized();
	const { zoom } = useViewport();
	const updateNodeInternals = useUpdateNodeInternals();
	const previousAutoZoom = useRef(autoZoomToSelection);

	useEffect(() => {
		if (previousAutoZoom.current === autoZoomToSelection) return;
		previousAutoZoom.current = autoZoomToSelection;
		if (!autoZoomToSelection) void fitView({ padding: 0.2, duration: 250 });
	}, [autoZoomToSelection, fitView]);

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

	useEffect(() => {
		if (!focusedNode || !nodesRef.current.some((node) => node.id === focusedNode.nodeId)) return;

		// Selection exposes the symbol's fields after the diagram enters edit mode.
		if (!readOnly) {
			setNodes((current) => {
				const next = current.map((node) => ({
					...node,
					selected: node.id === focusedNode.nodeId,
				}));
				nodesRef.current = next;
				return next;
			});
		}

		if (autoZoomToSelection)
			void fitView({
				nodes: [{ id: focusedNode.nodeId }],
				maxZoom: 1.2,
				padding: 0.5,
				duration: 250,
			});
	}, [autoZoomToSelection, fitView, focusedNode, readOnly, setNodes]);

	useEffect(() => {
		if (!focusedSymbol) return;
		const matching = nodesRef.current.filter((node) => node.data.symbolKey === focusedSymbol.key);
		if (matching.length === 0) return;

		if (autoZoomToSelection)
			void fitView({
				nodes: matching.map((node) => ({ id: node.id })),
				maxZoom: 1.2,
				padding: 0.5,
				duration: 250,
			});
	}, [autoZoomToSelection, fitView, focusedSymbol]);

	function snapNodePosition(node: PIDNode, position: XYPosition): XYPosition | undefined {
		const internal = getInternalNode(node.id);
		if (!internal) return undefined;

		const originOffset = pidGridOriginOffset(internal);
		if (!originOffset) return undefined;

		const parent = node.parentId ? getInternalNode(node.parentId) : undefined;
		if (node.parentId && !parent) return undefined;

		return snapPIDNodePosition(
			position,
			parent?.internals.positionAbsolute ?? { x: 0, y: 0 },
			originOffset,
		);
	}

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
		const internal = getInternalNode(node.id);
		const gridOriginOffset = internal ? pidGridOriginOffset(internal) : undefined;
		return box ? [{ id: node.id, ...box, gridOriginOffset }] : [];
	});
	const selectedItemCount = selectedNodes.length + selectedEdges.length;
	const selectedNode = selectedItemCount === 1 ? selectedNodes[0] : undefined;
	const selectedEdge = selectedItemCount === 1 ? selectedEdges[0] : undefined;
	const canAddCaption =
		selectedNode !== undefined &&
		!["instrument", "junction", "sample", "note"].includes(selectedNode.data.kind);
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
	const inspectorTitle =
		inspectorCollapsed && selectedNode ? nodeLabel(nodes, selectedNode.id) : selectionTitle;
	const hasMixedSelection = selectedNodes.length > 0 && selectedEdges.length > 0;
	const visibleSymbolGroups = searchPIDSymbolGroups(paletteFilter);
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

		const highlighted =
			(!readOnly || readOnlySelectionEnabled) &&
			(focusedNode
				? node.id === focusedNode.nodeId
				: Boolean(selectedSymbolKey && node.data.symbolKey === selectedSymbolKey));
		// View mode shows a selection only while the sidecar uses the diagram.
		const selected = readOnly ? highlighted : node.selected;
		return classes.length === 0 && !highlighted && node.selected === selected
			? node
			: {
					...node,
					className: classes.join(" "),
					data: { ...node.data, linkedSelected: highlighted },
					selected,
				};
	});
	const displayedEdges = edges.map((edge) =>
		edge.id === splitCandidate?.edgeId
			? { ...edge, className: "pid-connection-split-candidate" }
			: edge,
	);
	const canUndo = history.past.length > 0;
	const canRedo = history.future.length > 0;
	const canCopySelection = selectedNodes.length > 0;
	const canPaste = clipboard !== undefined;
	const canAlignSelection =
		selectedLayoutBoxes.length >= 2 &&
		selectedLayoutBoxes.every((box) => box.gridOriginOffset !== undefined);
	const canDistributeSelection = selectedLayoutBoxes.length >= 3;
	const alignmentLayouts: Record<PIDAlignment, PIDLayoutDelta[]> = {
		left: alignPIDBoxes(selectedLayoutBoxes, "left"),
		right: alignPIDBoxes(selectedLayoutBoxes, "right"),
		top: alignPIDBoxes(selectedLayoutBoxes, "top"),
		bottom: alignPIDBoxes(selectedLayoutBoxes, "bottom"),
		"handles-vertical": alignPIDBoxes(selectedLayoutBoxes, "handles-vertical"),
		"handles-horizontal": alignPIDBoxes(selectedLayoutBoxes, "handles-horizontal"),
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
		"handles-vertical": hasPIDLayoutMovement(alignmentLayouts["handles-vertical"]),
		"handles-horizontal": hasPIDLayoutMovement(alignmentLayouts["handles-horizontal"]),
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
		"handles-vertical": countPIDLayoutCollisions(
			selectedLayoutBoxes,
			alignmentLayouts["handles-vertical"],
		),
		"handles-horizontal": countPIDLayoutCollisions(
			selectedLayoutBoxes,
			alignmentLayouts["handles-horizontal"],
		),
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

	function placeInspector(event: ReactMouseEvent) {
		if (readOnly || activeTool !== "select" || inspectorWasMoved.current) return;

		const bounds = canvas.current?.getBoundingClientRect();
		if (!bounds) return;

		// A selected symbol must remain visible after its inspector opens.
		// The right position sits between the diagram and equipment panels.
		const panelWidth = 240;
		const panelGap = 12;
		const leftStart = bounds.left + 56;
		const leftEnd = leftStart + panelWidth;
		const rightStart = bounds.right - panelGap - panelWidth - panelGap - panelWidth;
		const rightFits = rightStart >= leftEnd + panelGap;
		const pointerUnderLeftInspector = event.clientX >= leftStart && event.clientX <= leftEnd;

		setInspectorSide(rightFits && pointerUnderLeftInspector ? "right" : "left");
	}

	function moveInspectorTo(clientX: number, clientY: number, vertical: boolean) {
		const bounds = canvas.current?.getBoundingClientRect();
		const panel = inspectorRef.current;
		if (!bounds || !panel) return;

		const width = panel.offsetWidth;
		const height = panel.offsetHeight;
		const current = inspectorPosition ?? {
			x: inspectorSide === "right" ? bounds.width - 516 : 56,
			y: Math.max(12, bounds.height - height - 12),
		};
		const x = Math.max(12, Math.min(bounds.width - width - 12, clientX - bounds.left));
		const y = vertical
			? Math.max(12, Math.min(bounds.height - height - 12, clientY - bounds.top))
			: current.y;

		inspectorWasMoved.current = true;
		setInspectorPosition({ x, y });
	}

	function startInspectorDrag(event: ReactPointerEvent<HTMLElement>) {
		if (event.button !== 0 || !inspectorRef.current) return;
		if (event.target instanceof Element) {
			const button = event.target.closest("button");
			if (button && button !== event.currentTarget) {
				event.stopPropagation();
				return;
			}
		}
		event.preventDefault();
		event.stopPropagation();
		const panelBounds = inspectorRef.current.getBoundingClientRect();
		inspectorDrag.current = {
			pointerId: event.pointerId,
			offsetX: event.clientX - panelBounds.left,
			offsetY: event.clientY - panelBounds.top,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function continueInspectorDrag(event: ReactPointerEvent<HTMLElement>) {
		if (inspectorDrag.current?.pointerId !== event.pointerId) return;
		event.preventDefault();
		event.stopPropagation();
		moveInspectorTo(
			event.clientX - inspectorDrag.current.offsetX,
			event.clientY - inspectorDrag.current.offsetY,
			!inspectorCollapsed,
		);
	}

	useEffect(() => {
		if (!inspectorCollapsed || !selectedItemCount) return;

		function updateCollapsedTop() {
			const bounds = canvas.current?.getBoundingClientRect();
			const panel = inspectorRef.current;
			if (!bounds || !panel) return;

			const visibleBottom = Math.min(bounds.bottom, window.innerHeight);
			const top = visibleBottom - bounds.top - panel.offsetHeight - 12;
			setCollapsedInspectorTop(
				Math.max(12, Math.min(bounds.height - panel.offsetHeight - 12, top)),
			);
		}

		updateCollapsedTop();
		window.addEventListener("resize", updateCollapsedTop);
		document.addEventListener("scroll", updateCollapsedTop, true);
		const observer = new ResizeObserver(updateCollapsedTop);
		if (canvas.current) observer.observe(canvas.current);

		return () => {
			window.removeEventListener("resize", updateCollapsedTop);
			document.removeEventListener("scroll", updateCollapsedTop, true);
			observer.disconnect();
		};
	}, [inspectorCollapsed, selectedItemCount]);

	useEffect(() => {
		if (inspectorCollapsed || !hasInspectorPosition) return;

		function keepInspectorVisible() {
			const bounds = canvas.current?.getBoundingClientRect();
			const panel = inspectorRef.current;
			if (!bounds || !panel) return;

			setInspectorPosition((position) => {
				if (!position) return position;
				const next = {
					x: Math.max(12, Math.min(bounds.width - panel.offsetWidth - 12, position.x)),
					y: Math.max(12, Math.min(bounds.height - panel.offsetHeight - 12, position.y)),
				};
				return next.x === position.x && next.y === position.y ? position : next;
			});
		}

		window.addEventListener("resize", keepInspectorVisible);
		const observer = new ResizeObserver(keepInspectorVisible);
		if (canvas.current) observer.observe(canvas.current);
		return () => {
			window.removeEventListener("resize", keepInspectorVisible);
			observer.disconnect();
		};
	}, [hasInspectorPosition, inspectorCollapsed]);

	function focusNodeLabel(event: ReactMouseEvent, node: PIDNode) {
		if (readOnly || activeTool !== "select") return;
		if (!(event.target instanceof Element)) return;

		const label = event.target.closest<HTMLElement>("[data-pid-label-field]");
		if (!label || !event.currentTarget.contains(label)) return;

		const field = label.dataset.pidLabelField;
		if (field !== "label" && field !== "tag") return;

		placeInspector(event);
		setInspectorCollapsed(false);
		finishHistoryGroup();
		changeCurrentNodes((current) =>
			current.map((candidate) => ({ ...candidate, selected: candidate.id === node.id })),
		);
		changeCurrentEdges((current) =>
			current.map((candidate) => ({ ...candidate, selected: false })),
		);

		requestAnimationFrame(() => {
			(field === "tag" ? tagInput : labelInput).current?.focus();
		});
	}

	function normalizeNodePositions() {
		changeCurrentNodes((current) => {
			let changed = false;
			const next = current.map((node) => {
				const position = snapNodePosition(node, node.position);
				if (!position) return node;
				if (
					Math.abs(position.x - node.position.x) < 0.001 &&
					Math.abs(position.y - node.position.y) < 0.001
				)
					return node;

				changed = true;
				return { ...node, position };
			});

			return changed ? next : current;
		});
	}

	// Handle measurements become available after React Flow renders the nodes.
	// Repeat the check after a parent moves, because its children use its corner.
	useEffect(() => {
		if (nodesInitialized) normalizeNodePositions();
	});

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
		if (!canAlignSelection || !alignmentChanges[alignment]) {
			return;
		}
		applyLayout(alignmentLayouts[alignment]);
	}

	function distributeSelectedNodes(axis: PIDDistributionAxis) {
		if (!canDistributeSelection || !distributionChanges[axis]) {
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

	function splitConnection(candidate: SplitCandidate, junctionId: string) {
		const edge = edgesRef.current.find((item) => item.id === candidate.edgeId);
		if (!edge) return;

		const parts = splitPIDEdgeData(edgeData(edge), candidate.fraction);
		if (!parts) return;

		changeCurrentEdges((current) => [
			...current
				.filter((item) => item.id !== edge.id)
				.map((item) => ({ ...item, selected: false })),
			{
				...edge,
				id: randomId("pid-edge"),
				target: junctionId,
				targetHandle: candidate.incomingHandle,
				data: parts[0],
				selected: false,
			},
			{
				...edge,
				id: randomId("pid-edge"),
				source: junctionId,
				sourceHandle: candidate.outgoingHandle,
				data: parts[1],
				selected: false,
			},
		]);
	}

	function connectionUnder(center: XYPosition, junction?: PIDNode): SplitCandidate | undefined {
		const edgeElements = canvas.current?.querySelectorAll<HTMLElement>(".react-flow__edge");
		if (!edgeElements) return undefined;

		const candidates: (SplitCandidate & { distance: number })[] = [];
		for (const element of edgeElements) {
			const edge = edgesRef.current.find((item) => item.id === element.dataset.id);
			if (!edge || !PID_EDGE_KINDS[edgeKind(edge)].carriesProcessFluid) continue;
			if (junction && (edge.source === junction.id || edge.target === junction.id)) continue;

			const path = element.querySelector<SVGPathElement>("path[data-pid-process-route]");
			if (!path) continue;

			const closest = closestPointOnPath(path, center);
			if (!closest || closest.distance > 12 / zoom) continue;
			if (closest.along < 16 / zoom || closest.total - closest.along < 16 / zoom) continue;

			const handles = junctionHandles(closest.direction, junction?.data.orientation ?? 0);
			if (!handles) continue;
			candidates.push({
				edgeId: edge.id,
				point: closest.point,
				fraction: closest.along / closest.total,
				incomingHandle: handles.incoming,
				outgoingHandle: handles.outgoing,
				distance: closest.distance,
			});
		}

		const nearest = unambiguousSplitCandidate(candidates, 2 / zoom);
		if (!nearest) return undefined;

		const edge = edgesRef.current.find((item) => item.id === nearest.edgeId);
		if (!edge || !splitPIDEdgeData(edgeData(edge), nearest.fraction)) return undefined;
		if (
			junction &&
			edgesRef.current.some(
				(item) =>
					(item.source === junction.id &&
						(item.sourceHandle === nearest.incomingHandle ||
							item.sourceHandle === nearest.outgoingHandle)) ||
					(item.target === junction.id &&
						(item.targetHandle === nearest.incomingHandle ||
							item.targetHandle === nearest.outgoingHandle)),
			)
		)
			return undefined;

		return nearest;
	}

	function addNode(kind: PIDSymbolKind, position?: { x: number; y: number }) {
		const symbol = getPIDSymbol(kind);
		const number = nextNodeNumber.current++;
		const id = randomId("pid-node");
		const holderId = position ? paletteHolder(kind, snapPIDPosition(position)) : undefined;
		const split =
			kind === "junction" && position && !holderId ? connectionUnder(position) : undefined;
		const snappedPosition = position ? snapPIDPosition(split?.point ?? position) : undefined;
		const holder = holderId ? symbolBox(holderId) : undefined;
		const nodePosition =
			holder && snappedPosition
				? { x: snappedPosition.x - holder.x, y: snappedPosition.y - holder.y }
				: (snappedPosition ?? {
						x: 160 + ((number - 1) % 3) * 150,
						y: 120 + Math.floor((number - 1) / 3) * 130,
					});

		performEdit(() => {
			changeCurrentNodes((current) => [
				...current.map((node) => ({ ...node, selected: false })),
				{
					id,
					type: "pid-symbol",
					position: nodePosition,
					...(holder ? { parentId: holderId, extent: "parent" as const } : {}),
					data: {
						kind,
						label: symbol.label,
						symbolKey: null,
						equipmentId: null,
						sampleId: null,
						secondaryLabel: null,
						contained: Boolean(holder),
						inletCount: 1,
						orientation: 0,
					},
					selected: true,
				},
			]);
			changeCurrentEdges((current) => current.map((edge) => ({ ...edge, selected: false })));
			if (split) splitConnection(split, id);
		});

		// The palette filter may still have focus after a symbol is added.
		// Focus the canvas so copy and paste act on the selected symbol.
		canvas.current?.focus({ preventScroll: true });
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

	function addCaption() {
		if (!selectedNode || !canAddCaption) return;

		const holder = symbolBox(selectedNode.id);
		if (!holder) return;

		const junctionId = randomId("pid-node");
		const instrumentId = randomId("pid-node");
		const edgeId = randomId("pid-edge");
		const junctionCanvasPosition = snapPIDPosition({
			x: holder.x + holder.width * 0.8,
			y: holder.y + holder.height * 0.2,
		});
		// Keep the junction inside the equipment bounds.
		const junctionSize = maximumSizeForPIDSymbol("junction", 56);
		const junctionPosition = {
			x: Math.min(
				Math.max(0, holder.width - junctionSize),
				Math.max(0, junctionCanvasPosition.x - holder.x),
			),
			y: Math.min(
				Math.max(0, holder.height - junctionSize),
				Math.max(0, junctionCanvasPosition.y - holder.y),
			),
		};

		// Use the first clear place around the equipment. The Instrument remains movable.
		const instrumentSize = maximumSizeForPIDSymbol("instrument", 56);
		const candidates = [
			{ x: holder.x + holder.width + 60, y: holder.y - 50 },
			{ x: holder.x - 60, y: holder.y - 50 },
			{ x: holder.x + holder.width + 60, y: holder.y + holder.height + 50 },
			{ x: holder.x - 60, y: holder.y + holder.height + 50 },
		].map((position) => snapPIDPosition(position));
		const instrumentPosition =
			candidates.find(
				(candidate) =>
					candidate.x >= instrumentSize / 2 &&
					candidate.y >= instrumentSize / 2 &&
					nodes.every((node) => {
						const box = symbolBox(node.id);
						if (!box) return true;

						const gap = 8;
						return (
							candidate.x + instrumentSize / 2 + gap <= box.x ||
							candidate.x - instrumentSize / 2 - gap >= box.x + box.width ||
							candidate.y + instrumentSize / 2 + gap <= box.y ||
							candidate.y - instrumentSize / 2 - gap >= box.y + box.height
						);
					}),
			) ?? candidates[0];

		// Create the point and its caption in one edit so Undo removes both.
		performEdit(() => {
			changeCurrentNodes((current) => [
				...current.map((node) => ({ ...node, selected: false })),
				{
					id: junctionId,
					type: "pid-symbol",
					position: junctionPosition,
					parentId: selectedNode.id,
					extent: "parent" as const,
					data: {
						kind: "junction" as const,
						label: getPIDSymbol("junction").label,
						secondaryLabel: null,
						contained: true,
						inletCount: 1 as const,
						orientation: 0 as const,
					},
					selected: false,
				},
				{
					id: instrumentId,
					type: "pid-symbol",
					position: instrumentPosition,
					data: {
						kind: "instrument" as const,
						label: getPIDSymbol("instrument").label,
						secondaryLabel: null,
						contained: false,
						inletCount: 1 as const,
						orientation: 0 as const,
					},
					selected: true,
				},
			]);
			changeCurrentEdges((current) => [
				...current.map((edge) => ({ ...edge, selected: false })),
				{
					id: edgeId,
					type: "pid-connection",
					source: junctionId,
					sourceHandle: "branch-inlet",
					target: instrumentId,
					targetHandle: "leader",
					data: {
						kind: "caption" as const,
						endArrow: defaultEndArrow("caption"),
						arrowPositions: [],
						weight: 1,
						material: null,
						innerDiameter: null,
						outerDiameter: null,
						length: null,
					},
				},
			]);
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

		const bounds = canvas.current?.getBoundingClientRect();
		const insideCanvas =
			bounds &&
			event.clientX >= bounds.left &&
			event.clientX <= bounds.right &&
			event.clientY >= bounds.top &&
			event.clientY <= bounds.bottom;
		const position = insideCanvas
			? screenToFlowPosition({ x: event.clientX, y: event.clientY })
			: undefined;
		const holderId = position ? paletteHolder(drag.kind, snapPIDPosition(position)) : undefined;
		setHolderCandidate(holderId);
		setSplitCandidate(
			position && drag.kind === "junction" && !holderId ? connectionUnder(position) : undefined,
		);
	}

	function finishPaletteDrag(event: ReactPointerEvent<HTMLDivElement>) {
		const drag = paletteDrag.current;
		if (drag?.pointerId !== event.pointerId) return;

		paletteDrag.current = undefined;
		setDragPreview(undefined);
		setHolderCandidate(undefined);
		setSplitCandidate(undefined);

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
		setHolderCandidate(undefined);
		setSplitCandidate(undefined);
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
		requestAnimationFrame(() => {
			updateNodeInternals(selectedNode.id);
			requestAnimationFrame(normalizeNodePositions);
		});
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
		requestAnimationFrame(() => {
			updateNodeInternals(selectedNode.id);
			requestAnimationFrame(normalizeNodePositions);
		});
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
		return holderAt(center, area, excluded);
	}

	function paletteHolder(kind: PIDSymbolKind, center: XYPosition): string | undefined {
		if (kind !== "junction" && kind !== "sample") return undefined;

		const size = maximumSizeForPIDSymbol(kind, 56);
		return holderAt(center, size * size, new Set());
	}

	function holderAt(center: XYPosition, area: number, excluded: Set<string>): string | undefined {
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
	function holdNode(heldNode: PIDNode, holderId: string, droppedCenter?: XYPosition) {
		const center = droppedCenter ?? nodeCanvasCenter(heldNode);
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

	function draggedPoint(event: MouseEvent | TouchEvent): XYPosition | undefined {
		const pointer = "clientX" in event ? event : (event.touches[0] ?? event.changedTouches[0]);
		return pointer ? screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY }) : undefined;
	}

	function dragNode(event: MouseEvent | TouchEvent, node: PIDNode, dragged: PIDNode[]) {
		// A group of symbols moves as it is. Only a single symbol is put inside
		// another, because a group has no one position to judge.
		const center = draggedPoint(event) ?? nodeCanvasCenter(node);
		const holderId =
			dragged.length === 1
				? node.data.kind === "junction" && center
					? paletteHolder("junction", snapPIDPosition(center))
					: holderUnder(node)
				: undefined;
		setHolderCandidate(holderId);
		setSplitCandidate(
			dragged.length === 1 && node.data.kind === "junction" && center && !holderId
				? connectionUnder(center, node)
				: undefined,
		);
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

			const originOffset = node ? pidGridOriginOffset(node) : undefined;
			const position = originOffset
				? snapPIDNodePosition(change.position, canvasOffset, originOffset)
				: snapPIDPosition(change.position, canvasOffset);

			return { ...change, position };
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
		const originOffset = node ? pidGridOriginOffset(node) : undefined;
		const gridPosition = originOffset
			? snapPIDNodePosition(helperPosition, canvasOffset, originOffset)
			: snapPIDPosition(helperPosition, canvasOffset);
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

	function dropNode(event: MouseEvent | TouchEvent, node: PIDNode, dragged: PIDNode[]) {
		const droppedNode = nodesRef.current.find((candidate) => candidate.id === node.id) ?? node;

		setDragging(false);
		setHolderCandidate(undefined);
		setSplitCandidate(undefined);
		setHelperLines({});
		helperLineSession.current = undefined;

		if (dragged.length === 1) {
			const center = draggedPoint(event) ?? nodeCanvasCenter(droppedNode);
			const holderId =
				droppedNode.data.kind === "junction" && center
					? paletteHolder("junction", snapPIDPosition(center))
					: holderUnder(droppedNode);
			if (holderId !== undefined && holderId !== droppedNode.parentId) {
				holdNode(droppedNode, holderId, droppedNode.data.kind === "junction" ? center : undefined);
			} else if (droppedNode.data.kind === "junction" && !holderId) {
				const split = center ? connectionUnder(center, droppedNode) : undefined;
				if (split) {
					performEdit(() => {
						changeCurrentNodes((current) =>
							holdersFirst(
								current.map((item) =>
									item.id === droppedNode.id
										? {
												...item,
												position: snapPIDPosition(split.point),
												parentId: undefined,
												extent: undefined,
												data: { ...item.data, contained: false },
											}
										: item,
								),
							),
						);
						splitConnection(split, droppedNode.id);
					});
				}
			}
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
						<span className="text-sm text-foreground-muted">Grid</span>
						<Switch aria-label="Grid" checked={showGrid} onChange={setShowGrid} />
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-foreground-muted">Handles</span>
						<Switch aria-label="Handles" checked={showHandles} onChange={setShowHandles} />
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
						<div className="flex flex-wrap items-center gap-2 border-l border-border pl-4">
							{actions}
						</div>
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
							readOnly && readOnlySelectionEnabled ? "pid-editor-canvas--selection-enabled" : "",
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
						onNodeClick={
							!readOnly || readOnlySelectionEnabled
								? (event, node) => {
										placeInspector(event);
										onSymbolClick?.(node.data.symbolKey ?? null);
									}
								: undefined
						}
						onEdgeClick={
							!readOnly || readOnlySelectionEnabled ? () => onSymbolClick?.(null) : undefined
						}
						onNodeDoubleClick={focusNodeLabel}
						onNodeDragStart={(_event, node, dragged) => startNodeDrag(node, dragged)}
						onNodeDrag={(event, node, dragged) => dragNode(event, node, dragged)}
						onNodeDragStop={(event, node, dragged) => dropNode(event, node, dragged)}
						onSelectionDragStart={() => {
							beginHistoryGroup();
							setDragging(true);
							setHelperLines({});
							setSplitCandidate(undefined);
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
						elementsSelectable={(!readOnly || readOnlySelectionEnabled) && activeTool === "select"}
						selectionKeyCode={null}
						deleteKeyCode={null}
						selectionOnDrag={!readOnly && activeTool === "select"}
					>
						{!readOnly ? (
							<PIDEditorToolbar
								activeTool={activeTool}
								setActiveTool={setActiveTool}
								showSelectionDetails={selectedItemCount > 0 && inspectorCollapsed}
								openSelectionDetails={() => setInspectorCollapsed(false)}
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

				{!readOnly && selectedItemCount > 0 ? (
					<aside
						ref={inspectorRef}
						style={{
							left: inspectorPosition?.x,
							top: inspectorCollapsed ? collapsedInspectorTop : inspectorPosition?.y,
						}}
						className={`absolute z-10 flex max-h-[calc(100%-1.5rem)] w-60 flex-col rounded-lg border border-border bg-surface/95 shadow-lg backdrop-blur-sm ${inspectorPosition || inspectorCollapsed ? "" : `bottom-3 ${inspectorSide === "right" ? "right-[16.5rem] max-lg:right-auto max-lg:left-14" : "left-14"}`}`}
					>
						<div
							className="flex min-h-11 cursor-grab touch-none items-center gap-2 border-b border-border px-2 active:cursor-grabbing"
							onPointerDown={startInspectorDrag}
							onPointerMove={continueInspectorDrag}
							onPointerUp={(event) => {
								if (inspectorDrag.current?.pointerId !== event.pointerId) return;
								event.stopPropagation();
								inspectorDrag.current = undefined;
							}}
							onPointerCancel={() => {
								inspectorDrag.current = undefined;
							}}
						>
							<button
								type="button"
								aria-label="Move selection panel"
								title="Move selection panel"
								className="cursor-grab touch-none rounded px-2 py-1 text-foreground-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus active:cursor-grabbing"
								onPointerDown={startInspectorDrag}
								onPointerMove={continueInspectorDrag}
								onPointerUp={(event) => {
									event.stopPropagation();
									inspectorDrag.current = undefined;
								}}
								onPointerCancel={() => {
									inspectorDrag.current = undefined;
								}}
								onKeyDown={(event) => {
									if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key))
										return;
									event.preventDefault();
									event.stopPropagation();
									const step = event.shiftKey ? PID_GRID_SIZE * 5 : PID_GRID_SIZE;
									const bounds = inspectorRef.current?.getBoundingClientRect();
									if (!bounds) return;
									moveInspectorTo(
										bounds.left +
											(event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
										bounds.top +
											(event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
										!inspectorCollapsed,
									);
								}}
							>
								<span aria-hidden="true">⠿</span>
							</button>
							<h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
								{inspectorTitle}
							</h3>
							<button
								type="button"
								aria-label={
									inspectorCollapsed ? "Expand selection panel" : "Collapse selection panel"
								}
								aria-expanded={!inspectorCollapsed}
								className="rounded px-2 py-1 text-xs font-medium text-foreground-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus"
								onClick={() => {
									if (!inspectorCollapsed && !inspectorPosition) {
										const bounds = canvas.current?.getBoundingClientRect();
										const panel = inspectorRef.current;
										if (bounds && panel) {
											setInspectorPosition({
												x: inspectorSide === "right" ? bounds.width - 516 : 56,
												y: Math.max(12, bounds.height - panel.offsetHeight - 12),
											});
										}
									}
									setInspectorCollapsed((collapsed) => !collapsed);
								}}
							>
								{inspectorCollapsed ? "Expand" : "Collapse"}
							</button>
						</div>

						{!inspectorCollapsed ? (
							<>
								{/*
							Only the fields scroll. The delete button therefore stays in
							view however many fields the selection has.
						*/}
								<div className="min-h-0 flex-1 overflow-y-auto px-4">
									{selectedNode ? (
										<div className="mt-4 space-y-5">
											{canAddCaption ? (
												<button
													type="button"
													title="Add a Junction inside this symbol and connect a new Instrument."
													className="rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm font-medium text-foreground hover:border-border-strong hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-focus"
													onClick={addCaption}
												>
													Add Caption
												</button>
											) : null}
											<label className="block">
												<span className="text-xs font-medium text-foreground-muted">
													{selectedNode.data.kind === "instrument" ? "Function" : "Label"}
												</span>
												<input
													ref={labelInput}
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
													<span className="text-xs font-medium text-foreground-muted">
														Equipment
													</span>
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
														<span className="text-xs font-medium text-foreground-muted">
															Common
														</span>
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
															ref={tagInput}
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
													<legend className="text-xs font-medium text-foreground-muted">
														Inlets
													</legend>
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
														Changing this removes the valve&apos;s connections because their
														directions reverse.
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
													What the line represents between the two symbols.
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
															<span className="text-xs font-medium text-foreground-muted">
																Arrows
															</span>
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
																	selectedEdge.data?.endArrow ??
																	defaultEndArrow(edgeKind(selectedEdge))
																}
																onChange={(endArrow) => editSelectedEdge({ endArrow })}
															/>
														</div>

														{(selectedEdge.data?.arrowPositions ?? []).length > 0 ? (
															<div className="mt-3 space-y-2">
																{(selectedEdge.data?.arrowPositions ?? []).map(
																	(position, index) => (
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
																	),
																)}
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
													<th className="py-0.5 text-left font-medium text-foreground">
														Drag symbol
													</th>
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
							</>
						) : null}
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
							<p aria-live="polite" className="mt-2 text-xs text-foreground-muted">
								{PID_EDGE_KINDS[nextEdgeKind].description}
							</p>
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
										const isOpen = paletteFilter.trim() ? true : openPaletteGroups.has(group.label);

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
																{symbol.matchedAlias ? (
																	<span className="text-[0.625rem] text-foreground-muted">
																		Matches: {symbol.matchedAlias}
																	</span>
																) : null}
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

function junctionHandles(
	direction: XYPosition,
	orientation: PIDOrientation,
): { incoming: string; outgoing: string } | undefined {
	const incomingSide =
		Math.abs(direction.x) > Math.abs(direction.y)
			? direction.x > 0
				? "left"
				: "right"
			: direction.y > 0
				? "top"
				: "bottom";
	const outgoingSide = { left: "right", right: "left", top: "bottom", bottom: "top" }[incomingSide];
	const ports = junctionPorts.map((port) => rotatePIDPort(port, orientation));
	const incoming = ports.find((port) => port.side === incomingSide)?.id;
	const outgoing = ports.find((port) => port.side === outgoingSide)?.id;
	return incoming && outgoing ? { incoming, outgoing } : undefined;
}

function closestPointOnPath(path: SVGPathElement, point: XYPosition) {
	const total = path.getTotalLength();
	if (total <= 0) return undefined;

	let best:
		| { point: XYPosition; along: number; distance: number; direction: XYPosition; total: number }
		| undefined;
	const steps = Math.ceil(total / 4);
	let previous = path.getPointAtLength(0);

	for (let index = 1; index <= steps; index++) {
		const start = ((index - 1) / steps) * total;
		const end = (index / steps) * total;
		const next = path.getPointAtLength(end);
		const dx = next.x - previous.x;
		const dy = next.y - previous.y;
		const squaredLength = dx * dx + dy * dy;
		if (squaredLength > 0) {
			const fraction = Math.max(
				0,
				Math.min(1, ((point.x - previous.x) * dx + (point.y - previous.y) * dy) / squaredLength),
			);
			const projected = { x: previous.x + fraction * dx, y: previous.y + fraction * dy };
			const distance = Math.hypot(point.x - projected.x, point.y - projected.y);
			if (!best || distance < best.distance) {
				best = {
					point: projected,
					along: start + fraction * (end - start),
					distance,
					direction: { x: dx, y: dy },
					total,
				};
			}
		}

		previous = next;
	}

	return best;
}
