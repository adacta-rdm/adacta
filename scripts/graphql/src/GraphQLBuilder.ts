import type {
	DefinitionNode,
	DirectiveDefinitionNode,
	DocumentNode,
	InputObjectTypeDefinitionNode,
	InterfaceTypeDefinitionNode,
	NamedTypeNode,
	ObjectTypeDefinitionNode,
	OperationDefinitionNode,
	SchemaDefinitionNode,
	TypeDefinitionNode,
} from "graphql";
import { Kind, parse, visit } from "graphql";
import type { TypeNode, TypeSystemDefinitionNode } from "graphql/language/ast";

export type TypeDef = string | { filename: string; content: string };

/**
 * A class to build a GraphQL schema with functionality for template types.
 *
 * Template types are expanded automatically with the given template arguments. Template types are types whose name
 * ends with `_T`, and that contain a field with the special `T` type. For example:
 *
 *     type Wrapper_T {
 *       value: T
 *     }
 *
 * When the template type is expanded, the `T` type is replaced with the given template argument. To supply a template
 * argument, simply refer to the template type replacing the "T" with the name of the type to insert. For example:
 *
 *     type Query {
 *       wrapper: Wrapper_String
 *     }
 *
 * The above will the generate a type for `Wrapper_String` that looks like:
 *
 *     type Wrapper_String {
 *       value: String
 *     }
 *
 * Note that the templating mechanism works with a naming convention. The name of the template type must end with `_T`,
 * and the name of the template argument must come after the template type name with the `_T` suffix removed and be
 * separated by an underscore.
 */
export class GraphQLBuilder {
	constructor(typeDefs: TypeDef | Array<TypeDef>) {
		const setNode = (n: TypeDefinitionNode) => {
			if (this.typeDefinitions.has(n.name.value)) {
				throw new Error(`Duplicate definition for type ${n.name.value}`);
			}
			this.typeDefinitions.set(n.name.value, n);

			if (!isTemplateType(n.name.value) && "interfaces" in n && n.interfaces) {
				for (const i of n.interfaces) {
					const interfaceName = i.name.value;
					// The list of types that implement the interface.
					let implementors = this.implementingTypes.get(interfaceName);
					if (!implementors) this.implementingTypes.set(interfaceName, (implementors = []));
					implementors.push(n);
				}
			}

			// Return false to prevent visiting the node's children.
			return false;
		};

		const array = typeof typeDefs === "string" || !Array.isArray(typeDefs) ? [typeDefs] : typeDefs;

		for (const typeDef of array) {
			const { filename, content } =
				typeof typeDef === "string" ? { filename: undefined, content: typeDef } : typeDef;

			try {
				const parsed = parse(content);

				visit(parsed, {
					SchemaDefinition: (n) => {
						this.schemaDefinition = n;
						// Return false to prevent visiting the node's children.
						return false;
					},
					EnumTypeDefinition: setNode,
					InputObjectTypeDefinition: setNode,
					InterfaceTypeDefinition: setNode,
					ObjectTypeDefinition: setNode,
					ScalarTypeDefinition: setNode,
					UnionTypeDefinition: setNode,

					DirectiveDefinition: (n) => {
						this.directiveDefinitions.set(n.name.value, n);
						return false;
					},

					OperationDefinition: (n) => {
						this.operationDefinitions.set(n.name?.value ?? "", n);
						return false;
					},
				});
			} catch (e: unknown) {
				if (!filename || !(e instanceof Error)) throw e;
				throw new Error(`Error parsing ${filename}: ${e.message}`);
			}
		}
	}

	operations(): DocumentNode {
		return {
			kind: Kind.DOCUMENT,
			definitions: [...this.operationDefinitions.values()],
		};
	}

	/**
	 * Returns all generated type definitions.
	 */
	generateTypeDefs(): Map<string, TypeDefinitionNode> {
		const references = new Set<TypeSystemDefinitionNode>();

		for (const node of this.typeDefinitions.values()) {
			this.accumulateReferences(node, references);
		}

		const output = new Map<string, TypeDefinitionNode>();

		for (const node of references) {
			if (node.kind === Kind.DIRECTIVE_DEFINITION || node.kind === Kind.SCHEMA_DEFINITION) continue;

			const name = node.name.value;
			// Names that will be added to output:
			// - Anything that includes an underscore, e.g. "Test_Value"
			// - The special types T and Partial_T
			// - But not the template base type itself, e.g. "Test_T"
			if (name === "T" || name === "Partial_T" || (name.includes("_") && !name.endsWith("_T")))
				output.set(name, node);
		}

		return output;
	}

