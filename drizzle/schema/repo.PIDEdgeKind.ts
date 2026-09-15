import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The kinds of connection a P&ID edge may name.
 *
 * The table holds the names and nothing else. It exists so that a connection
 * can carry a foreign key, which is what stops a connection naming a kind that
 * is not there. How a kind is drawn lives in `app/lib/PID.ts`, which is also
 * the list `RepoManager` copies these rows from.
 */
export const PIDEdgeKind = sqliteTable("PIDEdgeKind", {
	/**
	 * The name of the kind, for example "jacketed". See `app/lib/PID.ts`.
	 */
	id: text("pid_edge_kind_id").primaryKey(),
});
