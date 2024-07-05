/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IToGenericTableInput } from "../CSVImportWizzard/IToGenericTableInput";
import { validateIToGenericTableInput } from "./validateIToGenericTableInput";

export function assertIToGenericTableInput(arg: any): asserts arg is IToGenericTableInput {
	const errors = validateIToGenericTableInput(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IToGenericTableInput: " + errors[0].message);
}
