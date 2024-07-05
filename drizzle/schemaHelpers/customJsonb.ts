import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";

export const customJsonb = <TData>(name: string) =>
	customType<{ data: TData; driverData: TData }>({
		dataType() {
			return "jsonb";
		},
		toDriver(val: TData) {
			return sql`(((${JSON.stringify(val)})::jsonb)#>> '{}')::jsonb`;
		},
		fromDriver(value): TData {
			return value as TData;
		},
	})(name);
