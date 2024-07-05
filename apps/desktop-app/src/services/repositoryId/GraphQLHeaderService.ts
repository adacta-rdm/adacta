/**
 * This service serves as a global state for the repository id and authorization token.
 * These values are used to set the HTTP headers for the GraphQL requests.
 */
export class GraphQLHeaderService {
	public repositoryId: string | undefined;
	private readonly _storageKey: string = "LOGIN_INFO_V2";

	get authToken() {
		return window.localStorage.getItem(this._storageKey);
	}

	set authToken(token: string | undefined | null) {
		if (!token) {
			window.localStorage.removeItem(this._storageKey);
			return;
		}

		window.localStorage.setItem(
			this._storageKey,
			token.startsWith("Bearer ") ? token : `Bearer ${token}`
		);
	}
}
