import { services } from "~/app/context";
import type { MiddlewareArgs } from "~/app/middleware/types";
import { RepoAccess, RepositoryAccessDeniedError } from "~/app/services/RepoAccess";

/**
 * Binds the repository named in the route to this request's scope, after
 * checking the authenticated user's grant. Runs after sessionAuth, which
 * establishes that user.
 *
 * A missing parameter is a 404; a missing grant is a 403.
 */
export function repositoryAccess({ params, context }: MiddlewareArgs): void {
	const { repo } = params;

	if (!repo) {
		throw new Response("Repository not found", { status: 404 });
	}

	try {
		context.get(services).get(RepoAccess).selectRepository(repo);
	} catch (error) {
		if (!(error instanceof RepositoryAccessDeniedError)) throw error;

		throw new Response(`No access to repository "${repo}"`, { status: 403 });
	}
}
