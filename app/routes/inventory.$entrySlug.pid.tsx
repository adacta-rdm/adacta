import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	data,
	Form,
	redirect,
	useNavigate,
	useNavigation,
	useRouteLoaderData,
	useSearchParams,
} from "react-router";

import { isPIDGraph } from "@/tsrc/app/lib/PID";
import { services } from "~/app/.server/context.ts";
import { PIDEditor } from "~/app/components/PIDEditor.tsx";
import { PIDSidecarPanel } from "~/app/components/PIDSidecarPanel.tsx";
import { usePIDWorkspace } from "~/app/components/PIDWorkspaceContext.tsx";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { useRightSidebarControls } from "~/app/layout/SidebarLayout.tsx";
import type { RightSidebarHandle } from "~/app/layout/routeSidebar.ts";
import type { PIDGraph, PIDLength, PIDLengthUnit } from "~/app/lib/PID.ts";
import { isValidArrowConfiguration } from "~/app/lib/PIDEdgeArrows.ts";
import { parentsFirst } from "~/app/lib/parentsFirst.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { PIDManager } from "~/app/services/PIDManager.ts";
import { pidSidecarSkeleton } from "~/app/services/PIDSidecar.ts";
import { loadSidecarEditorNodes } from "~/app/services/PIDSidecarEditorData.ts";
import { Security } from "~/app/services/Security.ts";
import { Button } from "~/catalyst-ui/button.tsx";
import { Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { PIDEdge } from "~/drizzle/schema/PIDEdge.ts";
import { PIDNode } from "~/drizzle/schema/PIDNode.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";

import type { Route } from "./+types/inventory.$entrySlug.pid.ts";
import type { loader as entryLoader } from "./inventory.$entrySlug.tsx";

export const handle = {
	breadcrumb: "P&ID",
	rightSidebar: {
		id: "pid-dataset-sidecar",
		title: "Dataset sidecar",
		defaultOpen: false,
		defaultWidth: 480,
		component: DatasetSidecarSidebar,
	},
} satisfies BreadcrumbHandle & RightSidebarHandle;

function DatasetSidecarSidebar() {
	const loaderData = useRouteLoaderData<typeof loader>("routes/inventory.$entrySlug.pid");
	const {
		autoZoomToSelection,
		setAutoZoomToSelection,
		symbolFocus,
		selectedSymbolKey,
		setSelectedSymbolKey,
		focusColumnSymbol,
		focusDiagramNode,
		drafts,
		setDraft,
		csvFile,
		setCsvFile,
	} = usePIDWorkspace();
	if (!loaderData) return null;

	return (
		<PIDSidecarPanel
			fileName={`${loaderData.rigSlug}-sidecar.toml`}
			rigSlug={loaderData.rigSlug}
			initialToml={loaderData.initialToml}
			draft={drafts[loaderData.rigSlug]}
			setDraft={setDraft}
			csvFile={csvFile}
			setCsvFile={setCsvFile}
			omissions={loaderData.sidecarOmissions}
			onShowSymbol={focusDiagramNode}
			nodes={loaderData.sidecarNodes}
			autoZoomToSelection={autoZoomToSelection}
			onAutoZoomToSelectionChange={setAutoZoomToSelection}
			selectedSymbolKey={selectedSymbolKey}
			symbolFocus={symbolFocus}
			onSymbolSelectionChange={setSelectedSymbolKey}
			onColumnFocus={focusColumnSymbol}
		/>
	);
}

export async function loader({ context, params }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const entry = await getRig(db, params.entrySlug);

	if (!entry) {
		throw new Response(`Rig "${params.entrySlug}" not found.`, { status: 404 });
	}

	const nodeRows = await db
		.select({
			id: PIDNode.id,
			kind: PIDNode.kind,
			label: PIDNode.label,
			symbolKey: PIDNode.symbolKey,
			equipmentId: PIDNode.equipmentEntryId,
			sampleId: PIDNode.sampleId,
			secondaryLabel: PIDNode.secondaryLabel,
			parentId: PIDNode.parentNodeId,
			inletCount: PIDNode.inletCount,
			orientation: PIDNode.orientation,
			position: {
				x: PIDNode.positionX,
				y: PIDNode.positionY,
			},
		})
		.from(PIDNode)
		.where(eq(PIDNode.inventoryEntryId, entry.id))
		.orderBy(asc(PIDNode.drawingOrder))
		.all();
	const nodes = nodeRows.map(({ symbolKey, equipmentId, sampleId, ...node }) => ({
		...node,
		...(symbolKey === null ? {} : { symbolKey }),
		...(equipmentId === null ? {} : { equipmentId }),
		...(sampleId === null ? {} : { sampleId }),
	}));

	// A length is stored as a value and a unit in two columns. The graph carries
	// it as one object, so the rows are reshaped below.
	const edgeRows = await db
		.select()
		.from(PIDEdge)
		.where(eq(PIDEdge.inventoryEntryId, entry.id))
		.orderBy(asc(PIDEdge.drawingOrder))
		.all();
	const edges = edgeRows.map((edge) => ({
		id: edge.id,
		kind: edge.kind,
		endArrow: edge.endArrow,
		arrowPositions: edge.arrowPositions,
		weight: edge.weight,
		material: edge.material,
		innerDiameter: pidLength(edge.innerDiameterValue, edge.innerDiameterUnit),
		outerDiameter: pidLength(edge.outerDiameterValue, edge.outerDiameterUnit),
		length: pidLength(edge.lengthValue, edge.lengthUnit),
		source: edge.sourceNodeId,
		target: edge.targetNodeId,
		sourceHandle: edge.sourceHandle,
		targetHandle: edge.targetHandle,
	}));
	const equipment = await db
		.select({ id: InventoryEntry.id, name: InventoryEntry.name, productName: Product.name })
		.from(InventoryEntry)
		.leftJoin(Product, eq(Product.id, InventoryEntry.productId))
		.where(and(eq(InventoryEntry.kind, "equipment"), isNull(InventoryEntry.metadataArchivedAt)))
		.orderBy(asc(InventoryEntry.name))
		.all();
	const samples = await db
		.select({ id: Sample.id, name: Sample.name, batchName: SampleBatch.name })
		.from(Sample)
		.innerJoin(SampleBatch, eq(SampleBatch.id, Sample.batchId))
		.where(and(isNull(Sample.metadataArchivedAt), isNull(SampleBatch.metadataArchivedAt)))
		.orderBy(asc(SampleBatch.name), asc(Sample.name))
		.all();
	const user = await db
		.select({ email: User.email })
		.from(User)
		.where(eq(User.id, context.get(services).get(Security).userId))
		.get();
	if (!user) throw new Response("User not found.", { status: 404 });
	const sidecar = await pidSidecarSkeleton(db, entry.id, user.email);
	const graph = { nodes, edges } as PIDGraph;

	return {
		graph,
		equipment,
		samples,
		initialToml: sidecar.initialToml,
		sidecarOmissions: sidecar.omissions,
		sidecarNodes: await loadSidecarEditorNodes(db, graph),
		rigSlug: params.entrySlug,
	};
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const entry = await getRig(db, params.entrySlug);

	if (!entry) {
		throw new Response(`Rig "${params.entrySlug}" not found.`, { status: 404 });
	}

	const graph = parseGraph((await request.formData()).get("graph"));

	if (!graph) {
		return data({ error: "The diagram contains invalid data." }, { status: 400 });
	}
	const symbolKeys = graph.nodes.flatMap((node) => (node.symbolKey ? [node.symbolKey] : []));
	if (
		graph.nodes.some(
			(node) =>
				node.symbolKey !== undefined &&
				node.symbolKey !== null &&
				(!node.symbolKey.trim() || node.symbolKey !== node.symbolKey.trim()),
		)
	) {
		return data(
			{ error: "Diagram symbol keys must be nonempty and have no leading or trailing spaces." },
			{ status: 400 },
		);
	}
	if (new Set(symbolKeys).size !== symbolKeys.length) {
		return data({ error: "Diagram symbol keys must be unique within a rig." }, { status: 400 });
	}
	if (
		graph.nodes.some((node) =>
			node.kind === "sample" ? node.equipmentId != null : node.sampleId != null,
		)
	) {
		return data(
			{ error: "Link samples to sample symbols and equipment to other symbols." },
			{ status: 400 },
		);
	}
	const equipmentIds = [
		...new Set(graph.nodes.flatMap((node) => (node.equipmentId == null ? [] : [node.equipmentId]))),
	];
	if (equipmentIds.length) {
		const available = await db
			.select({ id: InventoryEntry.id })
			.from(InventoryEntry)
			.where(
				and(
					inArray(InventoryEntry.id, equipmentIds),
					eq(InventoryEntry.kind, "equipment"),
					isNull(InventoryEntry.metadataArchivedAt),
				),
			)
			.all();
		if (available.length !== equipmentIds.length)
			return data({ error: "The diagram refers to unavailable equipment." }, { status: 400 });
	}
	const sampleIds = [
		...new Set(graph.nodes.flatMap((node) => (node.sampleId == null ? [] : [node.sampleId]))),
	];
	if (sampleIds.length) {
		const available = await db
			.select({ id: Sample.id })
			.from(Sample)
			.innerJoin(SampleBatch, eq(SampleBatch.id, Sample.batchId))
			.where(
				and(
					inArray(Sample.id, sampleIds),
					isNull(Sample.metadataArchivedAt),
					isNull(SampleBatch.metadataArchivedAt),
				),
			)
			.all();
		if (available.length !== sampleIds.length)
			return data({ error: "The diagram refers to unavailable samples." }, { status: 400 });
	}

	await container.get(PIDManager).replace(entry.id, graph);

	return redirect(`/inventory/${encodeURIComponent(params.entrySlug)}/pid`, 303);
}

export default function InventoryEntrySlugPid({ loaderData, actionData }: Route.ComponentProps) {
	const parentData = useRouteLoaderData<typeof entryLoader>("routes/inventory.$entrySlug")!;
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const editing = searchParams.has("edit");
	const saving = navigation.state === "submitting";
	const [serializedGraph, setSerializedGraph] = useState(() => JSON.stringify(loaderData.graph));
	const { autoZoomToSelection, selectedSymbolKey, focusedSymbol, focusedNode, focusSymbol } =
		usePIDWorkspace();
	const sidecar = useRightSidebarControls();
	const diagram = useRef<HTMLDivElement>(null);
	// A new editor discards the draft and undo history when edit mode ends.
	const editorKey = `${loaderData.rigSlug}:${editing ? "edit" : "view"}`;

	const recordGraph = useCallback((graph: PIDGraph) => {
		setSerializedGraph(JSON.stringify(graph));
	}, []);
	function cancelEdit() {
		setSerializedGraph(JSON.stringify(loaderData.graph));
		void navigate(".", { preventScrollReset: true });
	}

	useEffect(() => {
		if (focusedNode) diagram.current?.scrollIntoView({ block: "nearest" });
	}, [focusedNode]);

	if (parentData.entry.kind !== "rig") {
		return <Text>A P&amp;ID can be drawn for a rig.</Text>;
	}

	/*
		Saving belongs to the tool bar of the editor. The canvas can be made to
		fill the window, and a button left on the page would then be out of
		reach.
	*/
	const actions = (
		<>
			{editing ? (
				<Form method="post" preventScrollReset className="flex items-center gap-2">
					<input type="hidden" name="graph" value={serializedGraph} />
					<Button type="button" outline onClick={cancelEdit}>
						Cancel
					</Button>
					<Button type="submit" disabled={saving}>
						{saving ? "Saving…" : "Save diagram"}
					</Button>
				</Form>
			) : (
				<Button href="?edit">Edit diagram</Button>
			)}
			{!sidecar.isOpen ? (
				<Button type="button" outline onClick={sidecar.open}>
					Dataset sidecar
				</Button>
			) : null}
		</>
	);

	return (
		<section>
			<div>
				<Subheading>Piping and instrumentation diagram</Subheading>
				<Text className="mt-2">
					{editing
						? "Arrange equipment and connect it to describe how this rig is configured."
						: "The diagram describes how this rig is configured."}
				</Text>
			</div>

			{actionData?.error ? (
				<p role="alert" className="mt-4 text-sm text-danger">
					{actionData.error}
				</p>
			) : null}

			<div ref={diagram} className="mt-6 min-w-0">
				<PIDEditor
					key={editorKey}
					value={loaderData.graph}
					equipment={loaderData.equipment}
					samples={loaderData.samples}
					readOnly={!editing}
					readOnlySelectionEnabled={sidecar.isOpen}
					onChange={editing ? recordGraph : undefined}
					selectedSymbolKey={selectedSymbolKey}
					focusedSymbol={focusedSymbol}
					focusedNode={focusedNode}
					autoZoomToSelection={autoZoomToSelection}
					onSymbolClick={focusSymbol}
					actions={actions}
				/>
			</div>
		</section>
	);
}

async function getRig(db: ApplicationDatabase, slug: string) {
	return db
		.select({ id: InventoryEntry.id })
		.from(InventoryEntry)
		.where(
			and(
				eq(InventoryEntry.slug, slug),
				eq(InventoryEntry.kind, "rig"),
				isNull(InventoryEntry.metadataArchivedAt),
			),
		)
		.get();
}

/**
 * Returns a length, or null where none was recorded.
 *
 * The value and the unit are kept in two columns. A table check makes sure
 * that either both are written or neither is.
 */
function pidLength(value: number | null, unit: PIDLengthUnit | null): PIDLength | null {
	if (value === null || unit === null) return null;

	return { value, unit };
}

function parseGraph(value: FormDataEntryValue | null): PIDGraph | undefined {
	if (typeof value !== "string") return;

	let parsed: unknown;

	try {
		parsed = JSON.parse(value);
	} catch {
		return;
	}

	if (!isPIDGraph(parsed)) return;

	// The generated validator checks each value in isolation. These checks cover
	// identities and references that depend on the graph as a whole.
	const nodeIds = new Set(parsed.nodes.map((node) => node.id));
	if (parsed.nodes.some((node) => node.id.length === 0) || nodeIds.size !== parsed.nodes.length) {
		return;
	}

	// A symbol that sits inside another names it. The name must belong to the
	// same diagram.
	if (parsed.nodes.some((node) => node.parentId !== null && !nodeIds.has(node.parentId))) {
		return;
	}

	// Symbols cannot sit inside each other. For example, a symbol inside itself
	// is refused.
	if (parentsFirst(parsed.nodes) === undefined) return;

	const edgeIds = new Set(parsed.edges.map((edge) => edge.id));
	if (
		parsed.edges.some(
			(edge) =>
				edge.id.length === 0 ||
				!nodeIds.has(edge.source) ||
				!nodeIds.has(edge.target) ||
				!isValidArrowConfiguration(edge.kind, edge.endArrow, edge.arrowPositions),
		) ||
		edgeIds.size !== parsed.edges.length
	) {
		return;
	}

	return parsed;
}
