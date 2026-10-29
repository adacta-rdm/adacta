import { and, eq, like } from "drizzle-orm";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { BetterAuth } from "~/app/services/BetterAuth.ts";
import { EmailSender } from "~/app/services/EmailSender.ts";
import { UserAccess } from "~/app/services/UserAccess.ts";
import { UserEmailAlreadyExistsError, UserManager } from "~/app/services/UserManager.ts";
import { accountEmail } from "~/app/services/accountEmail.ts";
import { Account, User, Verification } from "~/drizzle/schema/BetterAuth.ts";
import { Env } from "~/lib/env/Env.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";

export class InvitationError extends Error {}

@Service(ApplicationDatabase, BetterAuth, UserManager, UserAccess, EmailSender, Env)
export class UserInvitations {
	constructor(
		private db: ApplicationDatabase,
		private auth: BetterAuth,
		private users: UserManager,
		private access: UserAccess,
		private mail: EmailSender,
		private env: Env,
	) {}

	async invite(name: string, email: string): Promise<void> {
		await this.access.requireAdmin();
		email = email.trim().toLowerCase();
		let userId: string;

		// The unique email constraint also handles simultaneous invitations.
		try {
			userId = (await this.users.createRecordOnlyUser({ name, email })).id;
		} catch (error) {
			if (!(error instanceof UserEmailAlreadyExistsError)) throw error;

			const user = await this.db
				.select({ id: User.id })
				.from(User)
				.where(eq(User.email, email))
				.get();
			if (!user) throw new InvitationError("User could not be created.");
			userId = user.id;
		}

		await this.requireRecordOnly(userId);
		await this.send(userId, email);
	}

	async resend(userId: string): Promise<void> {
		await this.access.requireAdmin();
		await this.requireRecordOnly(userId);
		const user = await this.db.select().from(User).where(eq(User.id, userId)).get();
		if (!user) throw new InvitationError("User was not found.");
		await this.send(user.id, user.email);
	}

	async cancel(userId: string): Promise<void> {
		await this.access.requireAdmin();
		await this.requireRecordOnly(userId);
		const [result] = await this.db.batch([
			this.db
				.delete(Verification)
				.where(
					and(eq(Verification.value, userId), like(Verification.identifier, "reset-password:%")),
				),
		]);
		if (!result.changes) throw new InvitationError("No invitation was found.");
	}

	private async requireRecordOnly(userId: string): Promise<void> {
		const credential = await this.db
			.select({ id: Account.id })
			.from(Account)
			.where(and(eq(Account.userId, userId), eq(Account.providerId, "credential")))
			.get();
		if (credential)
			throw new InvitationError(
				"This user already has a sign-in account. They can use Forgot password to recover access.",
			);
	}

	private async send(userId: string, email: string): Promise<void> {
		const token = crypto.randomUUID();
		const identifier = `reset-password:${token}`;
		const { internalAdapter, baseURL } = await this.auth.$context;
		const url = new URL(`${baseURL}/reset-password/${token}`);
		url.searchParams.set(
			"callbackURL",
			new URL("/setup-account", this.env.url("ADACTA_URL", "http://localhost:5173")).toString(),
		);

		// Replace the token in one batch so concurrent resends leave one link.
		const now = new Date();
		await this.db.batch([
			this.db
				.delete(Verification)
				.where(
					and(eq(Verification.value, userId), like(Verification.identifier, "reset-password:%")),
				),
			this.db.insert(Verification).values({
				id: crypto.randomUUID(),
				identifier,
				value: userId,
				expiresAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
				createdAt: now,
				updatedAt: now,
			}),
		]);

		try {
			await this.mail.send(accountEmail(email, url.toString(), true));
		} catch {
			await internalAdapter.deleteVerificationByIdentifier(identifier);
			// Transport errors can contain credentials or message contents.
			throw new InvitationError(
				"Email could not be sent. Check email configuration and try again.",
			);
		}
	}
}
