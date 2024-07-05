import type { IUserId } from "../database/Ids";

export interface IRegisterRequest {
	firstName: string;
	lastName: string;
	password: string;
	email: string;

	// Used for fixture loading only
	userId?: IUserId;
}
