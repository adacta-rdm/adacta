import nodemailer from "nodemailer";

import type { EmailMessage, EmailSender } from "~/app/services/EmailSender.ts";
import { Env } from "~/lib/env/Env.ts";

/**
 * Configuration is read lazily so an instance can run before mail is configured.
 */
export class SmtpEmailSender implements EmailSender {
	constructor(private env: Env) {}

	async send(message: EmailMessage): Promise<void> {
		const host = this.env.string("ADACTA_SMTP_HOST");
		const from = this.env.string("ADACTA_MAIL_FROM");
		const port = this.env.int("ADACTA_SMTP_PORT", 587);
		const secure = this.env.boolean("ADACTA_SMTP_SECURE", port === 465);
		const user = this.env.string("ADACTA_SMTP_USER", undefined);
		const pass = this.env.string("ADACTA_SMTP_PASSWORD", undefined);
		if (Boolean(user) !== Boolean(pass))
			throw new Error("Configure both SMTP username and password, or neither.");
		const transport = nodemailer.createTransport({
			host,
			port,
			secure,
			requireTLS: this.env.boolean("ADACTA_SMTP_REQUIRE_TLS", !secure),
			auth: user && pass ? { user, pass } : undefined,
			connectionTimeout: 15_000,
			greetingTimeout: 15_000,
			socketTimeout: 30_000,
		});
		try {
			const result = await transport.sendMail({ ...message, from });
			if (!result.accepted.length) throw new Error("SMTP server did not accept the recipient.");
		} finally {
			transport.close();
		}
	}
}
