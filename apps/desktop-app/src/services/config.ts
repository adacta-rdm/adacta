import { assertDefined } from "@omegadot/assert";
import type { ExecutionResult } from "graphql/index";
import type { Sink } from "graphql-ws";
import { createClient } from "graphql-ws";
import type { GraphQLResponse, PayloadData } from "relay-runtime";
import { Environment, Network, Observable, RecordSource, Store } from "relay-runtime";
import type { PayloadExtensions } from "relay-runtime/lib/network/RelayNetworkTypes";
import semver from "semver/preload";

import type { IServiceContainerConfigurator } from "./ServiceContainer";
import { ServiceContainer } from "./ServiceContainer";
import { HistoryService } from "./history/HistoryService";
import { GraphQLHeaderService } from "./repositoryId/GraphQLHeaderService";
import { DocFlyoutService } from "./toaster/FlyoutService";
import { ToasterService } from "./toaster/ToasterService";

import { PACKAGE_VERSION } from "~/lib/buildTimeConstants";
import { RepoURL } from "~/lib/url/RepoURL";

export const serviceConfiguration: IServiceContainerConfigurator = ServiceContainer.configure()
	.add("repoServerURL", () => {
		return new RepoURL(
			process.env.REPO_SERVER_URL ??
				(process.env.NODE_ENV !== "production"
					? // In development, assume that the server is running on localhost:5000
					  "http://localhost:5000"
					: // In production, assume that the server is running on the same host as the client under the /api
					  // path
					  `${document.location.origin}/api`),
			// This is a workaround for the RepoURL class, which assumes that the last part of the URL is the repository
			// name. The RepoURL's endpoint methods therefore strip the last part of the URL, so we artificially add a
			// path segment to the URL which then gets stripped off resulting in the correct URL.
			// A proper solution would be to introduce a new class that doesn't make this assumption, say RepoServerURL.
			"UNDEFINED"
		);
	})
	.add("graphQLHeaders", () => {
		return new GraphQLHeaderService();
	})
	.add("relayEnvironment", ({ graphQLHeaders, repoServerURL }) => {
		function headers() {
			const headers: Record<string, string> = {
				// Add authentication and other headers here
				"content-type": "application/json",
			};

			if (graphQLHeaders.repositoryId) {
				headers["repository-name"] = graphQLHeaders.repositoryId;
			}

			if (graphQLHeaders.authToken) {
				headers["authorization"] = graphQLHeaders.authToken;
			}

			return headers;
		}

		return new Environment({
			network: Network.create(
				(operation, variables): Promise<GraphQLResponse> => {
					if (!operation.text) return Promise.resolve({ data: {} });

					const body = JSON.stringify({
						query: operation.text, // GraphQL text from input
						variables,
					});

					return fetch(repoServerURL.graphqlEndpoint, {
						method: "POST",
						headers: headers(),
						body,
					}).then((response) => {
						const serverVersion = response.headers.get("adacta-version");
						if (serverVersion && semver.gt(serverVersion, PACKAGE_VERSION)) {
							// Clear body to take control using vanilla JS
							document.body.innerHTML = "";

							// Create centered div with message
							const width = 500;
							const height = 200;
							const div = document.createElement("div");
							div.innerHTML = "Adacta is updating. Please wait...";
							div.style.textAlign = "center";
							div.style.position = "absolute";
							div.style.left = "50%";
							div.style.top = "50%";
							div.style.width = `${width}px`;
							div.style.height = `${height}px`;
							div.style.marginLeft = `-${width / 2}px`;
							div.style.marginTop = `-${height / 2}px`;
							document.body.append(div);

							// Reload page after 5 seconds
							// Reload is not immediate for cases where the server is updated and the
							// client is not yet finished with deployment
							setTimeout(() => {
								document.location.reload();
							}, 5000);

							// Return a "proper" response just in case
							return {
								data: undefined,
								errors: [{ message: "Please refresh the page to get the latest version." }],
							};
						}

						const jsonResponse = response.json();
						if ("errors" in jsonResponse) {
							throw Object.assign(new Error("Error in GraphQL Response"), {
								errors: jsonResponse.errors,
							});
						}
						return jsonResponse;
					});
				},

				(operation, variables) => {
					const wsClient = createClient({
						// webSocketImpl: WebSocket,
						url: repoServerURL.graphqlEndpointWS,
						connectionParams: headers(),
					});

					return Observable.create((sink) => {
						assertDefined(operation.text, "subscribeFn (Render): request.text undefined");

						return wsClient.subscribe(
							{
								operationName: operation.name,
								query: operation.text,
								variables,
							},
							sink as Sink<ExecutionResult<PayloadData, PayloadExtensions>>
						);
					});
				}
			),
			store: new Store(new RecordSource()),
		});
	})
	.add("toasterService", () => {
		return new ToasterService();
	})
	.add("docFlyoutService", () => {
		return new DocFlyoutService();
	})
	.add("historyService", () => {
		return new HistoryService();
	});
