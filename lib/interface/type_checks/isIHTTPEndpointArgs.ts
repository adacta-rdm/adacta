/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IHTTPEndpointArgs } from "../IHTTPEndpointArgs";
import { validateIHTTPEndpointArgs } from "./validateIHTTPEndpointArgs";

export function isIHTTPEndpointArgs(arg: any): arg is IHTTPEndpointArgs {
	return validateIHTTPEndpointArgs(arg).length == 0;
}
