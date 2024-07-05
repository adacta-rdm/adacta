import type { IDigitalOceanFunctionArgs } from "./IDigitalOceanFunctionArgs";
import type { IDigitalOceanFunctionReturnType } from "./IDigitalOceanFunctionReturnType";

export interface IDigitalOceanFunction<TReturnBody> {
	(args: IDigitalOceanFunctionArgs):
		| IDigitalOceanFunctionReturnType<TReturnBody>
		| Promise<IDigitalOceanFunctionReturnType<TReturnBody>>;
}
