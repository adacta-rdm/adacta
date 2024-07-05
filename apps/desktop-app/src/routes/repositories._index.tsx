import { graphql, loadQuery } from "react-relay";
import { usePreloadedQuery } from "react-relay/hooks";

import type { IRouteComponentProps, IRouteGetDataFunctionArgs } from "../IRouteConfig";
import { useRouter } from "../hooks/useRouter";

import type { repositoriesIndexQuery } from "@/relay/repositoriesIndexQuery.graphql";

const repositoriesIndexGraphQLQuery = graphql`
	query repositoriesIndexQuery {
		currentUser {
			payload {
				user {
					repositories
				}
			}
		}
	}
`;

export function getData({ relayEnvironment }: IRouteGetDataFunctionArgs) {
	return loadQuery<repositoriesIndexQuery>(relayEnvironment, repositoriesIndexGraphQLQuery, {});
}

export default function (props: IRouteComponentProps<typeof getData>) {
	const data = usePreloadedQuery(repositoriesIndexGraphQLQuery, props.data);
	const { router } = useRouter();

	const repositoryNames = data.currentUser.payload.user.repositories;

	// If there are repositories, redirect to the first one
	if (repositoryNames.length > 0) {
		// Wrapped in a setTimeout to avoid a warning about changing the state during rendering
		// See also: https://github.com/facebook/react/issues/18178#issuecomment-595846312
		setTimeout(
			() => router.replace("/repositories/:repositoryId/", { repositoryId: repositoryNames[0] }),
			0
		);
	}
	// If there are no repositories, redirect to the settings page so the user can create one
	else {
		// Wrapped in a setTimeout to avoid a warning about changing the state during rendering
		setTimeout(() => router.replace("/repositories/settings"), 0);
	}

	return null;

	// return (
	// 	<Suspense fallback={<SettingsPageLoading />}>
	// 		<Welcome queryRef={props.data} />
	// 	</Suspense>
	// );

	// return (
	// 	<AdactaPageTemplate>
	// 		<EuiPageTemplate.Header
	// 			pageTitle={"Welcome"}
	// 			// rightSideItems={user ? [<Logout key={"welcome_logout"} />] : undefined}
	// 		/>
	// 		<EuiPageTemplate.Section>
	// 			<div>
	// 				<br />
	// 				<br />
	// 				<br />
	// 				<br />
	// 				<br />
	// 				<br />
	// 				<br />
	// 				Welcome. Please select a repository.
	// 			</div>
	// 		</EuiPageTemplate.Section>
	// 	</AdactaPageTemplate>
	// );
}
