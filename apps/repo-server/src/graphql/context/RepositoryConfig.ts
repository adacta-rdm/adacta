import {
	DuplicateNameHandling,
	DuplicateNameHandlingSerializer,
} from "../../utils/repositoryConfigValues/DuplicateNameHandling";

import { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { INameCompositionId } from "~/lib/database/Ids";
import type { KeyOf } from "~/lib/interface/KeyOf";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

interface IConfigValueType<T> extends ISerializer<T> {
	default: T;
}

export interface ISerializer<T> {
	serialize: (value: T) => string;
	deserialize: (dbValue: string) => T;
}

interface IConfigValues {
	DuplicateNameHandling: IConfigValueType<DuplicateNameHandling>;
	DefaultDeviceNamingStrategy: IConfigValueType<undefined | INameCompositionId>;
	DefaultSampleNamingStrategy: IConfigValueType<undefined | INameCompositionId>;
}

const CONFIG_VALUES: IConfigValues = {
	DuplicateNameHandling: {
		default: DuplicateNameHandling.WARN,
		serialize: DuplicateNameHandlingSerializer.serialize,
		deserialize: DuplicateNameHandlingSerializer.deserialize,
	},
	DefaultDeviceNamingStrategy: {
		default: undefined,
		serialize: (v) => {
			if (!v) {
				return "";
			}

			return v;
		},
		deserialize: (v) => {
			if (v === "") {
				return undefined;
			}
			return v as INameCompositionId;
		},
	},
	DefaultSampleNamingStrategy: {
		default: undefined,
		serialize: (v) => {
			if (!v) {
				return "";
			}

			return v;
		},
		deserialize: (v) => {
			if (v === "") {
				return undefined;
			}
			return v as INameCompositionId;
		},
	},
};

@Service(EntityLoader, DrizzleSchema)
export class RepositoryConfig {
	constructor(private el: EntityLoader, private schema: DrizzleSchema) {}

	public async setValueWithPermissionCheck<TKey extends keyof IConfigValues>(
		key: TKey,
		value: IConfigValues[TKey]["default"]
	) {
		if (key === "DefaultDeviceNamingStrategy" || key === "DefaultSampleNamingStrategy") {
			await this.setValue(key, value);
			return;
		}

		throw new Error(`Permission denied`);
	}

	private async setValue<TKey extends KeyOf<IConfigValues>>(
		key: TKey,
		value: IConfigValues[TKey]["default"]
	) {
		const serialized = CONFIG_VALUES[key].serialize(value as any);
		await this.el.drizzle
			.insert(this.schema.RepositoryConfigEntry)
			.values({
				key,
				value: serialized,
			})
			.onConflictDoUpdate({
				target: this.schema.RepositoryConfigEntry.key,
				set: { value: serialized },
			});
	}

	public async getValue<TKey extends keyof IConfigValues>(
		key: TKey
	): Promise<(typeof CONFIG_VALUES)[TKey]["default"]> {
		const configEntry = await this.el.findOne(this.schema.RepositoryConfigEntry, key);

		const value = CONFIG_VALUES[key];

		if (!configEntry) {
			return value.default;
		}

		return value.deserialize(configEntry.value);
	}
}
