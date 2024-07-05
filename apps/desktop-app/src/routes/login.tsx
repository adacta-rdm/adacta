import {
	EuiButton,
	EuiButtonIcon,
	EuiCallOut,
	EuiFieldPassword,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiLoadingSpinner,
	EuiPageTemplate,
} from "@elastic/eui";
import React, { useState } from "react";

import type { IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { RedirectException } from "../RedirectException";
import { AdactaPageTemplate } from "../components/layout/AdactaPageTemplate";
import { Footer } from "../components/layout/Footer";
import { useRouter } from "../hooks/useRouter";
import { EDocId } from "../interfaces/EDocId";
import { useService } from "../services/ServiceProvider";
import { GraphQLHeaderService } from "../services/repositoryId/GraphQLHeaderService";
import { DocFlyoutService } from "../services/toaster/FlyoutService";

import type { ILoginResponse } from "~/lib/interface/ILoginResponse";
import { assertILoginResponse } from "~/lib/interface/type_checks/assertILoginResponse";
import { RepoURL } from "~/lib/url/RepoURL";

export function getData({ graphQLHeaders }: IRouteGetDataFunctionArgs) {
	if (graphQLHeaders.authToken) {
		throw new RedirectException("/");
	}
}

export default function () {
	const repoUrl = useService(RepoURL);
	const graphQLHeaders = useService(GraphQLHeaderService);
	const router = useRouter();

	const [isLoginInFlight, setLoginInFlight] = useState(false);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | undefined>();
	const docFlyoutService = useService(DocFlyoutService);

	if (isLoginInFlight) {
		return <EuiLoadingSpinner />;
	}

	const pageTitle = "Login";

	return (
		<>
			<AdactaPageTemplate>
				<EuiPageTemplate.Header
					pageTitle={
						<EuiFlexGroup alignItems="baseline" gutterSize="xs">
							<EuiFlexItem grow={false}>{pageTitle}</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiButtonIcon
									aria-label={"Open Documentation"}
									color="text"
									iconType="questionInCircle"
									onClick={() => docFlyoutService.showDoc(EDocId.WELCOME)}
								/>
							</EuiFlexItem>
						</EuiFlexGroup>
					}
					// rightSideItems={user ? [<Logout key={"welcome_logout"} />] : undefined}
				/>
				<EuiPageTemplate.Section>
					<EuiFlexGroup justifyContent="spaceAround">
						<EuiFlexItem grow={false} style={{ minWidth: "800px" }}>
							{error && <EuiCallOut color={"danger"}>{error}</EuiCallOut>}
							<EuiForm component="form">
								<EuiFormRow label="E-Mail">
									<EuiFieldText
										name="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</EuiFormRow>
								<EuiFormRow label="Password">
									<EuiFieldPassword
										name="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
									/>
								</EuiFormRow>

								<EuiFormRow>
									<EuiFlexGroup alignItems={"center"}>
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
											>
												Login
											</EuiButton>
										</EuiFlexItem>
									</EuiFlexGroup>
								</EuiFormRow>
							</EuiForm>
						</EuiFlexItem>
					</EuiFlexGroup>
				</EuiPageTemplate.Section>
			</AdactaPageTemplate>
			<Footer />
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
