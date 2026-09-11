import type { EnumDeclaration, InterfaceDeclaration, TypeAliasDeclaration } from "typescript";

/**
 * A concrete exported declaration for which TSRC can generate runtime checks.
 */
export type Declaration = InterfaceDeclaration | TypeAliasDeclaration | EnumDeclaration;
