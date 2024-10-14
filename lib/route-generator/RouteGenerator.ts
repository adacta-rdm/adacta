import { readdirSync, readFileSync } from "node:fs";
import { writeFile, mkdir } from "node:fs/promises";
import { isAbsolute, join, parse, relative, resolve } from "node:path";

import prettier from "prettier";

import { RouteFile } from "./RouteFile";

import type { PathArg } from "~/lib/fs";
import { normalizePath, readUTF8File } from "~/lib/fs";
import { GeneratedFilesReporter } from "~/scripts/utils/fileGenerator/GeneratedFilesReporter";

/**
 * The `RouteGenerator` class is responsible for generating metadata and types for the routes in the application.
 * It ensures type safety for route parameters and query parameters by following a specific naming convention and
 * assuming certain exports in the route files.
 *
 * As an additional benefit, the naming convention for the route files helps to organize large parts of the UI codebase.
 *
 * From a given list of `RouteFile` instances, the `RouteGenerator` class can generate the following files (the example
 * file names below assume the default output path `@`):
 *
 * - One route type file for each route file (`@/routes/name.of.route.ts`):
 *   These files contain the types for the route parameters and query parameters of the route file. They are named the
 *   same as the route file but with a `.ts` extension and placed in an external directory. The original route file can
 *   import these types to ensure type safety.
 * - An index file used to gather all types from the individual route type files (`@/routes/index.ts`):
 *   This file contains a union type of all route names and a union type of all route parameters.
 *   It also exports an array of all route names as strings.
 * - A route config file (`@/route-config.ts`):
 *   This file contains a configuration object that maps route names to the corresponding route file. It must only be
 *   imported by the router component to set up the routes. Because it imports all route files, importing it elsewhere
 *   (e.g. in a route file) would create a circular dependency.
 *
 * Furthermore, the `RouteGenerator` class can update the original route files such that the types are imported from the
 * correct external route type file. This feature is particularly useful in case the route is renamed.
 */
export class RouteGenerator {
	static readdirSync(path: string, outPath?: string): RouteGenerator {
		const files = readdirSync(path)
			.filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"))
			.map((file) => {
				const absolutePath = resolve(path, file);
				return new RouteFile(absolutePath, readFileSync(absolutePath, "utf8"));
			});

		return new RouteGenerator(files, outPath);
	}

	constructor(routes: RouteFile[], private outPath: string = "@") {
		this.set(...routes);

		if (isAbsolute(outPath)) {
			this.outPath = relative(process.cwd(), outPath);
		}

		if (this.routeMap.size !== routes.length) {
			throw new Error("Duplicate route files found");
		}
	}

	/**
	 * A map of absolute file paths to the corresponding `RouteFile` instances.
	 */
	private routeMap = new Map<string, RouteFile>();

	/**
	 * A list of all `RouteFile` instances.
	 */
	private routes: RouteFile[] = [];

	private readonly prettierConfig = prettier.resolveConfig.sync(process.cwd());

	set(...files: RouteFile[]) {
		for (const file of files) {
			const absolutePath = resolve(process.cwd(), file.filename);
			this.routeMap.set(absolutePath, file);
		}
		this.routes = Array.from(this.routeMap.values()).sort((a, b) =>
			a.getRouteName().localeCompare(b.getRouteName())
		);
	}

	delete(...paths: string[]) {
		for (const path of paths) {
			const absolutePath = resolve(process.cwd(), path);
			this.routeMap.delete(absolutePath);
		}
		this.routes = Array.from(this.routeMap.values());
	}

	async update() {
		await mkdir(join(this.outPath, "routes"), { recursive: true });
		return Promise.all([
			this.updateRouteConfig(),
			this.updateRouteFiles(),
			this.updateRouteTypes(),
			this.updateRouteGetDataFiles(),
		]);
	}

	private async write(pathArg: PathArg, fileContents: string, prettify = true) {
		const filePath = normalizePath(pathArg);
		let fileContentsDisk: string | undefined;
		try {
			fileContentsDisk = await readUTF8File(filePath);
		} catch (e: any) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			if (e.code !== "ENOENT") throw e;
		}

		if (prettify) fileContents = this.format(filePath, fileContents);

		// Don't write if the contents are the same
		if (fileContents === fileContentsDisk) return;

