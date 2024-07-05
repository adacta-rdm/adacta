/**
 * Parses and validates a passed URL and extracts the correct endpoint URLs.
 *
 * The URLs have the following format:
 *     hostname/repo-name
 *
 * Or with an optional path:
 *     hostname/path/to/repo-name
 *
 * Take care of URL semantics regarding trailing slashes, see: https://stackoverflow.com/a/16445016
 * URLs with a trailing slash will therefore throw an error, since they result in an empty repository name.
 *
 * This example URL will be resolved to:
 *     Node.js endpoint:   https://hostname:port
 */
export class RepoURL {
	private readonly url: URL;

	constructor(url: string, repositoryName?: string) {
		// Prepend the protocol in case it is missing
		this.url = new URL(/^[a-z]+:\/\//.test(url) ? url : `https://${url}`);
		const u = this.url;

		if (repositoryName) {
			u.pathname = `${u.pathname
				.split("/")
				// Remove empty path segments, i.e. /path//to -> /path/to
				.filter((p) => p !== "")
				.join("/")}/${repositoryName}`;
		}

		if (u.protocol !== "http:" && u.protocol !== "https:") {
			throw new Error("URL has invalid protocol. Only http and https are supported.");
		}

		if (u.username || u.password) {
			throw new Error("URL has additional username and password which aren't used.");
		}

		if (!u.hostname) {
			throw new Error(`URL '${url}' is incomplete. Missing hostname.`);
		}

		// Use http for localhost
		if (u.hostname === "localhost") {
			u.protocol = "http:";
		}
	}

	get loginEndpoint(): string {
		return new URL("login", this.url).href;
	}

	get registerEndpoint(): string {
		return new URL("register", this.url).href;
	}

	get changePasswordEndpoint(): string {
		return new URL("change-password", this.url).href;
	}

	get graphqlEndpoint(): string {
		return new URL("graphql", this.url).href;
	}

	get graphqlEndpointWS() {
		const url = new URL(this.graphqlEndpoint);
		url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
		return url.href;
	}

	/**
	 * The name of the repository.
	 */
	get repository(): string {
		return this.url.pathname.split("/").pop() ?? "";
	}

	get resourceUploadURL(): string {
		return new URL("resource/upload", this.url).href;
	}

	/**
	 * @deprecated - Use the repository property instead.
	 */
	get databaseName(): string {
		return this.repository;
	}

	/**
	 * 'serializes' the RepoURL instance to a string
	 * Simply pass the returned string back into the RepoURL constructor to `deserialize`
	 *
	 * (De-)Serialization is required to store a RepoURL as part of a Document
	 */
	public toString(): string {
		return this.url.toString();
	}
}
