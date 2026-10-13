# Scripts

`cli.ts` runs the commands of the project. Each package script names one
command. For example, `bun run seed:load pilot` runs
`bun scripts/cli.ts seed:load pilot`. `cli.ts` checks the arguments of the
command and hands the work to the selected runtime, see
[`runtimes/README.md`](../runtimes/README.md). A command therefore fails the
same way in every runtime.

`migrations:baseline` is the exception. It rebuilds the migration baseline
from the schema, which is the same for every runtime. `cli.ts` runs it itself.

`helpers/` holds the modules that `cli.ts` and the runtimes share.
`pid-symbols/` holds the SVGO configuration for the P&ID symbol sources.
