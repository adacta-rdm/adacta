import {
	EuiButton,
	EuiMarkdownFormat,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiText,
} from "@elastic/eui";
import React, { useState } from "react";
import semver from "semver/preload";

import { PACKAGE_VERSION } from "~/lib/buildTimeConstants";

interface IChangeLog {
	version: string;
	changelog: string;
}

const changeLog: IChangeLog[] = [
	//{ version: "0.0.1", changelog: "Foo *Bar*" }
];

export function AppChangelog() {
	const LOCAL_STORAGE_KEY = "CHANGELOG_LAST_VIEWED_VERSION";
	const lastViewedVersion = localStorage.getItem(LOCAL_STORAGE_KEY) ?? "0.0.0";

	const relevantChanges = changeLog.filter((change) =>
		semver.gt(change.version, lastViewedVersion)
	);

	const [showChangelog, setShowChangelog] = useState(relevantChanges.length > 0);

	const onClose = () => {
		localStorage.setItem(LOCAL_STORAGE_KEY, PACKAGE_VERSION);
		setShowChangelog(false);
	};

	if (!showChangelog) {
		return null;
	}

	return (
		<EuiModal onClose={onClose} style={{ width: "80vw" }}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>New changes</EuiModalHeaderTitle>
			</EuiModalHeader>

			<EuiModalBody>
				{relevantChanges.map((c) => (
					<div key={c.version}>
						<EuiText>
							<h3>Version {c.version}</h3>
						</EuiText>
						<EuiMarkdownFormat>{c.changelog}</EuiMarkdownFormat>
					</div>
				))}
			</EuiModalBody>

			<EuiModalFooter>
				<EuiButton onClick={onClose}>Okay</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}
