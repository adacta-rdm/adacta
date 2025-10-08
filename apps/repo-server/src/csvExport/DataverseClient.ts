import { create } from "xmlbuilder2";
import xmldoc from "xmldoc";

/**
 * Simple API client for Dataverse
 * Most of the implemented methods use the SWORD API (https://guides.dataverse.org/en/latest/api/sword.html)
 * The addSingleFile method is implemented using the "Native API"
 * (https://guides.dataverse.org/en/latest/api/native-api.html) as the SWORD API does not accept
 * files that are not part of a ZIP file.
 *
 * NOTE: If additional functionality is required, consider using @iqss/dataverse-client-javascript
 * This package was not originally used because v1, which was available at the time, was not
 * comprehensive enough and v2 had not yet been released.
 */
export class DataverseClient {
	constructor(private BASE_URL: string, private API_KEY: string) {}

	private get swordBaseUrl() {
		return `${this.BASE_URL}/dvn/api/data-deposit/v1.1/swordv2`;
	}

	private get nativeBaseURL() {
		return `${this.BASE_URL}/api/`;
	}

	private get swordHeaders() {
		const headers = new Headers();
		headers.set("Authorization", `Basic ${Buffer.from(`${this.API_KEY}:`).toString("base64")}`);
		return headers;
	}

	/**
	 * Adds a file to a Dataset
	 *
	 * NOTE: This uses the "native" API of Dataverse and not the SWORD API
	 *
	 * @param persistentDatasetId
	 * @param fileName
	 * @param source
	 */
	public async addSingleFile(
		persistentDatasetId: string,
		fileName: string,
		source: ReadableStream<Uint8Array>
	) {
		const formData = new FormData();

		formData.set("directoryLabel", "data/subdir");

		formData.set(
			"file",
			{
				// This is a hack to pass a stream into the form data
				// NOTE:	Unfortunately, I was unable to verify whether this methodology really works as intended.
				// 				Uploads work with this method, but I couldn't completely convince myself that the data was also
				// 				consumed in chunks (and not read completely in one go).
				// https://stackoverflow.com/questions/75793118/streaming-multipart-form-data-request-with-native-fetch-in-node-js/75795888
				// https://github.com/nodejs/undici/blob/f9aa0f186c9b1bc2cf2f492159da7c07113198d2/lib/core/util.js#L26
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				[Symbol.toStringTag]: "Blob",
				stream: () => source,
			} satisfies Blob,
			Buffer.from(fileName, "utf-8").toString("latin1")
		);

		await fetch(
			`${this.nativeBaseURL}/datasets/:persistentId/add?persistentId=${persistentDatasetId}&key=${this.API_KEY}`,
			{
				method: "POST",
				body: formData,
			}
		);
	}

	/**
	 * Creates a new dataset in the specified dataverse
	 * @param dataverseCollectionAlias alias of the dataverse collection
	 * @param dataset information about the dataset
	 */
	public async createDataset(
		dataverseCollectionAlias: string,
		dataset: {
			title: string;
			creator: (string | { name: string; affiliation: string })[];
			subject: string[];
			description: string;
		}
	) {
		const root = create({ version: "1.0" });

		const entry = root.ele("entry", {
			xmlns: "http://www.w3.org/2005/Atom",
			"xmlns:dcterms": "http://purl.org/dc/terms/",
		});

		const dc = (str: string) => `dcterms:${str}`;

		entry.ele(dc("title")).txt(dataset.title);

		for (const creatorElement of dataset.creator) {
			if (typeof creatorElement === "string") {
				entry.ele(dc("creator")).txt(creatorElement);
			} else {
				entry
					.ele(dc("creator"))
					.att({ affiliation: creatorElement.affiliation })
					.txt(creatorElement.name);
			}
		}

		for (const string of dataset.subject) {
			entry.ele(dc("subject")).txt(string);
		}

		entry.ele(dc("description")).txt(dataset.description);

		const xml = root.end({ prettyPrint: true });

		const headers = this.swordHeaders;
		headers.set("content-type", "application/atom+xml");

		const r = await fetch(`${this.swordBaseUrl}/collection/dataverse/${dataverseCollectionAlias}`, {
			method: "POST",
			body: xml,
			headers,
		});
		if (r.status !== 201) {
			throw new Error(`Unexpected response: ${await r.text()}`);
		}
		const text = await r.text();
		return new xmldoc.XmlDocument(text).childNamed("id")?.val;
	}

	/**
	 * Returns a list of all Dataverse collections
	 */
	public async getDataverseCollections() {
		const serviceDocument = await this.fetchXML(`${this.swordBaseUrl}/service-document`);

		const collections = serviceDocument.childNamed("workspace")?.childrenNamed("collection");
		if (!collections) {
			return [];
		}

		return collections.map((collection) => {
			const href = collection.attr["href"];

			// The herf of a "Dataverse" contains the string "swordv2/collection/dataverse/" right before the ID
			const split = `swordv2/collection/dataverse/`;
			if (!href.includes(split)) {
				throw new Error(`Unexpected href: ${href}`);
			}
			const id = href.split(split)[1];
			const title = collection.childNamed("atom:title")?.val;
			return { id, title };
		});
	}

	/**
	 * Search for datasets in a specific dataverse collection
	 * @param dataverseCollectionAlias
	 * @param query the search term
	 */
	public async searchDatasets(dataverseCollectionAlias: string, query: string) {
		const request = await fetch(
			`${this.BASE_URL}/api/search?q=${query}&type=dataset&subtree=${dataverseCollectionAlias}&key=${this.API_KEY}`,
			{}
		);
		return (await request.json()) as {
			status: "OK";
			data: { items: { name: string; global_id: string; citation: string }[] };
		};
	}

	public static extractIdentifier(id: string) {
		const split = "swordv2/edit/study/";
		if (id.includes(split)) {
			return id.split(split)[1];
		}
		throw new Error(`Unexpected id: ${id}`);
	}

	private async fetchXML(url: string) {
		const request = await fetch(url, {
			headers: this.swordHeaders,
		});
		const text = await request.text();
		return new xmldoc.XmlDocument(text);
	}
}
