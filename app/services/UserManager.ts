import { asc, count, eq } from "drizzle-orm";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Account, User } from "~/drizzle/schema/BetterAuth.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";
import { isUniqueConstraintOn } from "~/lib/sqlite-errors/isUniqueConstraintOn.ts";

/**
 * An email address already identifies a user in the application database.
 */
export class UserEmailAlreadyExistsError extends Error {
	constructor(public readonly email: string) {
		super(`A user with the email address "${email}" already exists.`);
		this.name = "UserEmailAlreadyExistsError";
	}
}

export type UserWithSignIn = {
	id: string;
	name: string;
	email: string;
	canSignIn: boolean;
};

/**
 * Lists users with their sign-in state.
 * Creates identities for people credited in laboratory records.
 */
@Service(ApplicationDatabase)
export class UserManager {
	constructor(private db: ApplicationDatabase) {}

	/**
	 * Returns every user, ordered by name.
	 *
	 * For example, a form that credits one of them as the author of a record
	 * offers this list. Two users with the same name are ordered by id. The
	 * order is therefore stable.
	 */
	async users(): Promise<{ id: string; name: string }[]> {
		return (await this.usersWithSignIn()).map(({ id, name }) => ({ id, name }));
	}

	/**
	 * Returns every user with their sign-in account state.
	 *
	 * A user can be credited in laboratory records without holding a sign-in
	 * account. The account state is therefore returned separately from the user
	 * identity.
	 */
	async usersWithSignIn(): Promise<UserWithSignIn[]> {
		const rows = await this.db
			.select({
				id: User.id,
				name: User.name,
				email: User.email,
				accountCount: count(Account.id),
			})
			.from(User)
			.leftJoin(Account, eq(Account.userId, User.id))
			.groupBy(User.id, User.name, User.email)
			.orderBy(asc(User.name), asc(User.id));

		return rows.map(({ accountCount, ...user }) => ({
			...user,
			canSignIn: accountCount > 0,
		}));
	}

	/**
	 * Create a user who can be credited in laboratory records.
	 *
	 * No account is created. The user therefore cannot sign in. A later
	 * invitation can add an account to the same identity.
	 *
	 * @throws UserEmailAlreadyExistsError if the email address is already used.
	 */
	async createRecordOnlyUser({
		name,
		email,
	}: {
		name: string;
		email: string;
	}): Promise<UserWithSignIn> {
		// Better Auth stores emails in lower case. We do the same. Then the unique
		// index also rejects "Ada@example.com" if "ada@example.com" exists.
		email = email.toLowerCase();

		const id = crypto.randomUUID();
		const now = new Date();

		// The public sign-up API creates an account. A record-only identity needs a user row.
		try {
			await this.db
				.insert(User)
				.values({ id, name, email, emailVerified: false, createdAt: now, updatedAt: now })
				.run();
		} catch (error) {
			// The unique index decides whether the address is taken. A check
			// before the insert cannot decide. Another request can insert the same
			// address in between.
			if (isUniqueConstraintOn(error, [User.email])) {
				throw new UserEmailAlreadyExistsError(email);
			}

			throw error;
		}

		return { id, name, email, canSignIn: false };
	}
}
