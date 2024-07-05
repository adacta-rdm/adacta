/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IChangePasswordRequest } from "../IChangePasswordRequest";
import { validateIChangePasswordRequest } from "./validateIChangePasswordRequest";

export function isIChangePasswordRequest(arg: any): arg is IChangePasswordRequest {
	return validateIChangePasswordRequest(arg).length == 0;
}
