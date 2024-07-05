/* eslint-disable @typescript-eslint/no-unused-vars */
import assert from "assert";
import { readFile } from "fs/promises";
import { resolve } from "path";

import { assertDefined, isNonNullish } from "@omegadot/assert";
import axios from "axios";
import { gql, GraphQLClient } from "graphql-request";
import { createClient } from "graphql-ws";
import { decode } from "jsonwebtoken";
import WebSocket from "ws";

import type { Insert_DeviceInput } from "@/relay/DeviceAddMutation.graphql";
import { uploadFile } from "~/apps/desktop-app/src/utils/uploadFile";
import type {
	IAddSampleInput,
	IImportTaskSubscription,
} from "~/apps/repo-server/src/graphql/generated/requests";
import { getSdk as getRepoServerSdk } from "~/apps/repo-server/src/graphql/generated/requests";
import type {
	Exact,
	IAddComponentInput,
	IAddDeviceDefinitionInput,
	IAddProjectInput,
	IAddSetupLabelInput,
	ILinkToProjectInput,
} from "~/apps/repo-server/src/graphql/generated/resolvers";
import { sliceBufferAndCopyToNewArrayBuffer } from "~/apps/repo-server/src/sliceBufferAndCopyToNewArrayBuffer";
import { createIDatetime } from "~/lib/createDate";
import type { IResourceId } from "~/lib/database/Ids";
import type { ILoginRequest } from "~/lib/interface/ILoginRequest";
import type { ILoginResponse } from "~/lib/interface/ILoginResponse";
import { assertILoginResponse } from "~/lib/interface/type_checks/assertILoginResponse";
import { AuthURL } from "~/lib/url/AuthURL";
import { RepoURL } from "~/lib/url/RepoURL";

export function getRepoServerClient(target: RepoURL, accessToken: string) {
	const tokenData = decode(accessToken);
	assertDefined(tokenData);
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore

	const userId = tokenData["userId"] as string;

	return new GraphQLClient(target.graphqlEndpoint, {
		headers: {
			"Content-Type": "application/json",
			"User-Id": userId,
			"repository-name": target.databaseName,
			"repository-id": "IGNORED",
			Authorization: `Bearer ${accessToken}`,
		},
	});
}

export function getRepoServerClientWS(target: RepoURL, accessToken: string) {
	const tokenData = decode(accessToken);
	assertDefined(tokenData);
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore

	const userId = tokenData["userId"] as string;

	const client = createClient({
		webSocketImpl: WebSocket,
		url: target.graphqlEndpointWS,
		connectionParams: {
			"Content-Type": "application/json",
			"User-Id": userId,
			"repository-name": target.databaseName,
			"repository-id": "IGNORED",
			authorization: `Bearer ${accessToken}`,
		},
	});

	return client;
}

