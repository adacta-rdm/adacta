import { assertDefined } from "@omegadot/assert";
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";

import { HTTPAuthenticationError } from "~/lib/errors/HTTPAuthenticationError";
import { extractJWTFromHTTPHeader } from "~/lib/utils/extractJWTFromHTTPHeader";

/**
 * Express Middleware which for now only checks if a JWT is sent and if this JWT is signed
 */
export const protectRoute: RequestHandler = (req, res, next) => {
	// Skip protection for version route.
	if (req.originalUrl === "/version") {
		next();
		return;
	}

	if (!req.headers.authorization) {
		return res.status(StatusCodes.UNAUTHORIZED).send("Unauthorized");
	}

	try {
		const { userId } = extractJWTFromHTTPHeader(req.headers.authorization);
		assertDefined(userId);
	} catch (e: any) {
		if (e instanceof HTTPAuthenticationError) {
			return res.status(e.statusCode).send(e.message);
		}

		return res.status(StatusCodes.INTERNAL_SERVER_ERROR).send("Internal server error");
	}

	return next();
};
