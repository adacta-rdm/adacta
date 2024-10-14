import React, { useContext } from "react";

import type { ServiceContainer } from "./ServiceContainer";

import { assertDefined } from "~/lib/assert/assertDefined";

export const Service = React.createContext<ServiceContainer | undefined>(undefined);

export function useService<T>(service: { new (...args: any[]): T }): T {
	const services = useContext(Service);
	assertDefined(services);
	return services.get(service);
}