async function addResources(
	fileSuffix: string, // Alternate between two options
	importRawResource: (
		fileName: string,
		preset: Record<string, any>,
		displayName?: string
	) => Promise<(string | null | undefined)[]>,
	resourceStartDate: number,
	mfcDevice1: string,
	mfcDevice2: string,
	mfcDevice3: string,
	mfcDevice4: string,
	setupDevice: string,
	tcInlet: string,
	tcOutlet: string,
	sampleName: string,
	ftir: string
) {
	await importRawResource(
		`MFC_Temp${fileSuffix}.csv`,
		{
			delimiter: ",",
			decimalSeparator: ",",
			preview: 5,
			dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
			columnMetadata: {
				Time: {
					type: "offset",
					conversionFactor: 1000,
					timezone: "Europe/Berlin",
					startDate: resourceStartDate,
					normalizerIds: [],
					columnId: "Time",
					independent: [],
				},
				CO2: {
					type: "number",
					normalizerIds: [],
					columnId: "CO2",
					deviceId: mfcDevice1,
					devicePath: ["mfc1"],
					independent: ["Time"],
					unit: "ml/min",
				},
				Ar: {
					type: "number",
					normalizerIds: [],
					columnId: "Ar",
					deviceId: mfcDevice2,
					devicePath: ["mfc2"],
					independent: ["Time"],
					unit: "ml/min",
				},
				H2: {
					type: "number",
					normalizerIds: [],
					columnId: "H2",
					deviceId: mfcDevice3,
					devicePath: ["mfc3"],
					independent: ["Time"],
					unit: "ml/min",
				},
				iC4H10: {
					type: "number",
					normalizerIds: [],
					columnId: "iC4H10",
					deviceId: mfcDevice4,
					devicePath: ["mfc4"],
					independent: ["Time"],
					unit: "ml/min",
				},
				Reaktor: {
					type: "number",
					normalizerIds: [],
					columnId: "Reaktor",
					independent: ["Time"],
					unit: "°C",
					devicePath: ["furnace"],
					deviceId: setupDevice,
				},
				Tin: {
					type: "number",
					normalizerIds: [],
					columnId: "Tin",
					independent: ["Time"],
					unit: "°C",
					devicePath: ["inlet"],
					deviceId: tcInlet,
				},
				Tout: {
					type: "number",
					normalizerIds: [],
					columnId: "Tout",
					independent: ["Time"],
					unit: "°C",
					devicePath: ["outlet"],
					deviceId: tcOutlet,
				},
			},
		},
		`${sampleName}-450C.csv`
	);

	await importRawResource(
		`Analytics${fileSuffix}.csv`,
		{
			delimiter: "\t",
			decimalSeparator: ",",
			preview: 5,
			dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
			columnMetadata: {
				Datum: {
					type: "offset",
					conversionFactor: 1000,
					timezone: "Europe/Berlin",
					startDate: resourceStartDate,
					normalizerIds: [],
					columnId: "Datum",
					independent: [],
				},
				"CH4 191C": {
					type: "number",
					normalizerIds: [],
					columnId: "CH4 191C",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				CO: {
					type: "number",
					normalizerIds: [],
					columnId: "CO",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				"CO2%": {
					type: "number",
					normalizerIds: [],
					columnId: "CO2%",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				Ethane: {
					type: "number",
					normalizerIds: [],
					columnId: "Ethane",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				ETHYLENE: {
					type: "number",
					normalizerIds: [],
					columnId: "ETHYLENE",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				Formaldehyde: {
					type: "number",
					normalizerIds: [],
					columnId: "Formaldehyde",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				"Formic Acid": {
					type: "number",
					normalizerIds: [],
					columnId: "Formic Acid",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				"H2O%": {
					type: "number",
					normalizerIds: [],
					columnId: "H2O%",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				MeOH: {
					type: "number",
					normalizerIds: [],
					columnId: "MeOH",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				N2O: {
					type: "number",
					normalizerIds: [],
					columnId: "N2O",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				NH3: {
					type: "number",
					normalizerIds: [],
					columnId: "NH3",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				NO: {
					type: "number",
					normalizerIds: [],
					columnId: "NO",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				NO2: {
					type: "number",
					normalizerIds: [],
					columnId: "NO2",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				Propane: {
					type: "number",
					normalizerIds: [],
					columnId: "Propane",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				Propylene: {
					type: "number",
					normalizerIds: [],
					columnId: "Propylene",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
				SO2: {
					type: "number",
					normalizerIds: [],
					columnId: "SO2",
					deviceId: ftir,
					devicePath: ["analytics"],
					independent: ["Datum"],
					unit: "ppm",
				},
			},
		},
		`${sampleName}-FTIR.csv`
	);
}

async function loadFixtures(
	email: string,
	password: string,
	authServer: AuthURL,
	repoURL: RepoURL
) {
	const { success, authServerJWT } = await login(email, password, authServer);
	if (!success) {
		throw new Error("Login failed");
	}

	assertDefined(authServerJWT);
	const sdk = getRepoServerSdk(getRepoServerClient(repoURL, authServerJWT));
	const wsClient = getRepoServerClientWS(repoURL, authServerJWT);

	// const sdkWs = getRepoServerSdk(wsClient as unknown as GraphQLClient);

	async function addDevice(
		input: Exact<{ input: Insert_DeviceInput }>["input"]["input"]
	): Promise<string> {
		const data = await sdk.AddDevice({
			input: {
				input: {
					name: input.name,
					deviceDefinition: input.deviceDefinition,
					specifications: [...input.specifications],
					assignShortId: false,
				},
			},
		});
		const node = data.upsertDevice?.add?.appendedEdge.node;
		assertDefined(node);
		return node.id;
	}

	async function addSample(input: Exact<{ input: IAddSampleInput }>["input"]) {
		const data = await sdk.AddSample({ input });
		assertDefined(data.addSample.appendedEdge.node?.id);
		return data.addSample.appendedEdge.node.id;
	}

	async function addProject(input: Exact<{ input: IAddProjectInput }>["input"]) {
		const data = await sdk.AddProject({ input });
		return data.addProject.node.id;
	}

	async function linkProject(input: Exact<{ input: ILinkToProjectInput }>["input"]) {
		await sdk.LinkProject({ input });
	}

	async function addSetupLabel(input: Exact<{ input: IAddSetupLabelInput }>["input"]) {
		await sdk.AddSetupLabel({ input });
	}

	async function addComponent(input: Exact<{ input: IAddComponentInput }>["input"]) {
		await sdk.AddComponent({ input });
	}

	async function addDeviceDefinition(input: Exact<{ input: IAddDeviceDefinitionInput }>["input"]) {
		const data = await sdk.AddDeviceDefinition({ input });
		return data.addDeviceDefinition.id;
	}

	async function importImage(filePath: string): Promise<{ _id: IResourceId }> {
		console.log("Import image", filePath);
		// Read resource attachment
		const fileContents = await readFile(resolve("static", filePath));
		const array = sliceBufferAndCopyToNewArrayBuffer(fileContents);

		const uploadRequest = await sdk.ImportRawResourceRequest({});

		console.log("Upload to", uploadRequest.importRawResourceRequest.url);
		await uploadFile(array, uploadRequest.importRawResourceRequest.url);
		console.log("Upload done");

		const result = await sdk.ImportImageResource({
			input: { uploadId: uploadRequest.importRawResourceRequest.id },
		});

		console.log("Image import done");

		return { _id: result.importImageResource as IResourceId };
	}

	async function importRawResource(
		fileName: string,
		preset: Record<string, any>,
		displayName?: string
	): Promise<string[]> {
		console.log("Import raw", fileName);
		const fileContents = await readFile(resolve("scripts/fixtures/data/resources", fileName));
		const buf = sliceBufferAndCopyToNewArrayBuffer(fileContents);
		const uploadRequest = await sdk.ImportRawResourceRequest({});
		console.log("Upload request", uploadRequest);
		await uploadFile(buf, uploadRequest.importRawResourceRequest.url);

		const vars = {
			input: {
				uploadId: uploadRequest.importRawResourceRequest.id,
				uploadDevice: setupDevice,
				name: displayName ?? fileName,
			},
		};
		console.log("ImportRawResource", vars);

		const importRawResourceResult = await sdk.ImportRawResource(vars);
		console.log("ImportRawResource done");

		const rawResourceId = importRawResourceResult.importRawResource;

		const { createAndRunImportTransformation } = await sdk.CreateAndRunImportTransformation({
			input: { rawResourceId, presetJson: JSON.stringify(preset) },
		});

		let unsub = () => {};

		const ret = await new Promise<string[]>((resolve, reject) => {
			unsub = wsClient.subscribe(
				{
					// NOTE: This query should match the "ImportTask"-subscription in Import.graphql
					// to generate proper types
					query: gql`
						subscription ImportTask {
							importTask {
								id
								payload {
									__typename
									... on ImportTransformationError {
										message
									}
									... on ImportTransformationProgress {
										progress
									}
									... on ImportTransformationSuccess {
										ids
									}
								}
							}
						}
					`,
				},
				{
					next: ({ data: d }) => {
						if (d) {
							const data = d as IImportTaskSubscription;
							if (createAndRunImportTransformation.importTaskId === data.importTask.id) {
								const payload = data.importTask.payload;

								if (payload.__typename === "ImportTransformationSuccess") {
									resolve([rawResourceId, ...payload.ids.filter(isNonNullish)]);
									unsub();
								} else if (payload.__typename === "ImportTransformationProgress") {
									console.log(`Import raw Progress ${fileName}(${payload.progress ?? "?"})`);
								}
							}
						}
					},
					complete: () => {
						console.log("Done?");
					},
					error(errorValue) {
						reject(errorValue);
					},
				}
			);
		});

		unsub();

		return ret;
	}

	/**
	 * Definitions
	 */
	const setupDefinition = await addDeviceDefinition({
		name: "Setup",
		acceptedUnits: [],
		specifications: [],
	});
	const mfcDeviceDefinition = await addDeviceDefinition({
		name: "MFC",
		acceptedUnits: ["volumetric_flow"],
		specifications: [],
	});
	const furnaceDefinition = await addDeviceDefinition({
		name: "Furnace",
		acceptedUnits: ["temperature"],
		specifications: [],
	});

	const quartzTubeDefinition = await addDeviceDefinition({
		name: "Quartz-Tube",
		acceptedUnits: [],
		specifications: [],
	});
	const aluminaTubeDefinition = await addDeviceDefinition({
		name: "Alumina-Tube",
		acceptedUnits: [],
		specifications: [],
	});

	const ftirDefinition = await addDeviceDefinition({
		name: "FTIR",
		specifications: [],
		acceptedUnits: ["unitless"],
	});

	const msDefinition = await addDeviceDefinition({
		name: "MS",
		specifications: [],
		acceptedUnits: ["unitless"],
	});

	const tcDefinition = await addDeviceDefinition({
		name: "Thermocouple",
		specifications: [],
		acceptedUnits: ["temperature"],
	});

	/**
	 * Devices
	 */
	const mfcDevice1 = await addDevice({
		name: "MFC 250mL/min",
		deviceDefinition: mfcDeviceDefinition,
		specifications: [],
	});
	const mfcDevice2 = await addDevice({
		name: "MFC 1L/min",
		deviceDefinition: mfcDeviceDefinition,
		specifications: [],
	});
	const mfcDevice3 = await addDevice({
		name: "MFC 5mL/min",
		deviceDefinition: mfcDeviceDefinition,
		specifications: [],
	});
	const mfcDevice4 = await addDevice({
		name: "MFC 5mL/min",
		deviceDefinition: mfcDeviceDefinition,
		specifications: [],
	});
	const geroFurnace = await addDevice({
		name: "GERO Furnace",
		deviceDefinition: furnaceDefinition,
		specifications: [],
	});

	const quartzTube1 = await addDevice({
		name: "Quartz Tube 1",
		deviceDefinition: quartzTubeDefinition,
		specifications: [],
	});
	const quartzTube2 = await addDevice({
		name: "Quartz Tube 2",
		deviceDefinition: quartzTubeDefinition,
		specifications: [],
	});
	const aluminaTube1 = await addDevice({
		name: "Alumina Tube 2",
		deviceDefinition: aluminaTubeDefinition,
		specifications: [],
	});

	const tcInlet = await addDevice({
		name: "Thermocouple Inlet",
		deviceDefinition: tcDefinition,
		specifications: [],
	});

	const tcOutlet = await addDevice({
		name: "Thermocouple Outlet",
		deviceDefinition: tcDefinition,
		specifications: [],
	});

	const ftir = await addDevice({
		name: "FTIR",
		deviceDefinition: ftirDefinition,
		specifications: [],
	});
	const ms = await addDevice({
		name: "Mass Spectrometer",
		deviceDefinition: msDefinition,
		specifications: [],
	});

	/**
	 * Main Setup
	 */
	const setupDevice = await addDevice({
		name: `Demo-Setup`,
		deviceDefinition: setupDefinition,
		specifications: [],
	});

	/**
	 * Samples and resources
	 */
	for (let i = 0; i < 1; i++) {
		const sampleName = `JR-PdAl203_00${i}`;
		const quartzTube1 = await addDevice({
			name: `Quartz Tube ${sampleName}`,
			deviceDefinition: quartzTubeDefinition,
			specifications: [],
		});
		const samplePd = await addSample({ name: sampleName });

		await addComponent({
			name: "sample",
			componentId: samplePd,
			begin: createIDatetime(new Date(2022, i, 1)),
			// end: createIDatetime(new Date(2022, i, 28)),
			parentDeviceId: quartzTube1,
			returnedDeviceId: quartzTube1,
		});

		await addComponent({
			name: "tube",
			componentId: quartzTube1,
			begin: createIDatetime(new Date(2022, i, 1)),
			end: i === 5 ? undefined : createIDatetime(new Date(2022, i, 28)),
			parentDeviceId: geroFurnace,
			returnedDeviceId: geroFurnace,
		});

		const resourceStartDate = new Date(2022, i, 2, 10, Math.round(Math.random() * 60)).getTime();

		await addResources(
			"1",
			importRawResource,
			resourceStartDate,
			mfcDevice1,
			mfcDevice2,
			mfcDevice3,
			mfcDevice4,
			geroFurnace,
			tcInlet,
			tcOutlet,
			`${sampleName}_A`,
			i === 3 ? ms : ftir
		);

		assert(i < 20);
		const resourceStartDate2 = new Date(
			2022,
			i,
			8 + i,
			10,
			Math.round(Math.random() * 60)
		).getTime();

		await addResources(
			"2",
			importRawResource,
			resourceStartDate2,
			mfcDevice1,
			mfcDevice2,
			mfcDevice3,
			mfcDevice4,
			geroFurnace,
			tcInlet,
			tcOutlet,
			`${sampleName}_B`,
			i === 3 ? ms : ftir
		);

		// sampleName = `JR-PtAl203_00${i}`
		// const quartzTubePd = await addDevice({
		// 	name: `Quartz Tube JR-PdAl203_00${i}`,
		// 	deviceDefinition: quartzTubeDefinition,
		// });
		// const samplePt = await addSample({ name: `JR-PtAl203_00${i}` });
	}

	await addComponent({
		name: "analytics",
		componentId: ftir,
		begin: createIDatetime(new Date(2022, 0, 1)),
		end: createIDatetime(new Date(2022, 3, 1)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	await addComponent({
		name: "analytics",
		componentId: ms,
		begin: createIDatetime(new Date(2022, 3, 2)),
		end: createIDatetime(new Date(2022, 3, 30)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	await addComponent({
		name: "analytics",
		componentId: ftir,
		begin: createIDatetime(new Date(2022, 3, 30)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	await addComponent({
		name: "inlet",
		componentId: tcInlet,
		begin: createIDatetime(new Date(2022, 0, 1)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	await addComponent({
		name: "outlet",
		componentId: tcOutlet,
		begin: createIDatetime(new Date(2022, 0, 1)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	/**
	 * Add MFC 1-4
	 */
	await addComponent({
		name: "mfc1",
		componentId: mfcDevice1,
		begin: createIDatetime(new Date(2022, 0, 1)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	await addComponent({
		name: "mfc2",
		componentId: mfcDevice2,
		begin: createIDatetime(new Date(2022, 0, 1)),
		end: createIDatetime(new Date(2022, 1, 12)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});
	await addComponent({
		name: "mfc2",
		componentId: mfcDevice2,
		begin: createIDatetime(new Date(2022, 2, 1)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	await addComponent({
		name: "mfc3",
		componentId: mfcDevice3,
		begin: createIDatetime(new Date(2022, 0, 1)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	await addComponent({
		name: "mfc4",
		componentId: mfcDevice4,
		begin: createIDatetime(new Date(2022, 0, 1)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	/**
	 * Setup furnace ( + tube + sample)
	 */
	await addComponent({
		name: "furnace",
		componentId: geroFurnace,
		begin: createIDatetime(new Date(2022, 0, 1)),
		parentDeviceId: setupDevice,
		returnedDeviceId: setupDevice,
	});

	await sdk.AddDeviceImage({
		input: {
			imageId: (await importImage("images/mfc-el-flow-prestige.png"))._id,
			imageOwnerId: mfcDeviceDefinition,
		},
	});

	await sdk.AddDeviceImage({
		input: {
			imageId: (await importImage("images/nsc-setup.jpg"))._id,
			imageOwnerId: setupDefinition,
		},
	});

	await sdk.AddDeviceImage({
		input: {
			imageId: (await importImage("images/ftir.jpg"))._id,
			imageOwnerId: ftirDefinition,
		},
	});

	await sdk.AddDeviceImage({
		input: {
			imageId: (await importImage("images/k-thermocouple.jpg"))._id,
			imageOwnerId: tcDefinition,
		},
	});

	await sdk.AddDeviceImage({
		input: {
			imageId: (await importImage("images/quartztube.jpg"))._id,
			imageOwnerId: quartzTubeDefinition,
		},
	});

	await sdk.AddDeviceImage({
		input: {
			imageId: (await importImage("images/ms.jpg"))._id,
			imageOwnerId: msDefinition,
		},
	});

	await sdk.AddDeviceImage({
		input: {
			imageId: (await importImage("images/furnace.jpg"))._id,
			imageOwnerId: furnaceDefinition,
		},
	});

	const setupDescriptionImageId = (await importImage("images/example_setup_small.png"))._id;
	await sdk.LinkImageWithSetupDescription({
		input: {
			deviceId: setupDevice,
			resourceId: setupDescriptionImageId,
			begin: createIDatetime(new Date(2022, 0, 1, 14)),
		},
	});

	const setupLabels = [
		{ xPos: 105, yPos: 100, propertyPath: ["mfc1"] },
		{ xPos: 180, yPos: 100, propertyPath: ["mfc2"] },
		{ xPos: 253, yPos: 100, propertyPath: ["mfc3"] },
		{ xPos: 320, yPos: 100, propertyPath: ["mfc4"] },
		// Old positions probably not that correct...
		// { xPos: 322, yPos: 120, propertyPath: ["mfc5"] },
		// { xPos: 390, yPos: 120, propertyPath: ["cem1", "mfc"] },
		// { xPos: 435, yPos: 150, propertyPath: ["cem1"] },
		// { xPos: 480, yPos: 120, propertyPath: ["cem1", "lfc"] },
		// { xPos: 580, yPos: 120, propertyPath: ["mfc6"] },
		// { xPos: 655, yPos: 120, propertyPath: ["mfc7"] },
		// { xPos: 728, yPos: 120, propertyPath: ["mfc8"] },
		// { xPos: 796, yPos: 120, propertyPath: ["mfc9"] },
		// { xPos: 871, yPos: 120, propertyPath: ["mfc10"] },
		// { xPos: 940, yPos: 120, propertyPath: ["mfc11"] },

		{ xPos: 210, yPos: 250, propertyPath: ["furnace"] },

		// Disabled to allow show-casing the creation of labels
		// { xPos: 210, yPos: 280, propertyPath: ["furnace", "tube"] },
		// { xPos: 130, yPos: 280, propertyPath: ["inlet"] },
		// { xPos: 290, yPos: 280, propertyPath: ["outlet"] },

		{ xPos: 495, yPos: 295, propertyPath: ["analytics"] },
	];

	for (const setupLabel of setupLabels) {
		await addSetupLabel({
			imageId: setupDescriptionImageId,
			deviceId: setupDevice,
			...setupLabel,
		});
	}

	// await addComponent({
	// 	name: "tube",
	// 	componentId: quartzTube1,
	// 	begin: createIDatetime(new Date(2022, 0, 1)),
	// 	end: createIDatetime(new Date(2022, 4, 1)),
	// 	parentDeviceId: geroFurnace,
	// 	returnedDeviceId: geroFurnace,
	// });
	//
	// await addComponent({
	// 	name: "tube",
	// 	componentId: quartzTube2,
	// 	begin: createIDatetime(new Date(2022, 4, 15)),
	// 	parentDeviceId: geroFurnace,
	// 	returnedDeviceId: geroFurnace,
	// });

	// Quartz Tube 1 -> Sample 1
	// await addComponent({
	// 	name: "sample",
	// 	componentId: sample1,
	// 	begin: createIDatetime(new Date(2022, 0, 1)),
	// 	parentDeviceId: quartzTube1,
	// 	returnedDeviceId: quartzTube1,
	// });
	//
	// // Quartz Tube 1 -> Sample 2
	// await addComponent({
	// 	name: "sample",
	// 	componentId: sample2,
	// 	begin: createIDatetime(new Date(2022, 0, 1)),
	// 	parentDeviceId: quartzTube2,
	// 	returnedDeviceId: quartzTube2,
	// });

	// await importRawResource("adactaSample.csv", {
	// 	delimiter: ",",
	// 	decimalSeparator: ",",
	// 	preview: 5,
	// 	dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
	// 	columnMetadata: {
	// 		Time: {
	// 			type: "offset",
	// 			conversionFactor: 1000,
	// 			timezone: "Europe/Berlin",
	// 			startDate: 1641463200000,
	// 			normalizerIds: [],
	// 			columnId: "Time",
	// 			independent: [],
	// 		},
	// 		CO2: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "CO2",
	// 			deviceId: mfcDevice1,
	// 			devicePath: ["mfc1"],
	// 			independent: ["Time"],
	// 			unit: "ml/min",
	// 		},
	// 		Ar: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Ar",
	// 			deviceId: mfcDevice2,
	// 			devicePath: ["mfc2"],
	// 			independent: ["Time"],
	// 			unit: "ml/min",
	// 		},
	// 		H2: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "H2",
	// 			deviceId: mfcDevice3,
	// 			devicePath: ["mfc3"],
	// 			independent: ["Time"],
	// 			unit: "ml/min",
	// 		},
	// 		iC4H10: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "iC4H10",
	// 			deviceId: mfcDevice4,
	// 			devicePath: ["mfc4"],
	// 			independent: ["Time"],
	// 			unit: "ml/min",
	// 		},
	// 		Reaktor: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Reaktor",
	// 			independent: ["Time"],
	// 			unit: "°C",
	// 			devicePath: ["furnace"],
	// 			deviceId: setupDevice,
	// 		},
	// 		Tin: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Tin",
	// 			independent: ["Time"],
	// 			unit: "°C",
	// 			devicePath: ["inlet"],
	// 			deviceId: tcInlet,
	// 		},
	// 		Tout: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Tout",
	// 			independent: ["Time"],
	// 			unit: "°C",
	// 			devicePath: ["outlet"],
	// 			deviceId: tcOutlet,
	// 		},
	// 	},
	// });
	//
	// await importRawResource("adactaSample2.csv", {
	// 	delimiter: "\t",
	// 	decimalSeparator: ",",
	// 	preview: 5,
	// 	dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
	// 	columnMetadata: {
	// 		Datum: {
	// 			type: "offset",
	// 			conversionFactor: 1000,
	// 			timezone: "Europe/Berlin",
	// 			startDate: 1641463200000,
	// 			normalizerIds: [],
	// 			columnId: "Datum",
	// 			independent: [],
	// 		},
	// 		"CH4 191C": {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "CH4 191C",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		CO: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "CO",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		"CO2%": {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "CO2%",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		Ethane: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Ethane",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		ETHYLENE: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "ETHYLENE",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		Formaldehyde: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Formaldehyde",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		"Formic Acid": {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Formic Acid",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		"H2O%": {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "H2O%",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		MeOH: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "MeOH",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		N2O: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "N2O",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		NH3: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "NH3",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		NO: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "NO",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		NO2: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "NO2",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		Propane: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Propane",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		Propylene: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Propylene",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 		SO2: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "SO2",
	// 			deviceId: ftir,
	// 			devicePath: ["analytics"],
	// 			independent: ["Datum"],
	// 			unit: "ppm",
	// 		},
	// 	},
	// });

	// const x = await importImage("images/mfc-el-flow-prestige.png");
	//
	// await sdk.AddDeviceImage({
	// 	input: { imageId: x._id, definitionId: setupDefinition },
	// });
	//
	// const [raw, sin] = await importRawResource("sin.csv", {
	// 	delimiter: ",",
	// 	decimalSeparator: ",",
	// 	preview: 5,
	// 	dataArea: { header: { type: "SingleHeaderRow", headerRow: 0 }, body: 1 },
	// 	columnMetadata: {
	// 		Time: {
	// 			type: "offset",
	// 			conversionFactor: 1000,
	// 			timezone: "Europe/Berlin",
	// 			startDate: 1640991600000,
	// 			normalizerIds: [],
	// 			columnId: "Time",
	// 			independent: [],
	// 		},
	// 		Data: {
	// 			type: "number",
	// 			normalizerIds: [],
	// 			columnId: "Data",
	// 			independent: ["Time"],
	// 			unit: "ppm",
	// 			devicePath: ["slot"],
	// 			deviceId: mfcDevice1,
	// 		},
	// 	},
	// });
	//
	// assertDefined(sin);
	// const projectId = await addProject({ name: "Test", id: sin });
	//
	// assertDefined(raw);
	// await linkProject({ id: raw, projectId });
}

async function main() {
	await loadFixtures(
		"testuser@example.com",
		"PASSWORD",
		new AuthURL("https://auth.adacta.host"),
		new RepoURL("localhost:5000/adacta")
	);
}

async function login(
	email: string,
	password: string,
	authServer: AuthURL
): Promise<ILoginResponse> {
	const endpoint = authServer.getLoginURL();

	const request: ILoginRequest = {
		email,
		password,
	};

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const { data } = await axios.post(endpoint, request);

	assertILoginResponse(data);
	return data;
}

void main();
