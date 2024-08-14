import { createReadStream } from "fs";
import { resolve } from "path";

import { describe, expect, test, vi } from "vitest";

import { sleep } from "./sleep";

import { ReusableFileHandle } from "~/lib/storage-engine";

describe("ReusableFileHandle", () => {
	const timeout = 100;
	const path = resolve(__dirname, "samples", "abc.txt");

	test("reading real file works with file handle from reusableFileHandle", () => {
		const reusableFileHandle = new ReusableFileHandle(path, timeout);
		expect(async () => simpleReadStream(reusableFileHandle)).not.toThrow();
	});

	test("closes file after `timout`", async () => {
		const reusableFileHandle = new ReusableFileHandle(path, timeout);
		const { handle, free } = await reusableFileHandle.getFileHandle();
		const closeSpy = vi.spyOn(handle, "close");
		expect(handle.fd).toBeGreaterThanOrEqual(0);
		free();
		await sleep(timeout * 1.1);
		expect(closeSpy).toHaveBeenCalled();
	});

	test("does not close file if another access occurs after less than `timout`", async () => {
		const reusableFileHandle = new ReusableFileHandle(path, timeout);
		const freeableHandle1 = await reusableFileHandle.getFileHandle();
		const closeSpy1 = vi.spyOn(freeableHandle1.handle, "close");
		freeableHandle1.free();
		await sleep(timeout * 0.7);
		const freeableHandle2 = await reusableFileHandle.getFileHandle();
		const closeSpy2 = vi.spyOn(freeableHandle2.handle, "close");
		freeableHandle2.free();
		// Make sure that both timeouts combined is more than `timeout`
		await sleep(timeout * 0.7);
		expect(closeSpy1).not.toHaveBeenCalled();
		expect(closeSpy2).not.toHaveBeenCalled();
	});

	test("reopens automatically", async () => {
		const reusableFileHandle = new ReusableFileHandle(path, timeout);
		// Create a handle and immediately free it
		const freeableHandle1 = await reusableFileHandle.getFileHandle();
		const closeSpy1 = vi.spyOn(freeableHandle1.handle, "close");
		freeableHandle1.free();
		// Wait for timeout to expire (file closed)
		await sleep(timeout * 1.1);
		expect(closeSpy1).toHaveBeenCalled();
		const freeableHandle2 = await reusableFileHandle.getFileHandle();
		// Expect to get a usable fd
		expect(freeableHandle2.handle.fd).toBeGreaterThanOrEqual(0);
		// Free for good measure
		freeableHandle2.free();
	});

	test("transparent reopening", async () => {
		const reusableFileHandle = new ReusableFileHandle(path, timeout);
		const { free } = await reusableFileHandle.getFileHandle();
		free();
		await sleep(timeout * 2);
		await simpleReadStream(reusableFileHandle);
	});

	test("Save against frees while another handle is in use", async () => {
		const reusableFileHandle = new ReusableFileHandle(path, timeout);

		// Get another handle to try to break the file descriptor that is currently in use by the
		// stream readers
		const { free } = await reusableFileHandle.getFileHandle();

		await simpleReadStream(reusableFileHandle, () => {
			// Try to free immediately after reading has started to make sure it doesn't cause a
			// `EBADF: bad file descriptor` error
			free();
			// Try to free twice maybe we can convince the reusableFileHandle to break the file
			// descriptor
			free();
		});
	});

	test("Calling free() twice doesn't break anything", async () => {
		const reusableFileHandle = new ReusableFileHandle(path, timeout);
		const { free } = await reusableFileHandle.getFileHandle();
		free();
		expect(() => free()).not.toThrow();
	});
});

async function simpleReadStream(
	reusableFileHandle: ReusableFileHandle,
	startedReadingCallback?: () => void
) {
	const { handle, free } = await reusableFileHandle.getFileHandle();
	return new Promise<void>((resolve, reject) => {
		const stream = createReadStream("", {
			fd: handle.fd,
			autoClose: false,
			start: 0,
		});

		let startedReading = false;

		stream.on("data", () => {
			if (!startedReading && startedReadingCallback) startedReadingCallback();
			startedReading = true;
		});

		stream.on("end", () => {
			free();
			resolve();
		});

		stream.on("error", reject);
	});
}
