/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { ILoginResponse } from "../ILoginResponse";
import { validateILoginResponse } from "./validateILoginResponse";

export function assertILoginResponse(arg: any): asserts arg is ILoginResponse {
	const errors = validateILoginResponse(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type ILoginResponse: " + errors[0].message);
}
