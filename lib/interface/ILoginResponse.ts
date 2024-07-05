export interface ILoginResponse {
	success: boolean;
	authServerJWT?: string;
	privateDbName?: string;
	authServerCouchDBJWT?: string;
}
