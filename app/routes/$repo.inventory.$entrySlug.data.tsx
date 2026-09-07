import { ChartBarIcon, ChevronRightIcon } from "@heroicons/react/20/solid";
import { Link } from "react-router";

import { TimeSeriesSparkline } from "~/app/components/TimeSeriesSparkline.tsx";
import { exampleRecordings } from "~/app/examples/exampleRecordings.ts";
import { Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

export default function RepoInventoryEntrySlugData() {
	return (
		<section>
			<Subheading>Recorded data</Subheading>
			<Text className="mt-2">Datasets recorded using this rig.</Text>

			<ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
				{exampleRecordings.map((recording) => (
					<li key={recording.slug}>
						<Link
							to={recording.slug}
							className="grid items-center gap-4 p-4 hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus lg:grid-cols-[minmax(0,1fr)_auto]"
						>
							<span className="flex min-w-0 items-center gap-4">
								<span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-muted text-foreground-muted">
									<ChartBarIcon className="size-5" />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block font-semibold text-foreground">{recording.title}</span>
									<span className="mt-1 block text-sm text-foreground-muted">
										{recording.summary}
									</span>
								</span>
							</span>

							<span className="flex min-w-0 items-center gap-3">
								<span className="grid min-w-0 flex-1 grid-cols-2 gap-3 lg:w-96 lg:flex-none">
									{recording.previews.map((preview) => (
										<TimeSeriesSparkline key={preview.label} {...preview} />
									))}
								</span>
								<ChevronRightIcon className="size-5 shrink-0 text-foreground-muted" />
							</span>
						</Link>
					</li>
				))}
			</ul>
		</section>
	);
}
