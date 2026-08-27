import { redirect } from "react-router";

/**
 * Locations is the landing page inside a repository.
 */
export function loader({ params }: { params: { repo: string } }) {
	return redirect(`/${params.repo}/inventory`);
}
