import { readEnvVar } from "~/lib/utils/readEnvVar";

export class S3Config {
	constructor(initializer: Partial<S3Config> = {}) {
		this.endpoint = initializer.endpoint ?? readEnvVar("S3_ENDPOINT");
		this.region = initializer.region ?? readEnvVar("S3_REGION");
		this.accessKeyId = initializer.accessKeyId ?? readEnvVar("S3_ACCESS_KEY");
		this.secretAccessKey = initializer.secretAccessKey ?? readEnvVar("S3_SECRET_ACCESS_KEY");
		this.bucket = initializer.bucket ?? readEnvVar("S3_BUCKET_NAME");
		this.prefix = initializer.prefix ?? readEnvVar("S3_PATH_PREFIX", "");
	}

	endpoint: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	prefix?: string;
}
