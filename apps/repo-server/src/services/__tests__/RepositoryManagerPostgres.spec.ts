import { PGlite } from "@electric-sql/pglite";
import { drizzle as pgliteDrizzle } from "drizzle-orm/pglite/driver";
import { describe, expect, test } from "vitest";

import type { PostgresConfig } from "../../config/PostgresConfig";
import { RepositoryManagerPostgres } from "../RepositoryManagerPostgres";

import type { AuthenticatedUserInfo } from "~/apps/repo-server/src/graphql/AuthenticatedUserInfo";
import { DrizzleGlobalSchema } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";

describe("RepositoryManagerPostgres", () => {
	async function setup() {
		const sc = new ServiceContainer();
		const drizzle = pgliteDrizzle(new PGlite());

		const rmp = new RepositoryManagerPostgres({} as PostgresConfig);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		rmp.db = () => drizzle as any;

		await rmp.migrate();

		const user = EntityFactory.create("User", {
			firstName: "Test",
			lastName: "User",
			email: "test.user@example.com",
			passwordHash: "password",
			salt: "salt",
			locale: "en",
			dateStyle: "short",
			timeStyle: "short",
		});

		const { User } = new DrizzleGlobalSchema();
		const db = rmp.db();
		await db.insert(User).values(user);

		sc.set(new EntityFactory({ userId: user.id } as AuthenticatedUserInfo));

		return { rmp, sc };
	}

	describe("createRepository", () => {
		test("persist entity into fresh repo", async () => {
			const { rmp, sc } = await setup();

			const ef = sc.get(EntityFactory);

			const repoName = `test_${Date.now()}`;
			await rmp.createRepository(repoName);

			// The following part tests whether the tables have been created
			const { Project } = rmp.schema(repoName);
			const db = rmp.db();
			const project = ef.create("Project", { name: "test project" });
			await db.insert(Project).values(project);

			const projects = await db.select().from(Project);

			expect(projects).toHaveLength(1);
			expect(projects[0].name).toBe("test project");
		});
	});

	describe("repositories()", () => {
		test("returns list that includes recently added items", async () => {
			// Since we are using a real database that is potentially shared with other tests, doing a thorough cleanup
			// after each test is problematic because it might delete data that is still needed by other tests. This
			// also means that we need to take into account that there may be other data in the database that is not
			// related to this test.

			const { rmp } = await setup();

			const repos = [`test1_${Date.now()}`, `test2_${Date.now()}`, `test3_${Date.now()}`];

			await Promise.all(repos.map((repoName) => rmp.createRepository(repoName)));

			const allRepositories = await rmp.repositories();

			expect(allRepositories).toHaveLength(3);
			expect(allRepositories).toContain(repos[0]);
			expect(allRepositories).toContain(repos[1]);
			expect(allRepositories).toContain(repos[2]);
		});
	});
});
