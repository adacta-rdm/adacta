/**
 * Local SMTP sink for browser tests. It never relays messages to real recipients.
 */
export const MAIL_INBOX_URL = "http://127.0.0.1:10254";
export const MAIL_SMTP_PORT = 10253;

export function startMailServer() {
	const messages = new Map<string, string>();
	const smtp = Bun.listen<{
		buffer: string;
		receiving: boolean;
		message: string;
		recipient: string;
	}>({
		hostname: "127.0.0.1",
		port: MAIL_SMTP_PORT,
		socket: {
			open(socket) {
				socket.data = { buffer: "", receiving: false, message: "", recipient: "" };
				socket.write("220 localhost ESMTP test sink\r\n");
			},
			data(socket, bytes) {
				const state = socket.data;
				state.buffer += Buffer.from(bytes).toString("utf8");
				let newline: number;
				while ((newline = state.buffer.indexOf("\r\n")) !== -1) {
					const line = state.buffer.slice(0, newline);
					state.buffer = state.buffer.slice(newline + 2);
					if (state.receiving) {
						if (line === ".") {
							messages.set(state.recipient, state.message);
							state.receiving = false;
							socket.write("250 Message accepted\r\n");
						} else state.message += `${line.replace(/^\.\./, ".")}\r\n`;
					} else if (/^EHLO|^HELO/i.test(line)) socket.write("250 localhost\r\n");
					else if (/^RCPT TO:/i.test(line)) {
						state.recipient = line.match(/<([^>]+)>/)![1];
						socket.write("250 OK\r\n");
					} else if (/^DATA$/i.test(line)) {
						state.receiving = true;
						state.message = "";
						socket.write("354 End with a dot\r\n");
					} else if (/^QUIT$/i.test(line)) socket.end("221 Bye\r\n");
					else socket.write("250 OK\r\n");
				}
			},
		},
	});
	const inbox = Bun.serve({
		hostname: "127.0.0.1",
		port: 10254,
		fetch(request) {
			const raw = messages.get(new URL(request.url).searchParams.get("to") ?? "");
			if (!raw) return new Response("No message", { status: 404 });
			const decoded = raw
				.replace(/=\r\n/g, "")
				.replace(/=([\dA-F]{2})/gi, (_, hex: string) =>
					String.fromCharCode(Number.parseInt(hex, 16)),
				);
			const link = decoded.match(
				/https?:\/\/[^\s<>]+\/api\/auth\/reset-password\/[\w-]+\?[^\s<>]+/,
			)?.[0];
			return Response.json({ link });
		},
	});
	return {
		stop() {
			smtp.stop(true);
			void inbox.stop(true);
		},
	};
}
