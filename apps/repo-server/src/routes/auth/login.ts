import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";

import type { AuthConfig } from "../../config/AuthConfig";
import type { EntityLoader } from "../../services/EntityLoader";
import { getAccessTokenForUser } from "../../utils/getAccessTokenForUser";

import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { DrizzleGlobalSchema } from "~/drizzle/DrizzleSchema";
import { verifyPassword } from "~/lib/Authentication";
import type { IHTTPEndpointArgs } from "~/lib/interface/IHTTPEndpointArgs";
import type { IHTTPEndpointReturnType } from "~/lib/interface/IHTTPEndpointReturnType";
import type { ILoginResponse } from "~/lib/interface/ILoginResponse";
import { isILoginRequest } from "~/lib/interface/type_checks/isILoginRequest";
import type { Logger } from "~/lib/logger/Logger";

export async function login(
	args: IHTTPEndpointArgs,
	logger: Logger,
	el: EntityLoader,

	cfg: AuthConfig
): Promise<IHTTPEndpointReturnType<ILoginResponse>> {
	// Explicitly extract all parameters because the validation function will
	// fail when there are any unknown properties defined.
	const params = {
		email: args.params.email,
		password: args.params.password,
	};
	if (!isILoginRequest(params)) {
		logger.bind({ params }).error("Parameters invalid.");
		return {
			statusCode: StatusCodes.BAD_REQUEST,
		};
	}

	const { email, password } = params;
	const { User } = new DrizzleGlobalSchema();

	const users: (DrizzleEntity<"User"> | undefined)[] = await el.find(User, eq(User.email, email));
	const user = users[0];

	// UserEntity doesn't exist
	if (!user) {
		return { statusCode: StatusCodes.UNAUTHORIZED };
	}

	const passwordValid = await verifyPassword(password, user.passwordHash, user.salt);

	if (passwordValid) {
		const authServerJWT = getAccessTokenForUser(user.id, cfg);

		return {
			statusCode: StatusCodes.OK,
			body: {
				success: true,
				authServerJWT,
			},
		};
	} else {
		return { statusCode: StatusCodes.UNAUTHORIZED };
	}
}
