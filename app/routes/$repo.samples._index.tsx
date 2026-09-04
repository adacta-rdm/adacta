/**
 * Every batch in the repository.
 *
 * The most recently prepared batch comes first, because a laboratory usually
 * works on what it just made. Batches prepared on the same day are ordered by
 * name.
 */
import { PlusIcon } from "@heroicons/react/20/solid";
import { count, desc, isNull } from "drizzle-orm";
import { Link } from "react-router";

import { services } from "~/app/.server/context";
import { formatBatchComposition } from "~/app/lib/batchComposition";
import { formatCalendarDate } from "~/app/lib/dates";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { Heading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";
import { Sample } from "~/drizzle/schema/repo.Sample";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";

import type { Route } from "./+types/$repo.samples._index";

export async function loader({ context }: Route.LoaderArgs) {
	const container = context.get(services);
	const [db, access] = container.get(RepoDB, RepoAccess);

	const rows = db
		.select()
		.from(SampleBatch)
		.where(isNull(SampleBatch.metadataArchivedAt))
		.orderBy(desc(SampleBatch.preparationDate), SampleBatch.name)
		.all();

	// One count for every batch, rather than one query per row.
	const sampleCounts = new Map(
		db
			.select({ batchId: Sample.batchId, total: count() })
			.from(Sample)
			.where(isNull(Sample.metadataArchivedAt))
			.groupBy(Sample.batchId)
			.all()
			.map((row) => [row.batchId, row.total]),
	);

	// The list holds the users who may open the repository. A preparer whose
	// grant was revoked is therefore absent from it, and the lookup returns
	// undefined.
	const users = new Map((await access.users()).map((user) => [user.id, user]));

	return {
		batches: rows.map((batch) => ({
			slug: batch.slug,
			name: batch.name,
			preparationDate: batch.preparationDate,
			activeMaterial: batch.activeMaterial,
			support: batch.support,
			preparedBy: users.get(batch.preparedById),
			sampleCount: sampleCounts.get(batch.id) ?? 0,
		})),
	};
}

export default function RepoSamplesIndex({ loaderData, params }: Route.ComponentProps) {
	const { batches } = loaderData;

	return (
		<div className="space-y-8">
			<div>
				<Heading>Samples</Heading>
				<Text className="mt-2">
					Material prepared together forms a batch. Each batch holds the physical samples cut from
					it.
				</Text>
			</div>

			{batches.length === 0 ? (
				<Text>No batches have been recorded yet.</Text>
			) : (
				<ul className="divide-y divide-border">
					{batches.map((batch) => (
						<li key={batch.slug}>
							<Link
								to={`/${params.repo}/samples/${batch.slug}`}
								className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:bg-surface-muted"
							>
								<span className="font-medium text-foreground">{batch.name}</span>

								<span className="flex-1 text-sm text-foreground-muted">
									{formatBatchComposition(batch) ?? "No composition"}
								</span>

								<span className="text-sm text-foreground-muted">
									{batch.sampleCount === 1 ? "1 sample" : `${batch.sampleCount} samples`}
								</span>

								<span className="text-sm text-foreground-muted">
									{batch.preparedBy?.name ?? "Unknown"}
								</span>

								<time
									dateTime={batch.preparationDate}
									className="w-28 text-right text-sm text-foreground-muted"
								>
									{formatCalendarDate(batch.preparationDate)}
								</time>
							</Link>
						</li>
					))}
				</ul>
			)}

			<Link
				to={`/${params.repo}/samples/new`}
				className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
			>
				<PlusIcon className="size-4" />
				Create batch
			</Link>
		</div>
	);
}
