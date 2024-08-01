import { EuiTable, EuiTableBody, EuiTableHeader, EuiTableHeaderCell } from "@elastic/eui";
import React, { useState } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { SampleAddRelated } from "./SampleAddRelated";
import { SampleTableRow } from "./SampleTableRow";

import type { SampleTable_samples$key } from "@/relay/SampleTable_samples.graphql";
import type { ISampleId } from "~/lib/database/Ids";

const SampleTableSamplesGraphQLFragment = graphql`
	fragment SampleTable_samples on Sample @relay(plural: true) {
		id
		...SampleTableRow
		relatedSamples {
			sample {
				...SampleTableRow
			}
		}
	}
`;

export function SampleTable(props: {
	samples: SampleTable_samples$key;
	connectionId?: string;
	disableActions?: boolean;
}) {
	const samples = useFragment(SampleTableSamplesGraphQLFragment, props.samples);

	const [showRelatedSampleModal, setShowRelatedSampleModal] = useState<undefined | ISampleId>(
		undefined
	);

	return (
		<>
			{showRelatedSampleModal && (
				<SampleAddRelated
					closeModal={() => setShowRelatedSampleModal(undefined)}
					relatedToSample={showRelatedSampleModal}
					connections={props.connectionId ? [props.connectionId] : []}
				/>
			)}

			<EuiTable>
				<SampleTableHeader disableActions={props.disableActions} />

				<EuiTableBody>
					{samples.map((s) => (
						<React.Fragment key={s.id}>
							<SampleTableRow
								key={s.id}
								sample={s}
								level={0}
								onAddRelatedClick={(id) => setShowRelatedSampleModal(id)}
								disableActions={props.disableActions}
							/>
							{s.relatedSamples.map((related, index) => (
								<SampleTableRow
									key={`${s.id}${index}`}
									sample={related.sample}
									level={1}
									onAddRelatedClick={setShowRelatedSampleModal}
									disableActions={props.disableActions}
								/>
							))}
						</React.Fragment>
					))}
				</EuiTableBody>
			</EuiTable>
		</>
	);
}

const columns = ["Name", "Creator", "Projects", "Currently installed in"];
export const columnCount = columns.length;

export function SampleTableHeader(props: { disableActions?: boolean }) {
	const cols = [...columns]; // copy columns so "Actions" can be pushed

	if (!props.disableActions) {
		cols.push("Actions");
	}

	return (
		<EuiTableHeader>
			{cols.map((c) => (
				<EuiTableHeaderCell key={c} align={"center"}>
					{c}
				</EuiTableHeaderCell>
			))}
		</EuiTableHeader>
	);
}
