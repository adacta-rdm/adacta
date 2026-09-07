---
title: Planned data import and traceability
---

{% callout type="warning" title="Planned feature" %}
This document describes a planned feature. It is currently not available.
{% /callout %}

The planned import workflow preserves original source files while turning their scientific meaning and real-world context into searchable relationships. It is intended to reduce repetitive manual mapping without hiding uncertainty or inventing information that is absent from the source. {% .lead %}

This page uses **station** for the concept currently called **facility** in the application.

## Source bundles

A **source bundle** is the complete group of original files supplied together for one import. It may contain:

- one or more data files;
- a data sidecar describing those files;
- calibration information;
- operator notes; or
- other documentation needed to understand the source.

Each file in the bundle is a **source artifact** with a role such as data, manifest, calibration, or documentation. The original artifacts are preserved unchanged. A dataset created from them is a separate result and remains linked to its source bundle.

A source bundle does not require several files. A single Emerson data file is also a valid bundle.

## Channels as product capabilities

Adacta organizes information around recognizable real-world objects. A **product** describes a kind of equipment; an **inventory item** is one physical instance of that product. Capabilities defined by the product are therefore available to its physical items.

A **channel** is a data-oriented product capability. For example, a mass flow controller product may define:

- `flow` as a **measurement**: the flow measured by the controller; and
- `flow` as a **setpoint**: the requested target flow supplied to the controller.

A channel is identified by its key together with its role. The key names what is measured; the role says in what sense. The same key can therefore appear more than once for a product without ambiguity.

These channels may have the same quantity kind and unit, but they do not mean the same thing. Actual flow describes measured behavior; the setpoint describes intended operation and can provide a concise account of how an experiment was run.

Every product channel has:

- a stable key within the product;
- a human-readable name;
- a detailed textual description;
- a role, such as measurement, setpoint, state, or status;
- a value type, such as number, category, boolean, text, or date and time; and
- a quantity kind when the values represent a physical quantity.

Concrete, species-specific channels are valid product capabilities. A gas analyzer may, for example, define `co2-concentration` and `ch4-concentration` when those are fixed outputs of that product. A future model may add parameterized capabilities for instruments that expose an open-ended family of species or mass-to-charge channels, but that is not required for the initial workflow.

## Quantity kinds, units, and axes

A **quantity kind** says what a value represents. Examples include thermodynamic temperature, pressure, volume flow rate, and amount-of-substance fraction.

A **unit** says how that quantity is expressed. Temperature may be expressed in kelvin or degrees Celsius; volume flow rate may be expressed in litres per minute or cubic metres per second. Knowing the quantity kind allows Adacta to offer and validate compatible units without treating the unit itself as the meaning of the channel.

Two channels can share a quantity kind and unit while having different roles. An MFC's actual flow and flow setpoint are both volume flow rates, but one is a measurement and the other is a requested value.

An **axis** is a coordinate on which recorded values depend. Time is the most common axis, but an importer may encounter spatial coordinates, sweep values, multiple clocks, or more than one independent variable. Axes are identified directly rather than through fragile column positions.

## Datasets and recorded channels

A **dataset** is a logical group of axes and recorded channels produced by an import or transformation. It is not the same object as the original file.

A **recorded channel** connects four facts:

1. the dataset containing the values;
2. the physical inventory item involved;
3. the channel capability defined by that item's product; and
4. the field in the materialized data where the values are stored.

For example:

```text
Dataset: run-42
Physical item: MFC serial number 123
Product channel: flow (measurement)
Source field: FT101_PV
Unit: ml/min
```

Several recorded channels can share one time axis while belonging to different physical items. This allows a station-wide CSV to remain one coherent dataset without losing the device association of each individual channel.

The efficient stored representation may be tabular or columnar, but that representation does not define the scientific model. Device associations, channel meaning, axes, and provenance remain explicit and queryable.

## Sidecars and UI-assisted descriptions

A **data sidecar** is an optional portable description that accompanies data. It can be provided as a file in the source bundle or as equivalent structured information in an API request.

A sidecar may describe:

- which row contains column names and where data begins;
- the delimiter and text encoding;
- timestamp columns and timezones;
- source identifiers for equipment;
- product-channel keys;
- quantity kinds and units;
- station, sample, or sample-batch identifiers; and
- other information required by a format-specific importer.

The following example is illustrative; the sidecar format has not yet been specified:

```yaml
data: run.csv

columns:
  timestamp:
    axis: time
    unit: s

  FT101_PV:
    item:
      namespace: labview
      value: FT-101
    channel: flow
    role: measurement
    unit: ml/min

  FT101_SP:
    item:
      namespace: labview
      value: FT-101
    channel: flow
    role: setpoint
    unit: ml/min
```

