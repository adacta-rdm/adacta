/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IRegisterResponse } from "../IRegisterResponse";
import { validateIRegisterResponse } from "./validateIRegisterResponse";

export function assertIRegisterResponse(arg: any): asserts arg is IRegisterResponse {
	const errors = validateIRegisterResponse(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IRegisterResponse: " + errors[0].message);
}
