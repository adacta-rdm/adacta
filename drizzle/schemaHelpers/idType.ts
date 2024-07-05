import { customType } from "drizzle-orm/pg-core";

export function idType<T>(name: string) {
	return customType<{
		data: T;
	}>({
		dataType() {
			return "uuid";
		},
	})(name);
}
