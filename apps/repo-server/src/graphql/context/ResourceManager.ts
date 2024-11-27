import type { Result } from "neverthrow";
import { err, ok } from "neverthrow";

import type {
	IOptionallyTimedResourceAttachment,
	IResourceDocumentAttachmentImage,
	IResourceDocumentAttachmentRaw,
	IResourceDocumentAttachmentTabularData,
	IStrictlyTimedResourceAttachment,
} from "../../../interface/IResourceDocumentAttachment";

import { ResourceAttachmentManager } from "~/apps/repo-server/src/graphql/context/ResourceAttachmentManager";
import { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IResourceDocumentAttachment } from "~/drizzle/schema/repo.Resource";
import type { IDatetime } from "~/lib/createDate";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IProjectId, IUserId } from "~/lib/database/Ids";
import type { StrictArrayBuffer } from "~/lib/interface/StrictArrayBuffer";
import type { IProgressReporterFn } from "~/lib/progress/IProgressReporterFn";
import { createProgressReporter } from "~/lib/progress/createProgressReporter";
import { calculateResourceAttachmentHashStream } from "~/lib/resources/calculateResourceAttachmentHash";
import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { StorageEngine } from "~/lib/storage-engine";
import type { Readable, Writable } from "~/lib/streams";
import { chain, createDuplex, createReadable, isReadable } from "~/lib/streams";
import { uuid } from "~/lib/uuid";

@Service(EntityLoader, DrizzleSchema, StorageEngine)
export class ResourceManager {
	constructor(
		private el: EntityLoader,
		private schema: DrizzleSchema,
		private sto: StorageEngine
	) {}

	/**
	 * Create a resource with given data, writes the data to disk and saves the created resource to
	 * the database.
	 *
	 * This function returns a Result type which contains either the created resource or an error.
	 * The only expected errors are those forwarded from the propsInfo function.
	 *
	 * @param propsInfo - Either the resource props directly or an async function which returns the
	 * resource props. Passing props using the async function is a workaround when working with
	 * streams (the parser waits for the stream to be drained and this function relies on
	 * information from the parser)
	 * @param contents - Contents of the resource: Either as uploadId (i.e. a reference to a file in the StorageEngine) or as Readable Stream
	 * @param creator - The user responsible for inserting the created resource into the db (i.e. the
	 * @param commitToDb
	 * @param progress
	 */
	async create(
		propsInfo: IResourceProps | (() => Promise<Result<IResourceProps, { errors: string[] }>>),
		contents:
			| { type: "upload"; uploadId: string }
			| { type: "buffer"; buffer: StrictArrayBuffer }
			| Readable<Buffer>,
		creator: IUserId,
		commitToDb = true, // TODO: Swap arg order
		progress?: IProgressReporterFn
	): Promise<Result<DrizzleEntity<"Resource">, { errors: string[]; warnings: string[] }>> {
		try {
			const [writeProgress, miscProgress] = (progress ?? createProgressReporter(() => {})).fork(85);

			// Setup all streams using this tee stream before actually letting the data flow
			const tee = createDuplex<Buffer, Buffer>();

			// If a readable is supplied it needs to be consumed before this function returns
			// For this reason the contents are first written to a temporary file and then moved
			// to the final destination
			// The name of the temporary file that will be moved once the file hash is known
			let filenameTmp = `tmp_earlyStreamConsumption_${uuid()}`;
			let readable: Readable<Buffer>;
			let writable: Writable<Buffer> | undefined;

			writeProgress(5, "Saving Resource");

			if (isReadable(contents)) {
				readable = contents;
				writable = this.sto.createWriteStream(filenameTmp);
				tee.pipe(writable, { proxyErrors: true });
			} else if (contents.type === "buffer") {
				readable = createReadable([Buffer.from(contents.buffer)]);
				writable = this.sto.createWriteStream(filenameTmp);
				tee.pipe(writable, { proxyErrors: true });
			} else {
				// In case an uploadId is passed, the file is already on our storage and does not need to be streamed there.
				// The only thing to do in this case is compute the hash and rename the file.
				filenameTmp = contents.uploadId;
				readable = this.sto.createReadStream(filenameTmp);
			}

			const [hash] = await Promise.all([
				calculateResourceAttachmentHashStream(tee),
				writable?.promise(),

				// Let the data flow
				chain(readable, tee),
			]);

			writeProgress(85, "Saving TabularData Done");

			let props: IResourceProps;
			if (typeof propsInfo === "function") {
				const propsInfoResult = await propsInfo();
				if (propsInfoResult.isErr()) {
					await this.sto.remove(filenameTmp); // Cleanup temporary file
					return err({ warnings: [], ...propsInfoResult.error });
				}

				props = propsInfoResult.value;
			} else {
				props = propsInfo;
			}

			const attachment = props.attachment as IResourceDocumentAttachment;
			attachment.hash = hash;
			const resource = EntityFactory.create("Resource", { ...props, attachment }, creator);

			const filenameFinal = ResourceAttachmentManager.getPath(resource.id);

			writeProgress(90, "Moving Resource to final destination");

			await this.sto.rename(filenameTmp, filenameFinal);
			writeProgress(100, "Saving Resource done");

			if (commitToDb) {
				await this.el.insert(this.schema.Resource, resource);
			}

			miscProgress(100, "Saving Resource done");

			return ok(resource);
		} catch (e) {
			return err({ warnings: [], errors: ["Unexpected error while creating resource"] });
		}
	}
}

type AttachmentRawProps = WithoutHashAndAllowDate<IResourceDocumentAttachmentRaw>;
type AttachmentTabularProps = Omit<
	WithoutHashAndAllowDate<IResourceDocumentAttachmentTabularData>,
	"bytesPerElement"
>;
type AttachmentImageProps = WithoutHashAndAllowDate<IResourceDocumentAttachmentImage>;

// Utility type to allow:
// - allows begin and end to be of type Date (instead of DateTime)
// - allows hash to be omitted
type WithoutHashAndAllowDate<T extends IResourceDocumentAttachment> = Omit<
	ResourceAttachmentAllowDate<T>,
	"hash"
>;

// Utility type which allows begin and end to be of type Date (instead of DateTime)
type ResourceAttachmentAllowDate<T extends IResourceDocumentAttachment> =
	T extends IStrictlyTimedResourceAttachment
		? Omit<Omit<T, "begin">, "end"> &
				({ begin: Date; end: Date } | { begin: IDatetime; end: IDatetime })
		: T extends IOptionallyTimedResourceAttachment
		? Omit<Omit<T, "begin">, "end"> &
				({ begin?: Date; end?: Date } | { begin?: IDatetime; end?: IDatetime })
		: T;

export interface IResourceProps {
	name: string;
	isRootResource: boolean;
	projectIds?: IProjectId[];
	attachment: AttachmentRawProps | AttachmentTabularProps | AttachmentImageProps;
}
