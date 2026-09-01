/**
 * A bounded, random-access view of a file.
 *
 * Browser files and stored files can implement the same contract without
 * loading the complete source into memory.
 */
export interface FileProbe {
	readonly name: string;
	readonly size: number;
	readonly declaredMediaType: string;
	readonly lastModified: number;
	read(start: number, length: number): Promise<Uint8Array>;
}

export function createFileProbe(file: File): FileProbe {
	return {
		name: file.name,
		size: file.size,
		declaredMediaType: file.type,
		lastModified: file.lastModified,
		async read(start, length) {
			const from = Math.max(0, start);
			const to = Math.min(file.size, from + Math.max(0, length));
			return new Uint8Array(await file.slice(from, to).arrayBuffer());
		},
	};
}