		await writeFile(filePath, fileContents);
		this.report.written(filePath);
	}

	private format(filePath: PathArg, fileContents: string) {
		const fullPath = normalizePath(filePath);

		return prettier.format(fileContents, {
			...this.prettierConfig,
			filepath: fullPath, // Pass the file path to enable prettier to select the correct parser
		});
	}

	updateRouteTypes() {
		const promises = this.routes.map((route) => {
			const nestedRoutes = this.routes.filter(
				(otherRoute) => route !== otherRoute && otherRoute.isNestedRouteOf(route)
			);

			const matchParams = [
				`{ params: RouteParams, query: QueryParams }`,
				...nestedRoutes.map((_, i) => `MatchParams${i}`),
			];

			const typeModule = [
				`import type { IRouteGetDataFunctionArgs, IRouteComponentProps, IRouteComponentPropsWithChildren, IMatch } from "~/lib/route-generator/IRouteConfig";`,
				// Filter the complete list of routes to include only those that are nested routes of the current route
				...nestedRoutes.map(
					(r, i) =>
						`import type { MatchParams as MatchParams${i} } from "${r.getModuleName(
							join(this.outPath, "routes")
						)}";`
				),
				`export type Route = "${route.getRouteName()}";`,
				`export type RouteParams = ${route.getParamsTypeText()};`,
				`export type QueryParams = ${route.getQueryParamsTypeText()};`,
				`export type MatchParams = ${matchParams.join(" | ")}`,
				`export type GetDataArgs = IRouteGetDataFunctionArgs<MatchParams>;`,
				`export type Props<T extends (args: IRouteGetDataFunctionArgs<any>) => any> = IRouteComponentProps<MatchParams, T>;`,
				`export type PropsWithChildren<T extends (args: IRouteGetDataFunctionArgs<any>) => any> = IRouteComponentPropsWithChildren<MatchParams, T>;`,
			];

			return this.write(
				[this.outPath, `routes/${route.getModuleName()}.ts`],
				typeModule.join("\n")
			);
		});

		const typeIndexModule = [
			...this.routes.map(
				(r, i) => `import type * as R${i} from "${r.getModuleName(join(this.outPath, "routes"))}"`
			),
			`export type Route = ${this.routes.map((r, i) => `R${i}.Route`).join(" | ")}`,

			`/**`,
			` * @deprecated`,
			` */`,
			`export type RouteDef = Route`,

			`export type RouterArgs =`,

			this.routes
				.flatMap((route, i) => {
					const requiredArgs: string[] = [`R${i}.Route`];

					if (route.hasParams()) {
						requiredArgs.push(`R${i}.RouteParams`);
					}

					if (route.declarations.QueryParams) {
						return [
							`[${requiredArgs.join(", ")}]`,
							`[${requiredArgs.join(", ")}, R${i}.QueryParams]`,
						];
					}

					return [`[${requiredArgs.join(", ")}]`];
				})
				.join(" | "),

			`export const routes = [${this.routes
				.map((r) => `"${r.getRouteName()}"`)
				.join(", ")}] as const;`,
		].join("\n");

		promises.push(this.write([this.outPath, "routes/index.ts"], typeIndexModule));

		return Promise.all(promises);
	}

	updateRouteGetDataFiles() {
		return Promise.all(
			this.routes
				.filter((r) => r.declarations.getData)
				.map((route) => {
					return this.write(
						// Must use .tsx extension to allow for JSX in the file, which is potentially present in the file
						[this.outPath, `routes/${route.getModuleName()}_getData.tsx`],
						route.getFileWithExportedGetDataFunction()
					);
				})
		);
	}

	updateRouteFiles() {
		return Promise.all(
			this.routes.map((route) =>
				// Skip prettifying the route file (the false argument) so we reduce the chance of interfering with the
				// editor/IDE
				this.write(
					route.filename,
					route.getFileWithUpdatedImports(join(this.outPath, "routes")),
					false
				)
			)
		);
	}

	updateRouteConfig() {
		const lines = [
			`import type { ComponentType } from "react"`,
			`import { Route } from "${join(this.outPath, "routes")}"`,
		];

		const routeConfig: Record<string, string> = {};

		const castQueryParams = [];

		const projectRoot = process.cwd();

		for (let i = 0; i < this.routes.length; i++) {
			const route = this.routes[i];
			const routeName = route.getRouteName();

			const prefix = relative(projectRoot, parse(route.filename).dir);

			const moduleName = route.getModuleName(prefix);

			lines.push(`import * as r${i} from "~/${moduleName}"`);
			if (route.declarations.getData) {
				lines.push(
					`import { getData as r${i}_getData } from "./routes/${route.getModuleName()}_getData"`
				);
			}

			if (route.declarations.QueryParams) {
				const q = Object.entries(route.getQueryParams());
				const queryParamNamesAll = q.map(([name]) => name);

				castQueryParams.push(
					`cfg["${routeName}"].deserializeQueryParams = (queryParams: Record<string, string | undefined>) => {`,
					`let { ${queryParamNamesAll.join(", ")} } = queryParams;`,
					// Pass all query params that are typed as non-strings to JSON.parse in order to deserialize them.
					...q
						.filter(([, stringType]) => !stringType)
						.map(([name]) => `if (${name} !== undefined) ${name} = JSON.parse(${name});`),
					`return castQueryParams${i}({ ${queryParamNamesAll.join(", ")} });`,
					`};`
				);

				lines.push(`import { castQueryParams as castQueryParams${i} } from "@/tsrc/${moduleName}"`);
			}

			routeConfig[`"${routeName}"`] = route.declarations.getData
				? `{ ...r${i}, getData: r${i}_getData }`
				: `{ ...r${i} }`;
		}

		lines.push(
			`const cfg =`,
			// eslint-disable-next-line prefer-template
			renderRecord(routeConfig) + " as ",
			`Record<string, ${renderRecord({
				"default?": "ComponentType<any>",
				"redirect?": "Route",
				"deserializeQueryParams?": "(q: Record<string, string | undefined>) => object",
				// "graphQL?": "object",
				"getData?": "(arg: object) => unknown",
				"LoadingState?": "ComponentType<any> | boolean",
			})}>`
		);

		lines.push(...castQueryParams);

		lines.push(`export default cfg`);

		const fileContents = lines.join("\n");

		return this.write([this.outPath, "route-config.ts"], fileContents);
	}

	public report = new GeneratedFilesReporter(process.cwd());
}

function renderRecord(record: Record<string, string>) {
	return `{ ${Object.entries(record)
		.map(([k, v]) => `${k}: ${v}`)
		.join(", ")} }`;
}