	/**
	 * Generates a single GraphQL document node that contains all type definitions that are referenced by the given
	 * entry point. Any referenced templated types are instantiated with the respective type argument and added to the
	 * output.
	 *
	 * If no entry point is given, then the schema definition is used per default.
	 */
	bundle(entryPoint?: string): DocumentNode {
		const references = new Set<TypeSystemDefinitionNode>();
		const definitions: DefinitionNode[] = [];

		if (!entryPoint) {
			if (!this.schemaDefinition) {
				throw new Error("Could not determine entry point for bundling: No schema defined.");
			}
			definitions.push(this.schemaDefinition);

			for (const node of this.schemaDefinition.operationTypes) {
				this.accumulateReferences(this.typeDefinitionNode(node.type.name.value), references);
			}
		} else {
			this.accumulateReferences(this.typeDefinitionNode(entryPoint), references);
		}

		definitions.push(...references.values());

		return {
			kind: Kind.DOCUMENT,
			definitions: definitions,
		};
	}

	/**
	 * Returns the type definition node for `typeName`. When no type definition node exists for `typeName`, then a new
	 * type definition node is generated and returned, if possible. Otherwise, a TypeNotFoundError is thrown.
	 *
	 * Generating type definition nodes is possible for the following cases:
	 * - `typeName` refers to a specialized template type, for example `Wrapper_Int`, in which case the template base
	 *    type must be defined. For `Wrapper_Int`, the template base type is `Wrapper_T`.
	 * - `typeName` refers to one of the predefined special types, such as `T` or `Partial_T`.
	 *
	 * @param typeName
	 */
	typeDefinitionNode(typeName: string): TypeDefinitionNode {
		let node = this.typeDefinitions.get(typeName);
		if (!node) {
			node = this.createTypeDefinitionNode(typeName);
			this.typeDefinitions.set(typeName, node);
		}
		return node;
	}

	private createTypeDefinitionNode(typeName: string): TypeDefinitionNode {
		if (typeName === "T" || typeName === "Partial_T" || isBuiltInType(typeName)) {
			return {
				kind: Kind.SCALAR_TYPE_DEFINITION,
				name: {
					kind: Kind.NAME,
					value: typeName,
				},
			};
		}

		// If the requested type is the template itself (ends with _T), then we can't instantiate it.
		// Also, if the requested type is not a templated type (does not contain an underscore), then we can't
		// instantiate it either.
		if (typeName.endsWith("_T") || !typeName.includes("_")) {
			throw new TypeNotFoundError(typeName);
		}

		const parts = typeName.split("_");
		if (parts.length !== 2) throw new Error(`Invalid type name ${typeName}.`);
		const templateTypeName = `${parts[0]}_T`;
		const templateArgTypeName = parts[1];

		let templateNode, T;
		try {
			templateNode = this.typeDefinitionNode(templateTypeName);
			T = this.typeDefinitionNode(templateArgTypeName);
		} catch (e) {
			// Gives better error messages
			if (e instanceof TypeNotFoundError) e.typeStack.push(typeName);
			throw e;
		}

		if (templateTypeName === "Partial_T") {
			const nullable = <T extends { type: TypeNode }>(n: T): T | undefined => {
				if (n.type.kind === Kind.NON_NULL_TYPE) return { ...n, type: n.type.type };
			};

			return {
				...visit(
					T,
					T.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION
						? { InputValueDefinition: nullable }
						: { FieldDefinition: nullable }
				),
				name: { kind: Kind.NAME, value: typeName },
			};
		}

		if (
			templateNode.kind !== Kind.OBJECT_TYPE_DEFINITION &&
			templateNode.kind !== Kind.INTERFACE_TYPE_DEFINITION &&
			templateNode.kind !== Kind.INPUT_OBJECT_TYPE_DEFINITION
		) {
			throw new Error(
				`Cannot generate type for ${typeName}. The template must be an input, interface or object type (got: ${templateNode.kind})`
			);
		}

		if (templateNode.kind === Kind.INPUT_OBJECT_TYPE_DEFINITION) {
			if (T.kind !== Kind.SCALAR_TYPE_DEFINITION && T.kind !== Kind.INPUT_OBJECT_TYPE_DEFINITION) {
				throw new Error(
					`Cannot generate input type for ${typeName}. The template argument must also be an input object type (got: ${T.kind})`
				);
			}
		}

		return {
			...visit(templateNode, {
				NamedType: (n) => {
					const name = n.name.value;

					// Replace all occurrences of the special T type with the requested type
					if (name === "T") {
						return createNamedTypeNode(templateArgTypeName);
					}

					if (name.endsWith("_T")) {
						return createNamedTypeNode(`${name.slice(0, -2)}_${templateArgTypeName}`);
					}

					return false;
				},
			}),
			// Set the name of the type to the instantiated type name
			name: {
				kind: Kind.NAME,
				value: typeName,
			},
			// Convert interface type to object type
			kind:
				templateNode.kind === Kind.INTERFACE_TYPE_DEFINITION
					? Kind.OBJECT_TYPE_DEFINITION
					: templateNode.kind,
		} as ObjectTypeDefinitionNode | InputObjectTypeDefinitionNode;
	}

