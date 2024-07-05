import type { BinaryLike } from "crypto";
import crypto from "crypto";

export function sha256(data: BinaryLike) {
	return crypto.createHash("sha256").update(data).digest("hex");
}
