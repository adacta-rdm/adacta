import { describe, test, expect } from "vitest";

import { RepoURL } from "../RepoURL";

describe("RepoURL", () => {
	test("graphqlEndpoint", () => {
		const repoURL = new RepoURL("remote.host/repo");
		expect(repoURL.graphqlEndpoint).toBe("https://remote.host/graphql");
	});

	test("graphqlEndpointWS", () => {
		const repoURL = new RepoURL("remote.host/repo");
		expect(repoURL.graphqlEndpointWS).toBe("wss://remote.host/graphql");
	});

	test("resourceUploadURL", () => {
		const repoURL = new RepoURL("remote.host/repo");
		expect(repoURL.resourceUploadURL).toBe("https://remote.host/resource/upload");
	});

	test("repository", () => {
		const repoURL = new RepoURL("remote.host/repo");
		expect(repoURL.repository).toBe("repo");
	});

	test("databaseName", () => {
		const repoURL = new RepoURL("remote.host/repo");
		expect(repoURL.databaseName).toEqual(repoURL.repository);
	});

	test("constructor with `repositoryName` argument", () => {
		// Base URL with path and without trailing slash
		const repoURL1 = new RepoURL("remote.host/path/to", "repo");
		expect(repoURL1.repository).toBe("repo");
		expect(repoURL1.toString()).toBe("https://remote.host/path/to/repo");

		// Base URL with a trailing slash
		const repoURL2 = new RepoURL("remote.host/", "repo");
		expect(repoURL2.repository).toBe("repo");
		expect(repoURL2.toString()).toBe("https://remote.host/repo");
	});

	test("toString()", () => {
		const repoURL = new RepoURL("remote.host/repo");
		expect(repoURL.toString()).toBe("https://remote.host/repo");
	});

	test("graphqlEndpoint with path", () => {
		const repoURL = new RepoURL("remote.host/path/to/repo");
		expect(repoURL.graphqlEndpoint).toBe("https://remote.host/path/to/graphql");
	});

	test("graphqlEndpointWS with path", () => {
		const repoURL = new RepoURL("remote.host/path/to/repo");
		expect(repoURL.graphqlEndpointWS).toBe("wss://remote.host/path/to/graphql");
	});

	test("resourceUploadURL with path", () => {
		const repoURL = new RepoURL("remote.host/path/to/repo");
		expect(repoURL.resourceUploadURL).toBe("https://remote.host/path/to/resource/upload");
	});

	test("repository with path", () => {
		const repoURL = new RepoURL("remote.host/path/to/repo");
		expect(repoURL.repository).toBe("repo");
	});

	test("databaseName with path", () => {
		const repoURL = new RepoURL("remote.host/path/to/repo");
		expect(repoURL.databaseName).toEqual(repoURL.repository);
	});

	test("toString() with path", () => {
		const repoURL = new RepoURL("remote.host/path/to/repo");
		expect(repoURL.toString()).toBe("https://remote.host/path/to/repo");
	});

	test("graphqlEndpoint always has http protocol when host is localhost", () => {
		expect(new RepoURL("localhost/repo").graphqlEndpoint).toMatch(/^http:/);
		expect(new RepoURL("https://localhost/repo").graphqlEndpoint).toMatch(/^http:/);
	});

	test("graphqlEndpointWS always has ws protocol when host is localhost", () => {
		const repoURL = new RepoURL("https://localhost/repo");
		expect(repoURL.graphqlEndpointWS).toMatch(/^ws:/);
	});

	describe("errors", () => {
		test("unsupported protocol", () => {
			expect(() => new RepoURL("ftp://remote.host/repo")).toThrow(/protocol/);
		});
	});
});
