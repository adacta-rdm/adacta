import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";

import { NoteMarkdown } from "~/app/components/NoteMarkdown.tsx";

describe("NoteMarkdown", () => {
	test("renders bold text, a list, and an isolated link", () => {
		const html = renderToStaticMarkup(
			<NoteMarkdown
				body={"**Bold**\n\n- First\n- Second\n\n[Details](https://example.com/details)"}
			/>,
		);

		expect(html).toContain("<strong>Bold</strong>");
		expect(html).toContain("<ul>");
		expect(html).toContain("<li>First</li>");
		expect(html).toContain('href="https://example.com/details"');
		expect(html).toContain('target="_blank"');
		expect(html).toContain('rel="noopener noreferrer"');
	});

	test("renders a single line break as a break", () => {
		const html = renderToStaticMarkup(<NoteMarkdown body={"First line\nSecond line"} />);

		expect(html).toContain("First line<br/>Second line");
	});

	test("does not create an element from raw HTML", () => {
		const html = renderToStaticMarkup(<NoteMarkdown body={"<script>alert(1)</script>"} />);

		expect(html).not.toContain("<script>");
		expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
	});

	test("shows Markdown image text without creating an image", () => {
		const html = renderToStaticMarkup(
			<NoteMarkdown body={"![Powder after drying](https://example.com/powder.jpg)"} />,
		);

		expect(html).not.toContain("<img");
		expect(html).toContain("Powder after drying");
	});

	test("shows Markdoc tag syntax as text", () => {
		const html = renderToStaticMarkup(<NoteMarkdown body={"{% if %}"} />);

		expect(html).toContain("{% if %}");
	});

	test("shows Markdoc tag syntax in inline code without a backslash", () => {
		const html = renderToStaticMarkup(<NoteMarkdown body={"`{% if %}`"} />);

		expect(html).toContain("<code>{% if %}</code>");
	});

	test("shows Markdoc tag syntax in a code block without a backslash", () => {
		const html = renderToStaticMarkup(<NoteMarkdown body={"```\n{% if x %}\n```"} />);

		expect(html).toContain("<code>{% if x %}\n</code>");
	});
});
