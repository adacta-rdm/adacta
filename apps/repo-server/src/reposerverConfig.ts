import { readEnvVar } from "~/lib/utils/readEnvVar";

export const REPO_UPLOAD_S3_PREFIX_DOWNSAMPLING = readEnvVar(
	"REPO_UPLOAD_S3_PREFIX_DOWNSAMPLING",
	"downsampling"
);
