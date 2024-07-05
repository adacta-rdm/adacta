import { describe, test, expect } from "vitest";

import { parseEnvFile } from "~/lib/utils/parseEnvFile";

describe("parseEnvFile", () => {
	test("parses a simple env file", () => {
		const envFile = `
            # Comment
            FOO=bar
            BAZ=qux
        `;

		const env = parseEnvFile(envFile);
		expect(env).toEqual({ FOO: "bar", BAZ: "qux" });
	});

	test("parses a value with spaces", () => {
		const envFile = `
            FOO=bar
            BAZ=qux
            QUUX=quux quux
            QUUUX=quuux quuux
        `;

		const env = parseEnvFile(envFile);
		expect(env).toEqual({ FOO: "bar", BAZ: "qux", QUUX: "quux quux", QUUUX: "quuux quuux" });
	});

	test("parses a value with quotes", () => {
		const envFile = `
            FOO=bar
            BAZ=qux
            QUUX="quux quux"
            QUUUX="quuux quuux"
        `;

		const env = parseEnvFile(envFile);
		expect(env).toEqual({ FOO: "bar", BAZ: "qux", QUUX: "quux quux", QUUUX: "quuux quuux" });
	});

	test("parses a value with escaped quotes", () => {
		const envFile = `
            FOO=bar
            BAZ=qux
            QUUX="quux \\"quux\\""
            QUUUX="quuux \\"quuux\\""
        `;

		const env = parseEnvFile(envFile);
		expect(env).toEqual({ FOO: "bar", BAZ: "qux", QUUX: 'quux "quux"', QUUUX: 'quuux "quuux"' });
	});

	test("parses a value with quoted equals sign", () => {
		const envFile = `
            FOO=bar
            BAZ=qux
            QUUX="quux=quux" ignored because not in quotes
            QUUUX="quuux=quuux"
        `;

		const env = parseEnvFile(envFile);
		expect(env).toEqual({ FOO: "bar", BAZ: "qux", QUUX: "quux=quux", QUUUX: "quuux=quuux" });
	});

	test("parses a quoted json object as string", () => {
		const envFile = `
            BAZ="{invalid json}"
            QUUX="{}"
            QUUUX={}
        `;

		const env = parseEnvFile(envFile);
		expect(env).toEqual({ BAZ: "{invalid json}", QUUX: "{}", QUUUX: "{}" });
	});

	test("parses value with trailing comment", () => {
		const envFile = `
            FOO=bar # Comment
            BAZ=qux
            QUUX=quux quux # Comment
            QUUUX="quuux quuux" # Comment
        `;

		const env = parseEnvFile(envFile);
		expect(env).toEqual({ FOO: "bar", BAZ: "qux", QUUX: "quux quux", QUUUX: "quuux quuux" });
	});

	test("displays line number in error message", () => {
		const envFile = `
            FOO=bar
            BAZ=qux
            QUUX="quux quux
            QUUUX="quuux quuux"
        `;

		expect(() => parseEnvFile(envFile)).toThrowError(/line 4/);
	});
});
