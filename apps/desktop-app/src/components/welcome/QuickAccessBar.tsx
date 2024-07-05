import { EuiPanel, EuiSpacer, EuiText } from "@elastic/eui";
import type { EuiTextProps } from "@elastic/eui/src/components/text/text";
import React, { useState } from "react";

import type { IFavoriteOption } from "./HistoryList";
import { HistoryList } from "./HistoryList";
import { useRouter } from "../../hooks/useRouter";
import { useService } from "../../services/ServiceProvider";
import { HistoryService } from "../../services/history/HistoryService";
import { RouterServiceCore } from "../../services/router/RouterServiceCore";

/**
 * Displays a list of recently visited things
 * This component acts as a tool for navigation and can also help the user to keep track of the last
 * things he visited.
 */
export function QuickAccessBar() {
	const history = useService(HistoryService);
	const router = useRouter();

	// Extract the id of the current route to exclude it from the list of recently visited
	const currentId = RouterServiceCore.extractId(router.match.location.pathname)?.id;

	const mostRecently = history
		.getMostRecentlyIds()
		.filter((historyEntry) => historyEntry.id !== currentId);

	const [favorite, setFavorite] = useState(history.getFavorites());

	const f: IFavoriteOption = {
		ids: favorite,
		makeFavorite: (e) => {
			history.addToFavorites(e.id, e.repositoryId);
			setFavorite([...history.getFavorites()]);
		},
		removeFavorite: (e) => {
			history.removeFromFavorites(e.id, e.repositoryId);
			setFavorite([...history.getFavorites()]);
		},
	};

	const textOptions: EuiTextProps = {
		size: "xs",
		color: "black",
		textAlign: "left",
	} as const;

	return (
		<EuiPanel>
			<EuiSpacer size={"l"} />
			{favorite.length > 0 && (
				<>
					<EuiText {...textOptions}>
						<h2>Favorites</h2>
					</EuiText>
					<HistoryList ids={favorite} favorites={f} />
					<EuiSpacer size={"l"} />
				</>
			)}
			<EuiText {...textOptions}>
				<h2>Recently visited</h2>
			</EuiText>
			<HistoryList ids={mostRecently} favorites={f} />
		</EuiPanel>
	);
}
