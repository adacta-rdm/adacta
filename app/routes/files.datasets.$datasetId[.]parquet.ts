import { eq } from "drizzle-orm";

import { services } from "~/app/.server/context.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Dataset } from "~/drizzle/schema/Dataset.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

import type { Route } from "./+types/files.datasets.$datasetId[.]parquet.ts";

export async function loader({ context, params }: Route.LoaderArgs) {
	const id = parseId53(params.datasetId);
	if (id === undefined) throw new Response("Dataset not found.", { status: 404 });
	const container = context.get(services);
	const dataset = await container
		.get(ApplicationDatabase)
		.select({ dataPath: Dataset.dataPath })
		.from(Dataset)
		.where(eq(Dataset.id, id))
		.get();
	if (!dataset) throw new Response("Dataset not found.", { status: 404 });
	const stream = await container.get(StorageEngine).read(dataset.dataPath);
	return new Response(stream, {
		headers: {
			"Content-Type": "application/vnd.apache.parquet",
			"Content-Disposition": `attachment; filename="dataset-${id}.parquet"`,
		},
	});
}
