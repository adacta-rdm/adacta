import type { MiddlewareFunction } from "react-router";

import { services } from "~/app/.server/context.ts";
import { RepoAccess, RepositoryAccessDeniedError } from "~/app/services/RepoAccess.ts";

/**
 * Binds the repository named in the route to this request's scope, after
 * checking the authenticated user's grant. Runs after sessionAuth, which
 * establishes that user.
 *
 * A missing parameter is a 404; a missing grant is a 403.
 */
export const repositoryAccess = (async ({ params, context }) => {
	const { repo } = params;

	if (!repo) {
		throw new Response("Repository not found", { status: 404 });
	}

	try {
		await context.get(services).get(RepoAccess).selectRepository(repo);
	} catch (error) {
		if (!(error instanceof RepositoryAccessDeniedError)) throw error;

		throw new Response(`No access to repository "${repo}"`, { status: 403 });
	}
}) satisfies MiddlewareFunction<Response>;
