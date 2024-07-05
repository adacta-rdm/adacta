import { v4 } from "uuid";

export function uuid(): string {
	return v4();
	// return v4(undefined, new Uint8Array(16));
}
