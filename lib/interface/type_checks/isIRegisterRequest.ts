/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IRegisterRequest } from "../IRegisterRequest";
import { validateIRegisterRequest } from "./validateIRegisterRequest";

export function isIRegisterRequest(arg: any): arg is IRegisterRequest {
	return validateIRegisterRequest(arg).length == 0;
}
