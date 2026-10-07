import { eq } from "drizzle-orm";

import { services } from "~/app/.server/context.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { MeasurementDataset } from "~/drizzle/schema/MeasurementDataset.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

import type { Route } from "./+types/files.datasets.$datasetId[.]parquet.ts";

export async function loader({ context, params }: Route.LoaderArgs) {
	const id = parseId53(params.datasetId);
	if (id === undefined) throw new Response("Measurement not found.", { status: 404 });
	const container = context.get(services);
	const dataset = await container
		.get(ApplicationDatabase)
		.select()
		.from(MeasurementDataset)
		.where(eq(MeasurementDataset.id, id))
		.get();
	if (!dataset) throw new Response("Measurement not found.", { status: 404 });
	const stream = await container.get(StorageEngine).read(dataset.dataPath);
	return new Response(stream, {
		headers: {
			"Content-Type": "application/vnd.apache.parquet",
			"Content-Disposition": `attachment; filename="measurement-${id}.parquet"`,
		},
	});
}
