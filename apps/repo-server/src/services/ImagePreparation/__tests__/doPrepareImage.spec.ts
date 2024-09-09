import { createHash } from "node:crypto";
import { Readable } from "stream";

import probe from "probe-image-size";
import { describe, expect, test } from "vitest";

import { doPrepareImage } from "~/apps/repo-server/src/services/ImagePreparation/doPrepareImage";
import { SilentLogger } from "~/lib/logger/SilentLogger";

const TEST_BASE = "https://s3.storage.omegadot.software/test-images";
const TEST_FILES = {
	JPG: `${TEST_BASE}/test.jpg`,
	// The image contains the same data as test.jpg but the EXIF orientation is set to 5
	// (5 = rotate 90° CW + flip horizontally)
	JPG_EXIF_ROTATE: `${TEST_BASE}/test_exif_rotate.jpg`,
	PNG: `${TEST_BASE}/test.png`,
	BMP: `${TEST_BASE}/test_300x200.bmp`, // BMP images are quite large, so this one is already smaller
	HEIC: `${TEST_BASE}/test.heic`,
} as const;

const logger = new SilentLogger();

describe("ImagePreparation", () => {
	describe("Supports Image Types + Resizes", () => {
		test.each(Object.keys(TEST_FILES).filter((k) => k != "JPG_EXIF_ROTATE"))(
			"Supports %s",
			async (type) => {
				const url = TEST_FILES[type as keyof typeof TEST_FILES];
				const buffer = await doPrepareImage(
					url,
					`image/${type}`,
					{ type: "jpg", maxDimensions: { width: 100, height: 100 } },
					logger
				);

				// Basic sanity check
				expect(await probeBuffer(buffer)).toStrictEqual({
					width: 100,
					height: 67,
					type: "jpg",
					mime: "image/jpeg",
					wUnits: "px",
					hUnits: "px",
				});

				// Check final result
				expect(md5(buffer)).toMatchSnapshot();
			}
		);
	});

	describe("Supports image where orientation is provided by EXIF data", () => {
		test("Supports JPG with EXIF orientation", async () => {
			const buffer = await doPrepareImage(
				TEST_FILES.JPG_EXIF_ROTATE,
				"image/jpeg",
				{ type: "jpg", maxDimensions: { width: 100, height: 100 } },
				logger
			);

			// Basic sanity check
			expect(await probeBuffer(buffer)).toStrictEqual({
				// NOTE: The width and height are swapped (compared to the other images)
				// because of the EXIF orientation
				width: 67,
				height: 100,
				type: "jpg",
				mime: "image/jpeg",
				wUnits: "px",
				hUnits: "px",
			});

			// Check final result
			expect(md5(buffer)).toMatchSnapshot();
		});
	});
});

function probeBuffer(buf: Buffer) {
	return probe(Readable.from(buf));
}

function md5(content: Buffer) {
	return createHash("md5").update(content).digest("hex");
}
