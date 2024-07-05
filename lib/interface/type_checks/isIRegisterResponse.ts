/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IRegisterResponse } from "../IRegisterResponse";
import { validateIRegisterResponse } from "./validateIRegisterResponse";

export function isIRegisterResponse(arg: any): arg is IRegisterResponse {
	return validateIRegisterResponse(arg).length == 0;
}
