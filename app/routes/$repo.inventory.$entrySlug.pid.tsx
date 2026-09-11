import { and, asc, eq, isNull } from "drizzle-orm";
import { useCallback, useState } from "react";
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
import type { PIDGraph } from "~/app/lib/PID.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { Button } from "~/catalyst-ui/button.tsx";
import { Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { PIDEdge } from "~/drizzle/schema/repo.PIDEdge.ts";
import { PIDNode } from "~/drizzle/schema/repo.PIDNode.ts";

import type { loader as entryLoader } from "./$repo.inventory.$entrySlug.tsx";
import type { Route } from "./+types/$repo.inventory.$entrySlug.pid.ts";

export function loader({ context, params }: Route.LoaderArgs) {
	const db = context.get(services).get(RepoDB);
	const entry = getRig(db, params.entrySlug);

	if (!entry) {
		throw new Response(`Rig "${params.entrySlug}" not found.`, { status: 404 });
	}

	const nodes = db
		.select({
			id: PIDNode.id,
			kind: PIDNode.kind,
			label: PIDNode.label,
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

	const edges = db
		.select({
			id: PIDEdge.id,
			source: PIDEdge.sourceNodeId,
			target: PIDEdge.targetNodeId,
			sourceHandle: PIDEdge.sourceHandle,
			targetHandle: PIDEdge.targetHandle,
		})
		.from(PIDEdge)
		.where(eq(PIDEdge.inventoryEntryId, entry.id))
		.orderBy(asc(PIDEdge.drawingOrder))
		.all();

	return {
		graph: {
			nodes,
			edges,
		} satisfies PIDGraph,
	};
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const container = context.get(services);
	const db = container.get(RepoDB);
	const entry = getRig(db, params.entrySlug);

	if (!entry) {
		throw new Response(`Rig "${params.entrySlug}" not found.`, { status: 404 });
	}

	const graph = parseGraph((await request.formData()).get("graph"));

	if (!graph) {
		return data({ error: "The diagram contains invalid data." }, { status: 400 });
	}

	const createdAt = new Date();
	const creatorId = container.get(Security).userId;

	// A save describes the complete current diagram. Replacing both collections
	// also removes symbols and connections that disappeared from the canvas.
	db.transaction((transaction) => {
		transaction.delete(PIDEdge).where(eq(PIDEdge.inventoryEntryId, entry.id)).run();
		transaction.delete(PIDNode).where(eq(PIDNode.inventoryEntryId, entry.id)).run();

		if (graph.nodes.length > 0) {
			transaction
				.insert(PIDNode)
				.values(
					graph.nodes.map((node, drawingOrder) => ({
						id: node.id,
						inventoryEntryId: entry.id,
						kind: node.kind,
						label: node.label,
						drawingOrder,
						orientation: node.orientation,
						positionX: node.position.x,
						positionY: node.position.y,
						metadataCreatorId: creatorId,
						metadataCreationTimestamp: createdAt,
					})),
				)
				.run();
		}

		if (graph.edges.length > 0) {
			transaction
				.insert(PIDEdge)
				.values(
					graph.edges.map((edge, drawingOrder) => ({
						id: edge.id,
						inventoryEntryId: entry.id,
						sourceNodeId: edge.source,
						targetNodeId: edge.target,
						sourceHandle: edge.sourceHandle,
						targetHandle: edge.targetHandle,
						drawingOrder,
						metadataCreatorId: creatorId,
						metadataCreationTimestamp: createdAt,
					})),
				)
				.run();
		}
	});

	return redirect(`/${params.repo}/inventory/${encodeURIComponent(params.entrySlug)}/pid`, 303);
}

export default function RepoInventoryEntrySlugPID({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const parentData = useRouteLoaderData<typeof entryLoader>("routes/$repo.inventory.$entrySlug")!;
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const navigation = useNavigation();
	const editing = searchParams.has("edit");
	const saving = navigation.state === "submitting";
	const [serializedGraph, setSerializedGraph] = useState(() => JSON.stringify(loaderData.graph));

	const recordGraph = useCallback((graph: PIDGraph) => {
		setSerializedGraph(JSON.stringify(graph));
	}, []);

	if (parentData.entry.kind !== "rig") {
		return <Text>A P&amp;ID can be drawn for a rig.</Text>;
	}

	return (
		<section>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<Subheading>Piping and instrumentation diagram</Subheading>
					<Text className="mt-2">
						{editing
							? "Arrange equipment and connect it to describe how this rig is configured."
							: "The diagram describes how this rig is configured."}
					</Text>
				</div>

				{editing ? (
					<Form method="post" preventScrollReset className="flex items-center gap-2">
						<input type="hidden" name="graph" value={serializedGraph} />
						<Button
							type="button"
							outline
							onClick={() => void navigate(".", { preventScrollReset: true })}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={saving}>
							{saving ? "Saving…" : "Save diagram"}
						</Button>
					</Form>
				) : (
					<Button href="?edit">Edit diagram</Button>
				)}
			</div>

			{actionData?.error ? (
				<p role="alert" className="mt-4 text-sm text-danger">
					{actionData.error}
				</p>
			) : null}

			<PIDEditor
				value={loaderData.graph}
				readOnly={!editing}
				onChange={editing ? recordGraph : undefined}
			/>
		</section>
	);
}

function getRig(db: RepoDB, slug: string) {
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

	const edgeIds = new Set(parsed.edges.map((edge) => edge.id));
	if (
		parsed.edges.some(
			(edge) => edge.id.length === 0 || !nodeIds.has(edge.source) || !nodeIds.has(edge.target),
		) ||
		edgeIds.size !== parsed.edges.length
	) {
		return;
	}

	return parsed;
}
