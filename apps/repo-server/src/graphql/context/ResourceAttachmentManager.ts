import { StorageEngine } from "@omegadot/storage-engine";
import { TabularData } from "@omegadot/tabular-data";

import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import type { IResourceId } from "~/lib/database/Ids";
import { RawTextReader } from "~/lib/rawTextReader/RawTextReader";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

@Service(StorageEngine)
export class ResourceAttachmentManager {
	constructor(private sto: StorageEngine) {}

	public static getPath(resourceOrId: { id: IResourceId } | IResourceId): IResourceId {
		if (typeof resourceOrId === "string") return resourceOrId;

		return resourceOrId.id;
	}

	public async getRawText(resource: DrizzleEntity<"Resource">): Promise<string> {
		const fileName = ResourceAttachmentManager.getPath(resource.id);
		const reader = new RawTextReader(fileName, this.sto);
		return reader.text(0);
	}

	public getTabularData(resource: DrizzleEntity<"Resource">): Promise<TabularData> {
		if (resource.attachment.type !== "TabularData") {
			throw new Error(
				`Can't get TabularDataStream from Resource of type ${resource.attachment.type}`
			);
		}

		const resourcePath = ResourceAttachmentManager.getPath(resource);
		return TabularData.open(this.sto, resourcePath, resource.attachment.columns.length);
	}
}
