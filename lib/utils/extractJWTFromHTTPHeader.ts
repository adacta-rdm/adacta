import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { isObject } from "lodash-es";

import { readEnvVar } from "./readEnvVar";
import { HTTPAuthenticationError } from "../errors/HTTPAuthenticationError";
import type { IAuthServerJWTParams } from "../interface/IAuthServerJWTParams";

// See https://www.npmjs.com/package/jsonwebtoken#algorithms-supported for a list of possible algos.

export function extractJWTFromHTTPHeader(
	authorizationHeader: string | undefined,
	AUTH_SERVER_JWT_PUBLIC_KEY = readEnvVar("AUTH_SERVER_JWT_PUBLIC_KEY")
): IAuthServerJWTParams {
	if (!authorizationHeader) throw new HTTPAuthenticationError(StatusCodes.UNAUTHORIZED);
	const [keyword, token] = authorizationHeader.split(" ");
	if (keyword !== "Bearer") throw new HTTPAuthenticationError(StatusCodes.BAD_REQUEST);

	const payload = jwt.verify(token, AUTH_SERVER_JWT_PUBLIC_KEY, {
		algorithms: ["RS256"],
	});

	if (!isObject(payload) || !("userId" in payload)) {
		throw new HTTPAuthenticationError(StatusCodes.BAD_REQUEST);
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
	return { userId: (payload as any).userId };
}
