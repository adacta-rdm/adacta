import { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { RepositoryManagerPostgres } from "~/apps/repo-server/src/services/RepositoryManagerPostgres";
import { treeAsURL } from "~/apps/repo-server/src/utils/closureTable/debugUtils";
import { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";

export async function main() {
	const cloneRepositories = ["akd-00e40b5"];
	const p = ServiceContainer.get(RepositoryManagerPostgres);

	for (const cloneRepository of cloneRepositories) {
		const db = p.db();
		const schema = p.schema(cloneRepository);
		const el = new EntityLoader(db);

		const nameMap = new Map<string, string>();
		for (const x of await el.find(schema.DeviceDefinition)) {
			nameMap.set(x.id, x.name);
		}
		console.log(
			await treeAsURL(el, schema.DeviceDefinitionPaths, (x) => nameMap.get(x) ?? x, true, false)
		);
	}
	await p.closeAll();
}

void main();
