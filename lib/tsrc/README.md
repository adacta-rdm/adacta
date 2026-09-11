# TSRC

TSRC generates runtime validators from TypeScript declarations. It reads the
project through the TypeScript compiler API and writes JavaScript validators
with matching ambient declarations.

## Motivation

TSRC is intended for projects in which TypeScript declarations are the primary
definition of the data model.

- TypeScript declarations describe the model without a parallel runtime schema.
- Generated validators have no runtime dependencies.
- No custom schema language or library-specific DSL is required.
- Ambient declarations provide code completion for validator imports.
- One command updates the generated declarations and implementations.

## Usage

Export a named interface, type alias, or enum:

```ts
// lib/api/Job.ts
export interface Job {
	id: string;
	state: "queued" | "running" | "complete";
	tags?: string[];
}
```

Import the required helpers from the generated module. The module path mirrors
the source module path:

```ts
// src/other.ts
// The generated path mirrors lib/api/Job.ts.
import { assertJob, castJob, isJob } from "@/tsrc/lib/api/Job";

const value: unknown = JSON.parse(input);

if (isJob(value)) {
	value.state;
}

assertJob(value);
value.tags;

const job = castJob(JSON.parse(otherInput));
```

TSRC writes the generated source tree below a configurable directory. The
default value for both the directory and import prefix is `@/tsrc`.

Each exported declaration can provide three helpers:

| Helper             | Result                                                                            |
| ------------------ | --------------------------------------------------------------------------------- |
| `isJob(value)`     | Returns a type predicate.                                                         |
| `assertJob(value)` | Narrows the argument or throws an `Error`.                                        |
| `castJob(value)`   | Returns the narrowed value or throws an `Error`. It does not transform the value. |

The generated declarations use `Jsonify<T>` from `type-fest`. The narrowed type
therefore describes the serialized form of the source type.

### Type alias

```ts
// lib/api/Result.ts
export type Result = { ok: true; value: string } | { ok: false; error: string };

// src/consumer.ts
import { isResult } from "@/tsrc/lib/api/Result";

declare const value: unknown;
if (isResult(value)) value.ok;
```

### Enum

```ts
// lib/api/Priority.ts
export enum Priority {
	Low = "low",
	High = "high",
}

// src/consumer.ts
import { assertPriority } from "@/tsrc/lib/api/Priority";

declare const value: unknown;
assertPriority(value);
```

### Concrete generic type

```ts
// lib/api/Page.ts
interface Page<T> {
	items: T[];
	next: string | null;
}

export type JobPage = Page<{ id: string }>;

// src/consumer.ts
import { castJobPage } from "@/tsrc/lib/api/Page";

declare const value: unknown;
const page = castJobPage(value);
```

Generation is demand-based. TSRC scans named imports from generated module
paths and emits only the requested root validators. Add the import before
running the generator:

```sh
bun run build:tsrc
```

The generated tree contains one JavaScript module for each requested source
module and an `index.d.ts` file for module declarations. Generated validators
for reused named types are shared.

## Configuration

TSRC reads the optional `tsrc` field from `package.json` in the current working
directory:

```jsonc
{
	"tsrc": {
		"moduleName": "@/tsrc",
		"ignore": ["lib/database/Ids.ts"],
	},
}
```

`moduleName` is both the output directory and the generated import prefix. Its
default value is `@/tsrc`.

`ignore` contains source files or directories relative to the project root.
Its default value is an empty array.

TSRC loads the nearest `tsconfig.json`. The configuration must include the
source declarations and the generated `index.d.ts`. It must also resolve the
generated module prefix:

```jsonc
{
	"compilerOptions": {
		"baseUrl": ".",
		"paths": {
			"@/*": ["./@/*"],
		},
	},
	"include": ["**/*"],
}
```

The runtime loader or bundler must resolve the same alias. This configuration
is separate from TypeScript path resolution.

## Supported types

TSRC is intended for structural validation of JSON data. It supports:

- `string`, `number`, `boolean`, and `null`
- literal types
- objects with required or optional properties
- string index signatures
- arrays and fixed, optional, or rest tuples
- unions and intersections
- recursive object types
- generic types when they are used by a concrete root type

Object validation is exact. A value fails when it contains a key that is not a
declared property and is not accepted by a string index signature.

`unknown` and `any` accept every value. `never` rejects every value.

The following types have no supported JSON representation:

- `bigint` and `symbol`
- functions and constructors
- `Date`, `Map`, `Set`, `WeakMap`, `WeakSet`, `RegExp`, and `Promise`
- `ArrayBuffer` and `DataView`

TSRC stops generation when a requested validator contains one of these types.

Only exported, top-level, named interfaces, type aliases, and enums can be
requested as root validators. Generic root declarations are not eligible.
TSRC does not resolve re-exports when it scans validator requests.

## How it works

TSRC has two conceptual stages: scan and compile.

The scan stage examines the declarations in the TypeScript project. It also
finds imports of `is`, `assert`, and `cast` helpers from generated module paths.
These imports identify the requested root validators. TSRC writes ambient
declarations for the helpers, which provide code completion and type narrowing.

The compile stage resolves the requested types and generates their validator
modules. The generated directory mirrors the source directory. A named type
that is used several times has one shared validator.
