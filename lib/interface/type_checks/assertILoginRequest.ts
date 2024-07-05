/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { ILoginRequest } from "../ILoginRequest";
import { validateILoginRequest } from "./validateILoginRequest";

export function assertILoginRequest(arg: any): asserts arg is ILoginRequest {
	const errors = validateILoginRequest(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type ILoginRequest: " + errors[0].message);
}
