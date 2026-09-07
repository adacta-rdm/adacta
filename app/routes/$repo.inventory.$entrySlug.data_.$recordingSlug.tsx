import { TimeSeriesChart } from "~/app/components/TimeSeriesChart.tsx";
import { exampleRecording } from "~/app/examples/exampleRecordings.ts";
import { Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

import type { Route } from "./+types/$repo.inventory.$entrySlug.data_.$recordingSlug.ts";

export function meta({ loaderData }: Route.MetaArgs) {
	return [{ title: loaderData ? `${loaderData.title} — Adacta` : "Recorded data — Adacta" }];
}

export function loader({ params }: Route.LoaderArgs) {
	const recording = exampleRecording(params.recordingSlug);
	if (!recording) {
		throw new Response(`Recording "${params.recordingSlug}" not found.`, { status: 404 });
	}

	return { title: recording.title };
}

export default function RepoInventoryEntrySlugDataRecordingSlug({ params }: Route.ComponentProps) {
	const recording = exampleRecording(params.recordingSlug);
	if (!recording) return null;

	return (
		<div className="space-y-8">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<Subheading>{recording.title}</Subheading>
					<Text className="mt-2">{recording.description}</Text>
				</div>

				<a
					href={recording.fileUrl}
					download={recording.fileName}
					className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
				>
					Download CSV
				</a>
			</div>

			<div className={recording.charts.length > 1 ? "grid gap-6 xl:grid-cols-2" : undefined}>
				{recording.charts.map((chart) => (
					<TimeSeriesChart key={chart.label} {...chart} />
				))}
			</div>
		</div>
	);
}
