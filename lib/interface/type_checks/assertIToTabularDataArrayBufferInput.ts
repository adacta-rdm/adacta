/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IToTabularDataArrayBufferInput } from "../CSVImportWizzard/IToTabularDataArrayBufferInput";
import { validateIToTabularDataArrayBufferInput } from "./validateIToTabularDataArrayBufferInput";

export function assertIToTabularDataArrayBufferInput(arg: any): asserts arg is IToTabularDataArrayBufferInput {
	const errors = validateIToTabularDataArrayBufferInput(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IToTabularDataArrayBufferInput: " + errors[0].message);
}
