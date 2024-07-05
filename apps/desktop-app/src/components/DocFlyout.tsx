import {
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	EuiIcon,
	EuiLink,
	EuiMarkdownFormat,
	EuiTitle,
	getDefaultEuiMarkdownProcessingPlugins,
} from "@elastic/eui";
import { useRouter } from "found";
import React, { useEffect, useState } from "react";

import { EDocId } from "../interfaces/EDocId";
import { useRepositoryId } from "../services/router/UseRepoId";

interface IProps {
	docId: string;
	onClose: () => void;
}

const isValidEDocIdKey = (input: string): input is keyof typeof EDocId => {
	return Object.keys(EDocId).includes(input);
};

export function DocFlyout({ docId, onClose }: IProps) {
	const [docText, setDocText] = useState("Init");
	const [history, setHistory] = useState([docId]);
	const [historyIndex, setHistoryIndex] = useState(0);
	const { router } = useRouter();

	const navigate = (target: string) => {
		setHistory([...history.slice(0, historyIndex + 1), target]);
		setHistoryIndex(historyIndex + 1);
		loadDocId(target);
	};

	const canGoBack = history[historyIndex - 1] !== undefined;
	const canGoForward = history[historyIndex + 1] !== undefined;

	const goBack = () => {
		if (canGoBack) {
			loadDocId(history[historyIndex - 1]);
			setHistoryIndex(historyIndex - 1);
		}
	};

	const goForward = () => {
		if (canGoForward) {
			loadDocId(history[historyIndex + 1]);
			setHistoryIndex(historyIndex + 1);
		}
	};

	const loadDocId = (docId: string) => {
		void import(`../../public/docs/${docId.toLowerCase()}.md?raw`).then((file) =>
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			setDocText(file.default)
		);
	};

	useEffect(() => {
		loadDocId(docId);
	}, [docId]);

	const DocLinkRenderer = (data: { href: string; children: string[] }) => {
		const repositoryId = useRepositoryId();

		const href = data.href.slice(1);

		const type = href.split("/")[0];
		const target = href.split("/").slice(1).join("/");

		const caption = data.children[0];

		switch (type) {
			case "doc":
				if (isValidEDocIdKey(target)) {
					return (
						<EuiLink
							// Note: For some reason onClick won't trigger here...
							onMouseUp={() => {
								navigate(EDocId[target]);
							}}
						>
							{caption}
						</EuiLink>
					);
				}
				return (
					<EuiLink>
						BROKEN LINK: {caption} <EuiIcon type={"crossInACircleFilled"} color={"danger"} />
					</EuiLink>
				);
			case "app":
				return (
					<EuiLink
						// Note: For some reason onClick won't trigger here...
						onMouseUp={() => {
							// No way to make this type safe from markdown files, so we might as well use the untyped
							// router directly from "found".
							router.push(`/repositories/${repositoryId}/${target}`);
						}}
					>
						{caption}
					</EuiLink>
				);
				break;
			default:
				return <>Unknown Link</>;
		}
	};

	const processingList = getDefaultEuiMarkdownProcessingPlugins();
	processingList[1][1].components.a = DocLinkRenderer;

	return (
		<>
			<EuiFlexGroup justifyContent={"flexStart"}>
				<EuiFlexItem>
					<EuiTitle>
						<h2>Documentation</h2>
					</EuiTitle>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<EuiButtonIcon
						isDisabled={!canGoBack}
						iconType={"arrowLeft"}
						onClick={() => goBack()}
						aria-label={"Back"}
					/>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<EuiButtonIcon
						isDisabled={!canGoForward}
						iconType={"arrowRight"}
						onClick={() => goForward()}
						aria-label={"Forward"}
					/>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<EuiButtonIcon iconType={"cross"} onClick={onClose} aria-label={"Forward"} />
				</EuiFlexItem>
			</EuiFlexGroup>

			<EuiMarkdownFormat processingPluginList={processingList}>{docText}</EuiMarkdownFormat>
		</>
	);
}