	/**
	 * Recursively traverses the given type and adds all type definition nodes of referenced types to  the `references`
	 * set. The `references` set  also acts as a set of visited nodes, so that we don't traverse the same node twice.
	 * It is therefore safe to call this method multiple times with different nodes as long as the `references` set is
	 * the same.
	 *
	 * @param node - The node where to begin traversing.
	 * @param references - The set of type definition nodes to add the referenced types to.
	 */
	private accumulateReferences(
		node: TypeDefinitionNode,
		references: Set<TypeSystemDefinitionNode>
	): void {
		// Prevent infinite recursion
		if (references.has(node)) return;

		references.add(node);

		if (node.kind === Kind.INTERFACE_TYPE_DEFINITION) {
			for (const node2 of this.implementingTypes.get(node.name.value) ?? []) {
				this.accumulateReferences(node2, references);
			}
		}

		visit(node, {
			Directive: (n) => {
				const referencedDirectiveName = n.name.value;
				if (isBuiltInDirective(referencedDirectiveName)) return false;
				references.add(this.directiveDefinitionNode(referencedDirectiveName));
			},
			NamedType: (n) => {
				const referencedTypeName = n.name.value;
				if (isBuiltInType(referencedTypeName)) return false;
				this.accumulateReferences(this.typeDefinitionNode(referencedTypeName), references);
				return false;
			},
		});
	}

	private directiveDefinitionNode(directiveName: string): DirectiveDefinitionNode {
		const node = this.directiveDefinitions.get(directiveName);
		if (!node) throw new TypeNotFoundError(`@${directiveName}`);
		return node;
	}

	private schemaDefinition?: SchemaDefinitionNode;
	private typeDefinitions = new Map<string, TypeDefinitionNode>();
	private directiveDefinitions = new Map<string, DirectiveDefinitionNode>();
	private operationDefinitions = new Map<string, OperationDefinitionNode>();

	/**
	 * Map of interface names to the types that implement the interface.
	 */
	private implementingTypes = new Map<
		string,
		(ObjectTypeDefinitionNode | InterfaceTypeDefinitionNode)[]
	>();
}

function isBuiltInType(typeName: string): boolean {
	return (
		typeName === "String" ||
		typeName === "Int" ||
		typeName === "Float" ||
		typeName === "Boolean" ||
		typeName === "ID"
	);
}

function isBuiltInDirective(directiveName: string): boolean {
	return (
		directiveName === "include" ||
		directiveName === "skip" ||
		directiveName === "deprecated" ||
		directiveName === "specifiedBy"
	);
}

function isTemplateType(typeName: string): boolean {
	return typeName === "T" || typeName.endsWith("_T");
}

function createNamedTypeNode(value: string): NamedTypeNode {
	return {
		kind: Kind.NAMED_TYPE,
		name: {
			kind: Kind.NAME,
			value,
		},
	};
}

/**
 * Thrown when a type name is not found in any of the type definitions.
 */
class TypeNotFoundError extends Error {
	constructor(typeName: string) {
		super();
		this.typeStack = [typeName];
	}

	/**
	 * The type names that were searched for. The first element is the type name that was not found, the last element
	 * is the type name with which the search started.
	 */
	typeStack: string[];

	get message() {
		let message = `Type ${this.typeStack[0]} not found.`;

		if (this.typeStack.length > 1) {
			message += ` Searched for ${this.typeStack.reverse().join(" -> ")}.`;
		}

		return message;
	}
}
