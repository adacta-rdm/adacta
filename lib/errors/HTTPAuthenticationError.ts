export class HTTPAuthenticationError extends Error {
	statusCode: number;

	constructor(statusCode: number) {
		super();

		this.statusCode = statusCode;
	}
}
