/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IChangePasswordRequest } from "../IChangePasswordRequest";
import { validateIChangePasswordRequest } from "./validateIChangePasswordRequest";

export function assertIChangePasswordRequest(arg: any): asserts arg is IChangePasswordRequest {
	const errors = validateIChangePasswordRequest(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IChangePasswordRequest: " + errors[0].message);
}
