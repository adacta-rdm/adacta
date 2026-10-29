import type { EmailMessage } from "~/app/services/EmailSender.ts";

export function accountEmail(to: string, url: string, setup: boolean): EmailMessage {
	const subject = setup ? "Set up your Adacta account" : "Reset your Adacta password";
	const action = setup ? "Choose your password" : "Reset your password";
	const explanation = setup
		? "You have been invited to Adacta. This link expires in 48 hours."
		: "A password reset was requested for your Adacta account. This link expires in one hour. If you did not request it, you can ignore this email.";
	const escapedURL = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");

	// Table cells provide spacing and button backgrounds in older email clients.
	const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${subject}</title></head>
<body style="margin: 0;">
<table role="presentation" width="100%" bgcolor="#f4f4f5" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding: 32px 16px;">
<table role="presentation" width="100%" bgcolor="#ffffff" style="max-width: 560px; border: 1px solid #e4e4e7;" cellpadding="0" cellspacing="0">
<tr><td style="padding: 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding-bottom: 16px; color: #18181b; font-family: Arial, Helvetica, sans-serif;">
<h1 style="margin: 0; font-size: 20px;">${subject}</h1>
</td></tr>
<tr><td style="padding-bottom: 24px; color: #18181b; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 24px;">${explanation}</td></tr>
<tr><td style="padding-bottom: 32px;">
<table role="presentation" bgcolor="#0069a8" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding: 12px 20px; font-family: Arial, Helvetica, sans-serif; font-size: 16px;">
<a href="${escapedURL}" style="color: #ffffff;"><strong>${action}</strong></a>
</td></tr>
</table>
</td></tr>
<tr><td style="padding-top: 24px; border-top: 1px solid #e4e4e7; color: #52525b; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 20px;">If the button does not open, copy this link into your browser:<br>
<a href="${escapedURL}" style="color: #0069a8;">${escapedURL}</a></td></tr>
</table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

	return {
		to,
		subject,
		text: `${explanation}\n\n${action}: ${url}`,
		html,
	};
}
