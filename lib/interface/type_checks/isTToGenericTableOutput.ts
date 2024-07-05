/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { TToGenericTableOutput } from "../CSVImportWizzard/TToGenericTableOutput";
import { validateTToGenericTableOutput } from "./validateTToGenericTableOutput";

export function isTToGenericTableOutput(arg: any): arg is TToGenericTableOutput {
	return validateTToGenericTableOutput(arg).length == 0;
}
