import type { RouterContextProvider } from "react-router";

/**
 * The first argument React Router passes to a middleware.
 *
 * React Router's own `MiddlewareFunction` type returns `unknown`, which is not
 * assignable to a route's generated `middleware` array. Declaring the argument
 * shape and returning void keeps middlewares in their own files.
 */
export type MiddlewareArgs = {
	request: Request;
	params: Record<string, string | undefined>;
	context: Readonly<RouterContextProvider>;
};
