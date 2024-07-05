/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IToGenericTableInput } from "../CSVImportWizzard/IToGenericTableInput";
import { validateIToGenericTableInput } from "./validateIToGenericTableInput";

export function isIToGenericTableInput(arg: any): arg is IToGenericTableInput {
	return validateIToGenericTableInput(arg).length == 0;
}
