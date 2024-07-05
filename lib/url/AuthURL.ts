import { getPortString } from "./getPortString";

export class AuthURL {
	private readonly url;
	private readonly hostname;
	private readonly protocol;
	private readonly port;

	constructor(url: string) {
		this.url = url;

		const u = new URL(url);

		if (!u.protocol) {
			throw new Error("Missing protocol.");
		}
		this.protocol = u.protocol;

		if (u.username || u.password) {
			throw new Error("URL has additional username and password which aren't used.");
		}

		if (!u.hostname) {
			throw new Error(`URL '${url}' is incomplete. Missing host.`);
		}
		this.hostname = u.hostname;

		if (u.port) {
			this.port = u.port;
		}
	}

	getLoginURL() {
		return `${this.protocol}//${this.hostname}${getPortString(this.port)}/api/v1/login`;
	}

	getRegisterURL() {
		return `${this.protocol}//${this.hostname}${getPortString(this.port)}/api/v1/register`;
	}

	get graphqlEndpoint() {
		return `${this.protocol}//${this.hostname}${getPortString(this.port)}/api/v1/graphql`;
	}

	public toString() {
		return this.url;
	}
}
