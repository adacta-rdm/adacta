import { EuiResizableContainer } from "@elastic/eui";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { DocFlyout } from "../../components/DocFlyout";
import type { EDocId } from "../../interfaces/EDocId";
import { useService } from "../ServiceProvider";

/**
 * Instructions on how to use the DocFlyoutService in a React component:
 * Parallel to reading this instruction you can check out the `InfoHeadline`
 * (`components/InfoHeadline.tex`) component where this service is already in use.
 *
 * The doc flyout can be triggered in many different ways, e.g. by clicking a button or icon.
 * On a high level one has to listen to some kind of event (e.g. a button click) and then call the
 * `showDoc` function on a `DocFlyoutService` instance. To control what text is shown in the flyout
 * you have to pass a `docId` into the `showDoc` function. The code then looks for a markdown file
 * with the `docId` as name here: `apps/desktop-app/public/docs/${docId}.md.
 * The contents are then automatically rendered and displayed in the flyout.
 * To avoid problems with wrong/stale ids due to spelling mistakes or renamed files etc. a script
 * exists which generates a Typescript enum containing all valid ids by traversing the `docs`
 * directory and examining the markdown files.
 *
 * Step-by-step example:
 *
 * 1. Create a new markdown file in the `docs` directory, e.g.
 * `apps/desktop-app/public/docs/someDocId.md` and add some documenting text in Markdown format.
 *
 * 2. Run the `genEDocId` script by running
 * ```
 * yarn gen-doc-id-enum
 * ```
 * from `apps/desktop-app`. The file `apps/desktop-app/src/interfaces/EDocId.ts` should now contain
 * a new entry for the newly created markdown file.
 * from `apps/desktop-app` or by clicking the green play button next to the script definition in the
 * package.json `apps/desktop-app/package.json`. The file
 * `apps/desktop-app/src/interfaces/EDocId.ts` should now contain a new entry for the newly created
 * markdown file.
 *
 * 2. Get a `DocFlyoutService` instance:
 * At the top of a component add this line:
 * ```
 *  const docFlyoutService = useService(DocFlyoutService);
 * ```
 * It is important to add this line before any kind of loop, condition, or nested function.
 * (see https://reactjs.org/docs/hooks-rules.html#only-call-hooks-at-the-top-level)
 *
 * 3. Register an `onClick` handler on a button or icon which calls the `showDoc` function, e.g.:
 * ```
 * <EuiButton onClick={() => docFlyoutService.showDoc(EDocId.SOMEDOCID)}>Click me!</EuiButton>
 * ```
 * Within Markdown documents, you can add links to other doc pages or also links that navigate to
 * certain parts of the app. To link to another doc item, use the `/doc` prefix, for app links use
 * `/app`.
 *
 * Examples:
 *    You can create links to other Markdown documents like this:
 *  ```
 *  [Click me!](/doc/SOMEDOCID)
 *  ```
 *
 *  You can also link to a part in the app like this:
 *    ```
 *    [Devices](/app/devices)
 *  [Resources](/app/resources)
 *  [Samples](/app/samples)
 *  [Settings](/app/settings)
 *  [Welcome Screen](/app/welcome)
 *  ```
 *
 */
export class DocFlyoutService {
	showDoc!: (docId: EDocId) => void;
}

function useDocFlyoutSetupHook() {
	const docFlyoutService = useService(DocFlyoutService);
	const [docId, setDocId] = useState<EDocId | undefined>(undefined);

	const showDoc = (newDocId: EDocId | undefined) => {
		setDocId(newDocId);
	};

	docFlyoutService.showDoc = showDoc;

	return { docId, showDoc };
}

// Used only once in the `View` component.
export function GlobalDocFlyout(props: { children: ReactNode }) {
	const { docId, showDoc } = useDocFlyoutSetupHook();

	const [size, setSize] = useState(docId ? 40 : 0);
	//const size = docId ? 40 : 0;

	useEffect(() => {
		if (docId) {
			setSize(40);
		} else {
			setSize(0);
		}
	}, [docId]);

	return (
		<EuiResizableContainer
			onToggleCollapsed={() => showDoc(undefined)}
			onPanelWidthChange={(info) => {
				setSize(info["docpanel"]);
			}}
		>
			{(EuiResizablePanel, EuiResizableButton) => {
				return (
					<>
						<EuiResizablePanel style={{ padding: 0 }} size={100 - size}>
							<>{props.children}</>
						</EuiResizablePanel>

						<EuiResizableButton style={size === 0 ? { display: "none" } : undefined} />

						<EuiResizablePanel
							size={size}
							style={
								size === 0
									? // Set padding to 0 to avoid creating a non-required scrollbar
									  { padding: 0 }
									: {
											// Set padding to account for the fixed header + 15 px
											// to have some actual padding between the header and
											// the content
											paddingBlockStart: "calc(var(--euiFixedHeadersOffset, 0) + 15px)",
									  }
							}
							id={"docpanel"}
						>
							{/* The EuiResizablePanel element always expects children. The fragment
							 below acts as a child even if docId is not truthy */}
							<>{docId && <DocFlyout docId={docId} onClose={() => showDoc(undefined)} />}</>
						</EuiResizablePanel>
					</>
				);
			}}
		</EuiResizableContainer>
	);
}
