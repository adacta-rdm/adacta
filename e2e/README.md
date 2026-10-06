# End-to-end tests

The end-to-end suite uses [Playwright](https://playwright.dev) to exercise the
application in Chromium. The root [README](../README.md#browser-tests) describes
how these tests fit into the other development commands.

## Scope

Keep this suite small. Cover important and stable user tasks that require a
browser. Examples include signing in, navigating between sections, and creating
a sample batch. A browser test proves that the task completes. Lower-level tests
cover the detailed rules.

The current journeys are:

- `journeys/login.e2e.ts`: credential sign-in and rejected credentials.
- `journeys/navigation.e2e.ts`: the application entry point and main sections.
- `journeys/samples.e2e.ts`: finding, opening, and creating sample batches.
- `journeys/users.e2e.ts`: creating a record-only user.

Do not cover unfinished screens, visual design, responsive layouts, incidental
wording, list order or counts, or individual validation messages here.

## Running the suite

```bash
bun run test:e2e
bun run test:e2e:ui
bun x playwright show-report
```

Install Chromium before the first run if it is not already present:

```bash
bun x playwright install chromium
```

The test server uses SQLite databases and file storage under `.adacta/e2e/`.
It resets these directories and loads the `demo` preset before each server
start. It then builds the application and starts the production server. Port
5273 must be free.

The suite runs against a production build, locally and in CI. The development
server reloads every open page when it prepares a newly imported dependency for
the browser. Such a reload can interrupt any step of a test. A build has no such
step.

Playwright starts the server for a normal run. During test development, a
server started once can serve several runs. Restart it after a change to the
application, because the build does not follow the source files:

```bash
bun run start:e2e
PLAYWRIGHT_REUSE_SERVER=1 bun x playwright test
```

Global setup signs in with real credentials and saves the resulting browser
state. Each normal test starts with that state. The login journey starts without
it, so that journey exercises the sign-in form itself.

## Writing a journey

1. Put the spec in `e2e/journeys/<area>.e2e.ts`. Import `test` and `expect` from
   `../fixtures`.
2. Use `../seed-data` to obtain a record by its seed filename. Do not copy seed
   values into a test. Give a created record a unique name.
3. Assert the destination URL and one stable result that the user can observe.
   Prefer URLs, roles, and accessible names. Use an API response when the result
   is not visible.
4. Keep each test independent and limited to one task. Tests run in parallel
   against the same seeded databases.

Use locators based on role, label, or accessible name. An `input[name]` locator
is acceptable for a generated form field that has no usable label. Avoid CSS
selectors that depend on markup structure, XPath, `waitForTimeout`, incidental
text, and `data-testid`. A missing accessible locator usually shows an
accessibility problem in the application. Fix that problem before adding a test
identifier.

Keep locators beside the test that uses them. A small helper in the same file is
suitable when several tests share one element. Do not create a page-object
library.

## Keeping journeys stable

Follow the stable user result. Do not follow the current component structure or
temporary states. After navigation or form submission, check the expected URL
and the saved or visible result.

Avoid position-based locators such as `first` and `nth`. Do not assert list
counts, order, loading states, or incidental wording. Obtain dynamic addresses
from real links or from a completed navigation. Do not construct database
identifiers.

Update an affected test in the same branch as an intentional interface change.
Add a new browser test after its task and accessible landmarks are stable. Use
`test.fixme` only for a tracked defect. Its comment must explain the cause and
link to the issue.

## Maintaining the suite

Resolve every failure before merging. Fix an application regression, update a
test for an intentional change, or delete the test when its user task no longer
exists. Retries are disabled. A passing second run does not remove the first
failure. Inspect the saved trace when timing may be involved.

CI uploads the HTML report, traces, screenshots, and retained videos for seven
days.
