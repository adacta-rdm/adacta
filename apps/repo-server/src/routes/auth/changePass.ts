import type express from "express";
import { StatusCodes } from "http-status-codes";

import { AuthenticatedUserInfo } from "~/apps/repo-server/src/graphql/AuthenticatedUserInfo";
import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { DrizzleGlobalSchema } from "~/drizzle/DrizzleSchema";
import { createPasswordHash, verifyPassword } from "~/lib/Authentication";
import {
	NEW_PASSWORD_TOO_WEAK,
	OLD_PASSWORD_DID_NOT_MATCH,
	PASSWORD_CHANGED,
} from "~/lib/interface/IChangePasswordResponseStatusCode";
import type { IHTTPEndpointArgs } from "~/lib/interface/IHTTPEndpointArgs";
import type { IHTTPEndpointReturnType } from "~/lib/interface/IHTTPEndpointReturnType";
import { isIChangePasswordRequest } from "~/lib/interface/type_checks/isIChangePasswordRequest";
import type { Logger } from "~/lib/logger/Logger";

export async function changePass(
	args: IHTTPEndpointArgs,
	logger: Logger,
	el: EntityLoader,
	req: express.Request
): Promise<IHTTPEndpointReturnType<Record<string, never>>> {
	// Explicitly extract all parameters because the validation function will
	// fail when there are any unknown properties defined.
	// NOTE: All other auth routes are doing this. I think it is only necessary for deployments as
	// DOs function

	const params = {
		oldPassword: args.params.oldPassword,
		newPassword: args.params.newPassword,
	};

	if (!isIChangePasswordRequest(params)) {
		logger.bind({ params }).error("Parameters invalid.");
		return {
			statusCode: StatusCodes.BAD_REQUEST,
		};
	}

	// Check if the password contains at least 6 characters
	if (params.newPassword.length < 6) {
		return { statusCode: NEW_PASSWORD_TOO_WEAK };
	}

	const userInfo = AuthenticatedUserInfo.createFromHTTPHeaders(req.headers);
	const { User } = new DrizzleGlobalSchema();

	const user = await el.one(User, userInfo.userId);

	// Verify the old password
	if (!(await verifyPassword(params.oldPassword, user.passwordHash, user.salt))) {
		return { statusCode: OLD_PASSWORD_DID_NOT_MATCH };
	}

	// Create hash of the new password and update the user
	const newHash = await createPasswordHash(params.newPassword);
	user.passwordHash = newHash.passwordHash;
	user.salt = newHash.salt;

	await el.update(User, user.id, user);

	return { statusCode: PASSWORD_CHANGED };
}
