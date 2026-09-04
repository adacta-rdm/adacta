import { Link } from "react-router";

import { Heading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";

import type { Route } from "./+types/$repo.samples._index";

export default function SamplesIndex({ params }: Route.ComponentProps) {
	return (
		<>
			<Heading>Samples</Heading>
			<Text className="mt-2">
				Select a batch to see its samples, or create a batch for newly prepared material.
			</Text>
			<Link
				to={`/${params.repo}/samples/new`}
				className="mt-6 inline-flex rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
			>
				Create batch
			</Link>
		</>
	);
}
