/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IDownsamplingTaskArgs } from "../IDownsamplingTaskArgs";
import { validateIDownsamplingTaskArgs } from "./validateIDownsamplingTaskArgs";

export function assertIDownsamplingTaskArgs(arg: any): asserts arg is IDownsamplingTaskArgs {
	const errors = validateIDownsamplingTaskArgs(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IDownsamplingTaskArgs: " + errors[0].message);
}
