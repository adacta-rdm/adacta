import { Buffer } from "buffer";
import { normalize } from "path";
import { Readable as NodeReadable } from "stream";

import type { GetObjectCommandInput, S3Client } from "@aws-sdk/client-s3";
import {
	CopyObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3,
	S3ServiceException,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { RequestPresigningArguments } from "@aws-sdk/types";

import { FileNotFoundError } from "./FileNotFoundError";
import type { IReadOptions } from "./StorageEngine";
import { StorageEngine } from "./StorageEngine";

import { assertDefined, assertInstanceof } from "~/lib/assert";
import type { Readable, Writable } from "~/lib/streams";
import { createDuplex, createPipeline } from "~/lib/streams";

export interface IS3StorageEngineConfig {
	endpoint: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;

	prefix?: string;
}

export class S3StorageEngine extends StorageEngine {
	private s3client: S3Client;
	private readonly bucket: string;
	private readonly prefix: string;

	constructor({
		endpoint,
		region,
		accessKeyId,
		secretAccessKey,
		prefix,
		bucket,
	}: IS3StorageEngineConfig) {
		super();

		this.bucket = bucket;
		this.prefix = prefix ?? "resources";

		this.s3client = new S3({
			endpoint,
			// TODO: is the region param really required?
			region,
			credentials: {
				accessKeyId,
				secretAccessKey,
			},
		});
	}

	async remove(fileName: string) {
		await this.s3client.send(new DeleteObjectCommand(this.getBaseObject(fileName)));
	}

	private headObjectCommand(fileName: string) {
		return this.s3client.send(new HeadObjectCommand(this.getBaseObject(fileName)));
	}

	async exists(fileName: string) {
		try {
			await this.headObjectCommand(fileName);
		} catch (e) {
			if (e instanceof S3ServiceException && e.$metadata.httpStatusCode === 404) {
				return false;
			}

			throw e;
		}

		return true;
	}

	async size(fileName: string) {
		let info;

		try {
			info = await this.headObjectCommand(fileName);
		} catch (e) {
			if (e instanceof S3ServiceException && e.$metadata.httpStatusCode === 404) {
				throw new FileNotFoundError();
			}

			throw e;
		}

		if (typeof info.ContentLength !== "number") {
			throw new Error("Could not get S3 content length");
		}

		return info.ContentLength;
	}

	async readFile(fileName: string): Promise<Buffer> {
		const response = await this.s3client.send(new GetObjectCommand(this.getBaseObject(fileName)));

		return new Promise((resolve, reject) => {
			assertDefined(response.Body);
			assertInstanceof(response.Body, NodeReadable);
			const body = response.Body;

			try {
				const chunks: Buffer[] = [];
				body.on("data", (chunk: Buffer) => chunks.push(chunk));
				body.once("end", () => resolve(Buffer.concat(chunks)));
				body.once("error", reject);
			} catch (err) {
				return reject(err);
			}
		});
	}

	readFileStream(fileName: string) {
		return this.createReadStream(fileName);
	}

	async write(fileName: string, contents: Buffer) {
		await this.s3client.send(
			new PutObjectCommand({
				...this.getBaseObject(fileName),
				Body: contents,
				ACL: "private",
			})
		);
	}

	async rename(oldFileName: string, newFileName: string) {
		// It looks like S3 does not support renaming/moving. The recommended way is to copy and
		// then delete the source
		// https://docs.aws.amazon.com/AmazonS3/latest/userguide/copy-object.html
		try {
			await this.s3client.send(
				new CopyObjectCommand({
					// Specify Source
					CopySource: `${this.bucket}/${this.getKey(oldFileName)}`,
					// Destination is taken from "Key" of the "base object"
					...this.getBaseObject(newFileName),
				})
			);
		} catch (e) {
			if (e instanceof S3ServiceException && e.$metadata.httpStatusCode === 404) {
				throw new FileNotFoundError();
			}

			throw e;
		}

		await this.remove(oldFileName);
	}

	read(path: string, options: IReadOptions = {}): Promise<{ bytesRead: number; buffer: Buffer }> {
		const start = options?.position ?? 0;
		const end = options?.length !== undefined ? start + options.length - 1 : undefined;
		const buffer = options.buffer ?? Buffer.alloc(16 * 1024);

		const stream = this.createReadStream(path, { start, end });

		let bytesRead = 0;

		return new Promise((resolve, reject) => {
			stream.on("data", function (d: Buffer) {
				const capacity = buffer.length - bytesRead;
				const tmp = d.subarray(0, capacity);
				buffer.set(tmp, bytesRead);
				bytesRead += tmp.length;

				if (bytesRead >= buffer.length) {
					// If all requested bytes are read the stream (provided by S3) can be closed
					// In theory, this should not happen, since the stream should only contain the
					// requested bytes. However, for the sake of completeness, the stream will be
					// destroyed.
					stream.destroy();

					resolve({ buffer, bytesRead });
				}
			});

			stream.on("error", reject);

			stream.on("end", () => resolve({ buffer, bytesRead }));
		});
	}

	createReadStream(path: string, options: { start?: number; end?: number } = {}): Readable<Buffer> {
		const stream = createPipeline<Buffer, Buffer>();

		void (async () => {
			const { start = 0, end } = options;
			// See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
			const range = `bytes=${start}-${end !== undefined ? `${end}` : ""}`;

			try {
				const { Body } = await this.s3client.send(
					new GetObjectCommand({
						...this.getBaseObject(path),
						Range: range,
					})
				);

				// Type instanceOf assertion is hopefully justified because this code runs only in a
				// node context (and not in a browser)
				// See: https://stackoverflow.com/a/69803144
				assertInstanceof(Body, NodeReadable);
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
				(stream as any).unshift(Body);

				// stream.destroy = (e?: Error) => {
				// 	// Forward destroy calls to readable
				// 	Body.destroy(e);
				// 	return stream;
				// };
			} catch (e) {
				if (e instanceof S3ServiceException && e.$metadata.httpStatusCode === 404) {
					throw new FileNotFoundError();
				}

				throw e;
			}
		})().catch((e) => {
			assertInstanceof(e, Error);
			// Destroy streams if the IIFE function causes issues on initialization
			// caused while setting up the stream (for example if the S3 invocation causes errors)
			stream.destroy(e);
		});

		return stream;
	}

	createWriteStream(path: string): Writable<Buffer> {
		const duplex = createDuplex<Buffer, Buffer>();

		const upload = new Upload({
			client: this.s3client,
			params: {
				...this.getBaseObject(path),
				ACL: "private",
				// AWS needs a native node stream because it internally uses instanceof checks
				Body: NodeReadable.from(duplex),
			},
			queueSize: 4, // optional concurrency configuration
			partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
			leavePartsOnError: false, // optional manually handle dropped parts
		});

		// upload.done must be called immediately so the data being written to the writable stream is consumed as soon
		// as possible
		const done = upload.done();

		// Keeping this as a reminder on how to implement a progress indicator
		// parallelUploads3.on("httpUploadProgress", (progress) => {
		// 		console.log(progress);
		// 	});

		// The following overrides make duplex.promise() resolve when the upload has completed,
		// not immediately when the caller has called end().
		duplex.promise = () =>
			Promise.race([
				new Promise((resolve, reject) => {
					duplex.on("error", reject);
				}),
				done
					.then(() => {
						// According to the nodejs docs, the 'close' event is emitted when the stream and any of its underlying
						// resources (a file descriptor, for example) have been closed. The event indicates that no more events will be
						// emitted, and no further computation will occur.
						duplex.emit("close");
					})
					.catch((e) => {
						assertInstanceof(e, Error);
						// Destroy streams if the IIFE function causes issues on initialization
						// caused while setting up the stream (for example if the S3 invocation causes errors)
						duplex.destroy(e);
						throw e;
					}),
			]).then();

		return duplex;
	}

	/**
	 * Generates a presigned URL for downloading a file from an S3 bucket.
	 *
	 * @param {string} objectName - The name of the object in the S3 bucket.
	 * @param options - Options that are forwarded to the GetObjectCommand/Presigner.
	 *
	 * @returns {Promise<string>} A promise that resolves to a presigned URL for the specified file.
	 */
	async getDownloadLink(
		objectName: string,
		options?: {
			get?: Pick<
				GetObjectCommandInput,
				| "ResponseCacheControl"
				| "ResponseContentDisposition"
				| "ResponseContentEncoding"
				| "ResponseContentLanguage"
				| "ResponseContentType"
				| "ResponseExpires"
			>;
			sign?: RequestPresigningArguments;
		}
	): Promise<string> {
		const getObjectCommand = new GetObjectCommand(
			options
				? {
						...this.getBaseObject(objectName),
						...options.get,
				  }
				: this.getBaseObject(objectName)
		);

		return getSignedUrl(
			this.s3client,
			getObjectCommand,
			options?.sign ? options.sign : { expiresIn: 3600 }
		);
	}

	async getUploadLink(uploadId: string): Promise<string> {
		const putCommand = new PutObjectCommand({
			...this.getBaseObject(uploadId),
		});
		const presignedUrl = await getSignedUrl(this.s3client, putCommand, {
			expiresIn: 3600,
		});
		return presignedUrl;
	}

	// Internally used by clone-env
	async interBucketCopy(
		src: { fileName: string; bucket: string; prefix: string },
		target: { fileName: string; bucket: string; prefix: string }
	) {
		await this.s3client.send(
			new CopyObjectCommand({
				// Specify Source
				CopySource: `${src.bucket}/${this.getKey(src.fileName, src.prefix)}`,
				// Destination is taken from "Key" of the "base object"
				Bucket: target.bucket,
				Key: this.getKey(target.fileName, target.prefix),
			})
		);
	}

	/**
	 * Get the S3 key for a file name (S3 keys are basically the file names within the S3 bucket)
	 */
	private getKey(fileName: string, customPrefix?: string) {
		return normalize(`${customPrefix ?? this.prefix}/${fileName}`);
	}

	/**
	 * Helper function which constructs a object which is required by many requests
	 */
	private getBaseObject(fileName: string) {
		return {
			Bucket: this.bucket,
			Key: this.getKey(fileName),
		};
	}
}
