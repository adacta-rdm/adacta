import { Minipass } from "minipass";
export class Pipeline extends Minipass {
	constructor(...streams: any[]);
}

//
// declare module "stream" {
// 	import { Duplex, Stream } from "stream";
// 	export function compose(
// 		// eslint-disable-next-line @typescript-eslint/ban-types
// 		...streams: (Stream | Iterable<any> | AsyncIterable<any> | Function)[]
// 	): Duplex;
// }
