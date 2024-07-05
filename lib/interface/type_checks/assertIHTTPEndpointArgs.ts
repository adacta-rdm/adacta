/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IHTTPEndpointArgs } from "../IHTTPEndpointArgs";
import { validateIHTTPEndpointArgs } from "./validateIHTTPEndpointArgs";

export function assertIHTTPEndpointArgs(arg: any): asserts arg is IHTTPEndpointArgs {
	const errors = validateIHTTPEndpointArgs(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IHTTPEndpointArgs: " + errors[0].message);
}
