import jwt from "jsonwebtoken";

import type { AuthConfig } from "../config/AuthConfig";

import type { IUserId } from "~/lib/database/Ids";
import type { IAuthServerJWTParams } from "~/lib/interface/IAuthServerJWTParams";

export function getAccessTokenForUser(userId: IUserId, cfg: AuthConfig) {
	const authServerJWTPayload: IAuthServerJWTParams = { userId };
	const authServerJWT = jwt.sign(authServerJWTPayload, cfg.privateKey, {
		algorithm: "RS256",
	});
	return authServerJWT;
}
