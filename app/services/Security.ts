import { Service } from "~/lib/service-container/ServiceContainer.ts";

/**
 * The authenticated identity for the current request scope.
 *
 * Better Auth generates user ids as text. This therefore holds a plain string.
 */
@Service()
export class Security {
	#currentUserId: string | undefined;

	setCurrentUserId(userId: string): void {
		if (this.#currentUserId !== undefined) {
			throw new Error("The current user can only be set once per scope.");
		}

		this.#currentUserId = userId;
	}

	get userId(): string {
		if (this.#currentUserId === undefined) {
			throw new Error(
				"No current user is available. Ensure the authentication middleware ran for this scope.",
			);
		}

		return this.#currentUserId;
	}
}
