export function appendUniqueFiles(currentFiles: File[], addedFiles: File[]): File[] {
	const identities = new Set(currentFiles.map(fileIdentity));
	return [
		...currentFiles,
		...addedFiles.filter((file) => {
			const identity = fileIdentity(file);
			if (identities.has(identity)) return false;
			identities.add(identity);
			return true;
		}),
	];
}

function fileIdentity(file: File): string {
	return `${file.name}\u0000${file.size}\u0000${file.lastModified}\u0000${file.type}`;
}
