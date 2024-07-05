import { readFileSync } from "node:fs";
import { join } from "node:path";

import { print } from "graphql";
import { describe, test, expect } from "vitest";

import { GraphQLBuilder } from "../GraphQLBuilder";

const queries = readFileSync(join(__dirname, "./typeDefs/queries.graphql"), "utf-8");
const types = readFileSync(join(__dirname, "./typeDefs/types.graphql"), "utf-8");

describe("GraphQLBuilder", () => {
	describe("#operations()", () => {
		test("returns operations", () => {
			const builder = new GraphQLBuilder([queries]);

			expect(builder.operations()).toMatchSnapshot();
		});
	});

	describe("#typeDefinitionNode()", () => {
		function setup(typeDefs = [types]) {
			const builder = new GraphQLBuilder(typeDefs);

			return {
				builder,
				typeDef: (typeName: string) => print(builder.typeDefinitionNode(typeName)),
			};
		}

		test("returns type def for defined type", () => {
			const { typeDef } = setup();

			const book = typeDef("Book");

			expect(book).toBe(
				[
					"type Book {", //
					"  id: ID!",
					"  wrappedString: Wrapper_String!",
					"}",
				].join("\n")
			);
		});

		test("returns the concrete type def for a template type", () => {
			const { typeDef } = setup();

			const wrapper = typeDef("Wrapper_String");

			expect(wrapper).toBe(
				[
					"type Wrapper_String {", //
					"  value: String!",
					"}",
				].join("\n")
			);
		});

		test("returns the concrete type def for a template type and resolves template type fields", () => {
			const { typeDef } = setup();

			const wrapper = typeDef("Connection_String");

			expect(wrapper).toBe(
				[
					"type Connection_String {", //
					"  edges: [Edge_String!]!",
					"}",
				].join("\n")
			);
		});

		test("returns special T type", () => {
			const { typeDef } = setup();

			const wrapper = typeDef("T");

			expect(wrapper).toBe(
				[
					"scalar T", //
				].join("\n")
			);
		});

		test("returns scalar type", () => {
			const { typeDef } = setup();

			const scalar = typeDef("Scalar1");

			expect(scalar).toBe("scalar Scalar1");
		});

		test("returns enum type", () => {
			const { typeDef } = setup();

			const enumTypeDef = typeDef("Enum1");

			expect(enumTypeDef).toBe(
				[
					//
					"enum Enum1 {",
					"  A",
					"  B",
					"}",
				].join("\n")
			);
		});

		test("template input type", () => {
			const { typeDef } = setup();

			//
			// input Input1 {
			// 	prop1: Float!
			// 	prop2: String!
			// 	prop3: Int!
			// }
			//
			// input Input2_T {
			// 	prop1: Partial_T!
			// }

			const inputTypeDef = typeDef("Input2_Input1");

			expect(inputTypeDef).toBe(
				[
					//
					"input Input2_Input1 {",
					"  prop1: Partial_Input1",
					"}",
				].join("\n")
			);
		});

		test("returns union type", () => {
			const { typeDef } = setup();

			const union = typeDef("Union1");

			expect(union).toBe("union Union1 = Wrapper_String | Wrapper_Int");
		});

		describe("Partial_T", () => {
			test("makes all fields of type nullable", () => {
				const { typeDef } = setup([
					[
						"type Query {",
						"  books: Connection_Book!",
						"  book(id: ID!): Book",
						"  list: [Book!]!",
						"}",
					].join("\n"),
				]);

				const partialQuery = typeDef("Partial_Query");

				expect(partialQuery).toBe(
					[
						"type Partial_Query {", //
						"  books: Connection_Book",
						"  book(id: ID!): Book",
						"  list: [Book!]",
						"}",
					].join("\n")
				);
			});

			test("makes all fields of interface nullable", () => {
				const { typeDef } = setup();

				const partialInterface = typeDef("Partial_Interface1");

				expect(partialInterface).toBe(
					[
						"interface Partial_Interface1 {", //
						"  prop1: Float",
						"  prop2: String",
						"  prop3: Int",
						"}",
					].join("\n")
				);
			});

			test("makes all fields of input nullable", () => {
				const { typeDef } = setup();

				const partialInput = typeDef("Partial_Input1");

				expect(partialInput).toBe(
					[
						"input Partial_Input1 {", //
						"  prop1: Float",
						"  prop2: String",
						"  prop3: Int",
						"}",
					].join("\n")
				);
			});

			test("returns special Partial_T type", () => {
				const { typeDef } = setup();

				const wrapper = typeDef("Partial_T");

				expect(wrapper).toBe(
					[
						"scalar Partial_T", //
					].join("\n")
				);
			});
		});
	});

	describe("#generateTypeDefs()", () => {
		test("contains all instantiated template types", () => {
			const builder = new GraphQLBuilder([types]);

			const typeDefs = [...builder.generateTypeDefs().keys()];
			expect(typeDefs).toHaveLength(7);
			expect(typeDefs).toContain("Connection_Book");
			expect(typeDefs).toContain("Edge_Book");
			expect(typeDefs).toContain("Wrapper_String");
			expect(typeDefs).toContain("Wrapper_Int");
			expect(typeDefs).toContain("Partial_Input1");
			expect(typeDefs).toContain("Partial_T");
			expect(typeDefs).toContain("T");
		});

		test("recursive type", () => {
			const builder = new GraphQLBuilder(
				[
					"type RecursiveQuery {",
					"  prop1(id: ID!): RecursiveQuery!",
					"  prop2(id: ID!): Wrapper_RecursiveQuery",
					"}",
					//
					"type Wrapper_T {",
					"  value: T",
					"}",
				].join("\n")
			);

			const typeDefs = [...builder.generateTypeDefs().keys()];

			expect(typeDefs).toHaveLength(2);
			expect(typeDefs).toContain("Wrapper_RecursiveQuery");
			expect(typeDefs).toContain("T");
		});
	});

	describe("#bundle()", () => {
		test("include only referenced types", () => {
			const builder = new GraphQLBuilder([types]);

			const document = builder.bundle();

			const typeDefs = print(document);

			expect(document.definitions).toHaveLength(7);

			expect(typeDefs).toContain("schema");
			expect(typeDefs).toContain("type Query");
			expect(typeDefs).toContain("type Connection_Book");
			expect(typeDefs).toContain("type Edge_Book");
			expect(typeDefs).toContain("type Book");
			expect(typeDefs).toContain("type Wrapper_String");
			expect(typeDefs).toContain("input Partial_Input1");
			expect(typeDefs).not.toContain("type Connection_T");
			expect(typeDefs).not.toContain("type Edge_T");
			expect(typeDefs).not.toContain("type Wrapper_T");
			expect(typeDefs).not.toContain("type Unused");
		});

		test("include only referenced types - explicit entry point", () => {
			const builder = new GraphQLBuilder([types]);

			const document = builder.bundle("Type1");

			const typeDefs = print(document);

			expect(document.definitions).toHaveLength(1);

			expect(typeDefs).toContain("type Type1");
			expect(typeDefs).not.toContain("schema");
			expect(typeDefs).not.toContain("type Query");
			expect(typeDefs).not.toContain("type Connection_Book");
			expect(typeDefs).not.toContain("type Edge_Book");
			expect(typeDefs).not.toContain("type Book");
			expect(typeDefs).not.toContain("type Wrapper_String");
			expect(typeDefs).not.toContain("type Connection_T");
			expect(typeDefs).not.toContain("type Edge_T");
			expect(typeDefs).not.toContain("type Wrapper_T");
		});

		test("recursive type", () => {
			const builder = new GraphQLBuilder(
				[
					//
					"type RecursiveQuery {",
					"  prop(id: ID!): RecursiveQuery!",
					"}",
				].join("\n")
			);

			const document = builder.bundle("RecursiveQuery");

			const typeDefs = print(document);

			expect(document.definitions).toHaveLength(1);

			expect(typeDefs).toContain("type RecursiveQuery");
		});

		test("union type", () => {
			const builder = new GraphQLBuilder([types]);

			const document = builder.bundle("Union1");

			const typeDefs = print(document);

			expect(document.definitions).toHaveLength(3);

			expect(typeDefs).toContain("union Union1 = Wrapper_String | Wrapper_Int");
			expect(typeDefs).toContain("type Wrapper_String");
			expect(typeDefs).toContain("type Wrapper_Int");
		});

		test("interface type", () => {
			// Interfaces should be resolved to their implementing types and included in the bundle.
			const builder = new GraphQLBuilder(
				[
					//
					"type Query {",
					"  node(id: ID!): Node",
					"}",
					//
					"interface Node {",
					"  id: ID!",
					"}",
					//
					"type Book implements Node {",
					"  id: ID!",
					"  title: String!",
					"}",
					//
					"type Author implements Node {",
					"  id: ID!",
					"  name: String!",
					"}",
				].join("\n")
			);

			const document = builder.bundle("Query");

			const typeDefs = print(document);

			expect(document.definitions).toHaveLength(4);

			expect(typeDefs).toContain("type Query");
			expect(typeDefs).toContain("interface Node");
			expect(typeDefs).toContain("type Book");
			expect(typeDefs).toContain("type Author");
		});

		test("directives type", () => {
			// Directive definitions should be included in the bundle.
			const builder = new GraphQLBuilder(
				[
					"type Query {",
					"  node(id: ID!): Node",
					"}",
					//
					"interface Node {",
					"  id: ID!",
					"}",
					//
					"type Book implements Node {",
					"  id: ID!",
					"  title: String! @myDirective1",
					"}",
					//
					"directive @myDirective1 on FIELD_DEFINITION",
					"directive @myDirective2 on FIELD_DEFINITION",
				].join("\n")
			);

			const document = builder.bundle("Query");

			const typeDefs = print(document);

			// expect(document.definitions).toHaveLength(4);

			expect(typeDefs).toContain("directive @myDirective1");
			expect(typeDefs).not.toContain("directive @myDirective2");
		});
	});
});
