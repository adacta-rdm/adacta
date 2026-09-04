import { Heading, Subheading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";

export { SectionErrorBoundary as ErrorBoundary } from "~/app/route-components/SectionErrorBoundary";

export function meta() {
	return [{ title: "Catalog — Adacta" }];
}

export default function Catalog() {
	return (
		<>
			<Heading>Catalog</Heading>
			<Subheading className="mt-1">Not built yet.</Subheading>
			<Text className="mt-6">Nothing here yet.</Text>
		</>
	);
}
