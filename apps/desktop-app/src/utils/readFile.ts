export function readFile(file: File): Promise<ArrayBuffer> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (event) => {
			const arrayBuffer = event.target?.result;

			if (typeof arrayBuffer === "string") {
				return reject(new Error("Unexpected string, expected ArrayBuffer"));
			}

			if (!arrayBuffer) {
				return reject(new Error("Error reading file"));
			}

			resolve(arrayBuffer);
		};

		reader.onerror = () => {
			reject(reader.error);
		};

		reader.readAsArrayBuffer(file);
	});
}
