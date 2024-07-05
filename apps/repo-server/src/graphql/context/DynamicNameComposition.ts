import { assertDefined } from "@omegadot/assert";
import { eq } from "drizzle-orm";
import type { Opaque } from "type-fest";

import { RepositoryConfig } from "./RepositoryConfig";
import { EntityLoader } from "../../services/EntityLoader";
import type { TDerivationArgs } from "../resolvers/utils/serverSideSpecifications";
import { serverSideSpecifications } from "../resolvers/utils/serverSideSpecifications";

import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IDeviceId, INameCompositionId, ISampleId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

type CacheKey = Opaque<string, "DEVICE_NAME_COMPOSITION_CACHE_KEY">;

@Service(EntityLoader, RepositoryConfig, DrizzleSchema)
export class DynamicNameComposition {
	private cache = new Map<CacheKey, string>();

	constructor(
		private el: EntityLoader,
		private repoConfig: RepositoryConfig,
		private schema: DrizzleSchema
	) {}

	private async getDynamicName(
		compositionId: INameCompositionId | undefined,
		arg: TDerivationArgs,
		specifications: ISpecification[]
	) {
		const {
			Device,
			Sample,
			NameCompositionVariable,
			NameCompositionVariableUsage,
			NameComposition,
		} = this.schema;
		const thing =
			arg.type === "Device" ? await this.el.one(Device, arg.id) : await this.el.one(Sample, arg.id);

		const { name } = thing;

		if (!compositionId) {
			return name;
		}

		const composition = await this.el.findOne(NameComposition, compositionId);

		if (!composition) {
			return name;
		}

		const variables: (
			| { type: "variable"; variable: DrizzleEntity<"NameCompositionVariable"> }
			| { type: "name" }
			| { type: "shortId" }
		)[] = (
			await this.el.drizzle
				.select()
				.from(NameCompositionVariable)
				.innerJoin(
					NameCompositionVariableUsage,
					eq(NameCompositionVariable.id, NameCompositionVariableUsage.variableId)
				)
				.where(eq(NameCompositionVariableUsage.nameCompositionId, composition.id))
		).map((v) => ({ type: "variable", variable: v.NameCompositionVariable }));

		if (composition.legacyNameIndex != undefined) {
			// Use splice to insert the legacy name index at the correct position
			variables.splice(composition.legacyNameIndex, 0, { type: "name" });
		}

		if (composition.shortIdIndex != undefined) {
			// Use splice to insert the legacy name index at the correct position
			variables.splice(composition.shortIdIndex, 0, { type: "shortId" });
		}

		let dynamicName = "";
		for (const block of variables) {
			if (block.type === "variable") {
				const variable = block.variable;
				if (variable.alias) {
					const newNamePart = variable.alias
						// Map the alias to the specification value (if available)
						.map((alias) => specifications.find((spec) => spec.name === alias)?.value)
						// Use first available specification value
						.find((specForAlias) => specForAlias !== undefined);

					if (newNamePart) {
						dynamicName += (variable.prefix ?? "") + newNamePart + (variable.suffix ?? "");
					}
				}

				if (variable.value) {
					dynamicName += variable.value;
				}
			} else if (block.type === "name") {
				dynamicName += name;
			} else if (block.type === "shortId") {
				// Only devices have shortIds
				if (arg.type === "Device") {
					const device = thing as DrizzleEntity<"Device">;
					// If shortId is set append it to the dynamic name
					if (device.shortId) {
						dynamicName += device.shortId;
					}
				}
			}
		}

		return dynamicName;
	}

	public clearCache() {
		this.cache = new Map();
	}

	public async getName(arg: TDerivationArgs) {
		const compositionId =
			arg.type === "Device"
				? await this.repoConfig.getValue("DefaultDeviceNamingStrategy")
				: await this.repoConfig.getValue("DefaultSampleNamingStrategy");

		const key = DynamicNameComposition.getCacheKey(compositionId, arg.id);
		if (this.cache.has(key)) {
			const name = this.cache.get(key);
			assertDefined(name);
			return name;
		} else {
			const specifications = await serverSideSpecifications(arg, {
				el: this.el,
				schema: this.schema,
			});
			const name = await this.getDynamicName(compositionId, arg, specifications);
			this.cache.set(key, name);
			return name;
		}
	}

	private static getCacheKey(
		nameCompositionId: INameCompositionId | undefined,
		id: IDeviceId | ISampleId
	): CacheKey {
		return `${nameCompositionId ?? ""}_${id}` as CacheKey;
	}
}
