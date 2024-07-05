/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { ILoginRequest } from "../ILoginRequest";
import { validateILoginRequest } from "./validateILoginRequest";

export function isILoginRequest(arg: any): arg is ILoginRequest {
	return validateILoginRequest(arg).length == 0;
}
