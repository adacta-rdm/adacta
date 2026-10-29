import { service } from "~/lib/service-container/ServiceContainer.ts";

export type EmailMessage = { to: string; subject: string; text: string; html: string };

/**
 * Each runtime supplies delivery; application code supplies the message.
 */
export type EmailSender = { send(message: EmailMessage): Promise<void> };
export const EmailSender = service()(function EmailSender(): EmailSender {
	throw new Error("The runtime must provide an EmailSender.");
});