When no sidecar is supplied, the UI builds the same kind of portable description behind the scenes. It begins with facts discovered by the importer and asks the user only for missing or ambiguous information. After the description is complete, the user can download it as a sidecar so that future files from the same acquisition system require less work.

This follows the same useful pattern as downloading an import preset after completing a manual mapping.

### Sidecars, plans, and presets

These concepts are related but have different purposes:

- A **sidecar** travels with source data and uses portable identifiers rather than Adacta database IDs.
- An **import preset** is a reusable mapping recipe for files that repeatedly use the same structure.
- An **import plan** is the validated and resolved interpretation of one particular source bundle.

The import plan preserves both an identifier supplied by a file or user and the Adacta object to which it resolved. This makes automatic decisions explainable and allows an incorrect current association to be corrected without rewriting what the original source said.

The first implementation does not require a separate history table for every correction. The original plan retains the imported evidence, while the current recorded-channel association can be corrected directly. More detailed association history can be introduced later if it becomes necessary.

## Drop location and resolved context

Files can be dropped from several places in Adacta. The drop location provides useful context, but it is a starting hypothesis rather than a boundary on what the source may contain.

| Drop location               | Initial information                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| Repository-wide drop zone   | No station or item is assumed. Adacta first uses evidence from the source.                 |
| Station page                | The station is a strong candidate, and its time-valid items can be used during resolution. |
| Inventory-item page         | The item, its product, and its product channels become useful candidates.                  |
| Sample or sample-batch page | The sample lifecycle association becomes a candidate.                                      |

Drop context, sidecar information, embedded vendor metadata, detected timestamps, station history, and user input are all evidence. When they agree, Adacta can resolve context automatically. When they conflict, the import page shows the conflict instead of silently choosing one source.

### A station-wide CSV dropped onto one MFC

Dropping a CSV onto one MFC does not mean every column belongs to that MFC. If inspection finds columns from several devices, the selected MFC acts as an anchor:

1. Adacta uses the MFC and recording time to suggest the station in which it was installed.
2. Columns matching the MFC's product channels can be resolved to that item.
3. Other identifiers are resolved independently against items present in the station configuration.
4. The station-wide source remains one dataset containing recorded channels from several items.
5. Unknown or conflicting columns are presented for review.

The import page might therefore report:

```text
Suggested station: Catalyst Test Station A
Reason: MFC-4 and five other identified items were installed there
during the detected recording interval.

Drop target: MFC-4
2 channels matched

Other items
10 channels matched
1 channel needs attention
```

If the source provides no useful identifiers, the drop target can still narrow the initial station and product-channel choices, but Adacta does not automatically assign unrelated columns to it.

### Unknown and conflicting context

The neutral import page is the place to resolve incomplete information. It distinguishes:

- facts recognized directly from the source;
- suggested context and the evidence supporting it;
- conflicts between source information and drop context; and
- decisions still requiring user input.

The source files remain transient in the browser until upload is implemented. Confirmed station, item, sample-batch, and view selections can be represented in the URL. A future persisted import draft can place its durable identifier in the URL and survive reloads.

## How importers help

Different complex formats should have focused importers rather than being forced through one universal wizard. An importer may:

- detect whether it recognizes a source using bounded reads;
- provide raw, tabular, image, PDF, or format-specific previews;
- inspect the source for timestamps, columns, units, identifiers, and other evidence; and
- eventually materialize a validated import plan into durable data.

Detection is required. The other capabilities depend on the format. A custom, irregular CSV can therefore receive its own importer without making the generic CSV workflow more complicated for every user.

## Preserving provenance

The durable record connects:

- the unchanged source bundle;
- the sidecar or UI-supplied description;
- the importer and its version;
- machine observations;
- user decisions;
- the validated import plan; and
- the resulting datasets and recorded channels.

Upload and materialization remain separate operations. Upload preserves the original source; materialization interprets it. A failed interpretation can later be retried from the preserved source and plan without asking the user to provide a large file again.

## Finding lifecycle data

The model is intended to support questions such as:

- Which data was recorded by this physical item?
- Which data was produced at this station during a particular period?
- Which data was associated with this sample batch across its full lifecycle?
- Which work was performed by a particular user during a time range?
- Which actual values correspond to a particular setpoint history?

An experiment can therefore be presented as a dynamic or saved selection over sample batch, station, time, user, and other context. It does not need to be a rigid container that owns one recording. This allows synthesis, characterization, activation, and activity measurements to be viewed together when they belong to the same sample-batch lifecycle.
