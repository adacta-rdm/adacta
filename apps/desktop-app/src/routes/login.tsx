import {
	EuiButton,
	EuiCallOut,
	EuiFieldPassword,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiPageTemplate,
} from "@elastic/eui";
import React, { useState } from "react";

import { RedirectException } from "../RedirectException";
import { AdactaPageTemplate } from "../components/layout/AdactaPageTemplate";
import { useRouter } from "../hooks/useRouter";
import { useService } from "../services/ServiceProvider";
import { GraphQLHeaderService } from "../services/repositoryId/GraphQLHeaderService";

import type { GetDataArgs } from "@/routes/login";
import { assertILoginResponse } from "@/tsrc/lib/interface/ILoginResponse";
import type { ILoginResponse } from "~/lib/interface/ILoginResponse";
import { RepoURL } from "~/lib/url/RepoURL";

function getData({ graphQLHeaders }: GetDataArgs) {
	if (graphQLHeaders.authToken) {
		throw new RedirectException("/");
	}
}

export default function Route() {
	const repoUrl = useService(RepoURL);
	const graphQLHeaders = useService(GraphQLHeaderService);
	const router = useRouter();

	const [isLoginInFlight, setLoginInFlight] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | undefined>();

	const pageTitle = "Login";

	return (
		<>
			<div
				className={"bg-euiBackground absolute h-screen w-screen  bg-waves bg-no-repeat bg-bottom "}
			/>
			<AdactaPageTemplate className={"z-10"}>
				<EuiPageTemplate.Header
					className={"z-10"}
					pageTitle={
						<EuiFlexGroup alignItems="baseline" gutterSize="xs">
							<EuiFlexItem grow={false}>{pageTitle}</EuiFlexItem>
						</EuiFlexGroup>
					}
				/>
				<div className={"my-auto z-10"}>
					<EuiFlexGroup justifyContent="spaceAround">
						<EuiFlexItem grow={false} style={{ minWidth: "400px" }}>
							{error && <EuiCallOut color={"danger"}>{error}</EuiCallOut>}
							<EuiForm component="form">
								<EuiFormRow label="E-Mail">
									<EuiFieldText
										name="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										disabled={isLoginInFlight}
									/>
								</EuiFormRow>
								<EuiFormRow label="Password">
									<EuiFieldPassword
										name="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										disabled={isLoginInFlight}
									/>
								</EuiFormRow>

								<EuiFormRow>
									<EuiFlexGroup alignItems={"center"} justifyContent={"flexEnd"}>
										<EuiFlexItem grow={false}>
											<EuiButton
												// eslint-disable-next-line @typescript-eslint/no-misused-promises
												onClick={async () => {
													setLoginInFlight(true);
													try {
														const response = await doLogin(repoUrl, email, password);
														// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
														if (!(response && response.authServerJWT && response.success)) {
															return setError("Login failed. Please check your login details.");
														}

														graphQLHeaders.authToken = response.authServerJWT;

														// Navigate to the repositories page after login
														// Use replace instead of push to avoid the user being able to go back to the login page
														router.router.replace("/repositories");
													} finally {
														setLoginInFlight(false);
													}
												}}
												isLoading={isLoginInFlight}
											>
												Login
											</EuiButton>
										</EuiFlexItem>
									</EuiFlexGroup>
								</EuiFormRow>
							</EuiForm>
						</EuiFlexItem>
					</EuiFlexGroup>
				</div>
			</AdactaPageTemplate>
		</>
	);
}

async function doLogin(
	url: RepoURL,
	email: string,
	password: string
): Promise<ILoginResponse | undefined> {
	const body = JSON.stringify({ email, password });

	const result = await fetch(url.loginEndpoint, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body,
	});

	if (result.ok) {
		const loginResponse: unknown = await result.json();

		assertILoginResponse(loginResponse);
		if (!loginResponse.success || !loginResponse.authServerJWT) {
			return;
		}

		return loginResponse;
	}
}
