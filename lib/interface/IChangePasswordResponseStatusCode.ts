import { StatusCodes } from "http-status-codes";

export const OLD_PASSWORD_DID_NOT_MATCH = StatusCodes.CONFLICT;
export const PASSWORD_CHANGED = StatusCodes.OK;
export const NEW_PASSWORD_TOO_WEAK = StatusCodes.NOT_ACCEPTABLE;
