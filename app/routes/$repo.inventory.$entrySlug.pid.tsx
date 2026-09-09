import { useRouteLoaderData } from "react-router";

import { PIDEditor } from "~/app/components/PIDEditor.tsx";
import { Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

import type { loader as entryLoader } from "./$repo.inventory.$entrySlug.tsx";

export default function RepoInventoryEntrySlugPID() {
	const data = useRouteLoaderData<typeof entryLoader>("routes/$repo.inventory.$entrySlug")!;

	if (data.entry.kind !== "rig") {
		return <Text>A P&amp;ID can be drawn for a rig.</Text>;
	}

	return (
		<section>
			<Subheading>Piping and instrumentation diagram</Subheading>
			<Text className="mt-2">
				Arrange equipment and connect it to describe how this rig is configured.
			</Text>

			<PIDEditor />
		</section>
	);
}
