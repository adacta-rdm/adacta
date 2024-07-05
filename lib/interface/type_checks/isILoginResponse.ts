/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { ILoginResponse } from "../ILoginResponse";
import { validateILoginResponse } from "./validateILoginResponse";

export function isILoginResponse(arg: any): arg is ILoginResponse {
	return validateILoginResponse(arg).length == 0;
}
