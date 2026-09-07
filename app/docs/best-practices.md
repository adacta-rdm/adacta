---
title: Best practices
---

The following practices help keep the record in Adacta consistent and traceable across a test campaign. {% .lead %}

## Product and device naming

Keep catalog definitions general and physical-device names specific.

- Use the manufacturer's official model designation for the product.
- Give each inventory item a unique, recognizable name.
- Include stable identifiers such as serial number, asset number, calibrated range, or channel designation where useful.
- Do not include temporary service descriptions that can change, such as the current gas or reactor assignment.
- Add a useful device image when it improves identification.

Devices that do not produce data can still be important to traceability. Sample holders, reactor tubes, filters, traps, and other components can be represented when their identity or installation history matters.

## Time validity

The time model is central to Adacta.

- Create a new state at every real configuration change.
- Use the actual effective date and time.
- Ensure device installation intervals overlap the resources assigned to those devices.
- Ensure the sample shown in the state is the sample actually installed during the resource interval.
- Correct historical errors explicitly rather than silently replacing the history with the current setup.

A resource from February 2022 cannot be assigned legitimately to a device whose recorded installation begins in March 2023. Resolve the installation history first.

## Resource integrity

- Preserve the original source file.
- Use unique, stable headers.
- Record units explicitly.
- Avoid manual edits that obscure how the imported file differs from the acquisition-system output.
- Save and reuse import presets.
- Validate a newly imported file before using it for comparison or analysis.

## Flowchart layout

- Arrange nodes in process order.
- Leave sufficient spacing for connections and labels.
- Use consistent top and bottom labels.
- Keep annotation text concise.
- Use captioned circles for contextual notes, not as substitutes for inventory items.
- Avoid crossing lines where a clearer layout is possible.

## Samples

- Give batches and samples stable identifiers that match laboratory records.
- Create the sample before installing it in a flowchart state.
- Replace a sample by creating a new state at the replacement time.
- Do not reuse one sample record for physically different portions solely because they share a formulation.
