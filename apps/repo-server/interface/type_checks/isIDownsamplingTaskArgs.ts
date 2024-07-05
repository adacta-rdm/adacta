/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IDownsamplingTaskArgs } from "../IDownsamplingTaskArgs";
import { validateIDownsamplingTaskArgs } from "./validateIDownsamplingTaskArgs";

export function isIDownsamplingTaskArgs(arg: any): arg is IDownsamplingTaskArgs {
	return validateIDownsamplingTaskArgs(arg).length == 0;
}
