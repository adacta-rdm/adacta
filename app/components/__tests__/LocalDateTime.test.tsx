import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { LocalDateTime } from "~/app/components/LocalDateTime.tsx";
import { LocalDateTimeInput } from "~/app/components/LocalDateTimeInput.tsx";

describe("LocalDateTime", () => {
	test("shows a moment in UTC during the server render", () => {
		const html = renderToStaticMarkup(
			<LocalDateTime value={new Date("2026-09-21T12:32:00.000Z")} />,
		);

		expect(html).toContain('dateTime="2026-09-21T12:32:00.000Z"');
		// The text between the date and the time differs between ICU versions. For
		// example, macOS writes "Sep 21, 2026 at 12:32 PM" and Linux writes
		// "Sep 21, 2026, 12:32 PM".
		expect(html).toMatch(/Sep 21, 2026.+12:32\sPM UTC/);
	});
});

describe("LocalDateTimeInput", () => {
	test("keeps the zoned moment hidden and leaves the visible server field empty", () => {
		const html = renderToStaticMarkup(
			<LocalDateTimeInput
				id="observed-at"
				name="observedAt"
				value={new Date("2026-09-21T12:32:00.000Z")}
			/>,
		);

		expect(html).toContain(
			'<input type="hidden" name="observedAt" value="2026-09-21T12:32:00.000Z"/>',
		);
		expect(html).toContain('<input id="observed-at" type="datetime-local"');
		expect(html).not.toContain('id="observed-at" name=');
		expect(html).not.toContain('id="observed-at" value=');
	});
});
