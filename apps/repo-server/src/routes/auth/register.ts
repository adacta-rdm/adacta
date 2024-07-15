import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import isEmail from "validator/es/lib/isEmail";

import type { AuthConfig } from "../../config/AuthConfig";
import { getAccessTokenForUser } from "../../utils/getAccessTokenForUser";

import { isIRegisterRequest } from "@/tsrc/lib/interface/IRegisterRequest";
import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { DrizzleGlobalSchema } from "~/drizzle/DrizzleSchema";
import { createPasswordHash } from "~/lib/Authentication";
import { EntityFactory } from "~/lib/database/EntityFactory";
import { ValidationError } from "~/lib/errors/ValidationError";
import { NEW_PASSWORD_TOO_WEAK } from "~/lib/interface/IChangePasswordResponseStatusCode";
import type { IHTTPEndpointArgs } from "~/lib/interface/IHTTPEndpointArgs";
import type { IHTTPEndpointReturnType } from "~/lib/interface/IHTTPEndpointReturnType";
import type { IRegisterResponse } from "~/lib/interface/IRegisterResponse";
import type { Logger } from "~/lib/logger/Logger";
import { getDefaultTimeSettings } from "~/lib/utils/getDefaultTimeSettings";

/**
 * @todo Implement the registration of a new user.
 */
export async function register(
	args: IHTTPEndpointArgs,
	logger: Logger,
	el: EntityLoader,
	cfg: AuthConfig
): Promise<IHTTPEndpointReturnType<IRegisterResponse>> {
	// Explicitly extract all parameters because the validation function will
	// fail when there are any unknown properties defined.
	const params = {
		firstName: args.params.firstName,
		lastName: args.params.lastName,
		password: args.params.password,
		email: args.params.email,
		userId: args.params.userId,
	};
	if (!isIRegisterRequest(params)) {
		return {
			statusCode: StatusCodes.BAD_REQUEST,
		};
	}

	const { User } = new DrizzleGlobalSchema();
	const emailIsTaken =
		(await el.find(User, { where: (t) => eq(t.email, params.email), limit: 1 })).length > 0;

	if (emailIsTaken) {
		return {
			statusCode: StatusCodes.CONFLICT,
			body: {
				success: false,
				message:
					"This e-mail is already taken. If this is your e-mail try to login with your login details.",
			},
		};
	}

	// Check if the password contains at least 6 characters
	if (params.password.length < 6) {
		return {
			statusCode: NEW_PASSWORD_TOO_WEAK,
			body: {
				success: false,
				message: "The password you entered needs to be at least 6 characters long.",
			},
		};
	}

	const userData = await createUser(params);

	const user = EntityFactory.create("User", userData);
	await el.insert(User, user);

	const accessToken = getAccessTokenForUser(user.id, cfg);

	return {
		statusCode: StatusCodes.CREATED,
		body: { success: true, accessToken },
	};
}

async function createUser(args: {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
}) {
	const { email, password, ...rest } = args;

	if (!isEmail(email)) throw new ValidationError("Email is invalid");

	const { salt, passwordHash } = await createPasswordHash(password);

	const { locale, timeStyle, dateStyle } = getDefaultTimeSettings();

	return { ...rest, email, passwordHash, salt, locale, timeStyle, dateStyle };
}
