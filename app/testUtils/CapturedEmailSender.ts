import type { EmailMessage, EmailSender } from "~/app/services/EmailSender.ts";

export class CapturedEmailSender implements EmailSender {
	readonly messages: EmailMessage[] = [];
	fail = false;

	async send(message: EmailMessage): Promise<void> {
		if (this.fail) throw new Error("Simulated mail transport failure");
		this.messages.push(message);
	}

	/**
	 * Read the account link from a captured email.
	 */
	link(index = this.messages.length - 1): URL {
		const link = this.messages[index].text.match(/https?:\/\/\S+/)![0];

		return new URL(link);
	}
}
