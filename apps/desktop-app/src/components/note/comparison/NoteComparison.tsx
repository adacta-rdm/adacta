import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiSwitch } from "@elastic/eui";
import { useState } from "react";

import type { INote } from "../IExistingNote";
import { RenderChanges } from "../diff/RenderChanges";

interface IProps {
	revisionA: INote;
	revisionB: INote;
}
export function NoteComparison(props: IProps) {
	const { revisionA, revisionB } = props;

	// Switch between modes (side by side vs diff)
	const [sideBySide, setSideBySide] = useState(false);

	return (
		<>
			<EuiFlexGroup justifyContent={"flexEnd"}>
				<EuiFlexItem grow={false}>
					<EuiSwitch
						label={"Side by side"}
						checked={sideBySide}
						onChange={(e) => setSideBySide(e.target.checked)}
					/>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiDescriptionList
				listItems={[
					{
						title: "Caption",
						description: (
							<RenderChanges
								beforeText={revisionA.caption}
								afterText={revisionB.caption}
								renderMode={"react"}
								sideBySide={sideBySide}
							/>
						),
					},
					{
						title: "Text",
						description: (
							<RenderChanges
								beforeText={revisionA.text}
								afterText={revisionB.text}
								renderMode={"markdown"}
								sideBySide={sideBySide}
							/>
						),
					},
				]}
			/>
		</>
	);
}
