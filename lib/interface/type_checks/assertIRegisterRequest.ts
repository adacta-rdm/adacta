/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IRegisterRequest } from "../IRegisterRequest";
import { validateIRegisterRequest } from "./validateIRegisterRequest";

export function assertIRegisterRequest(arg: any): asserts arg is IRegisterRequest {
	const errors = validateIRegisterRequest(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IRegisterRequest: " + errors[0].message);
}
