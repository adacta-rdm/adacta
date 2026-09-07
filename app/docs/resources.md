---
title: Resources
---

A resource is a file or dataset managed by Adacta. Resources can contain raw measurements, processed data, facility documents, images, or other experiment-related information. {% .lead %}

## Resource overview

The Resources view lists imported resources. The left pane controls which metadata columns are visible. The current interface includes switches for:

- chart preview;
- name;
- type;
- creator;
- item or device;
- column titles; and
- units.

The list can also be filtered using the search controls above relevant columns. Figure 23 shows CSV resources with chart previews, associated devices, and units.

{% figure src="/docs-placeholder.svg" alt="Resource list with display controls, chart previews, device associations, and units." caption="Figure 23: Resource list with display controls, chart previews, device associations, and units." /%}

Select resource rows with the checkboxes before invoking operations that act on multiple resources, such as comparison. After two or more resources are selected, a banner reports the selected count and provides **Compare** and **Clear** controls, as shown in Figure 24.

{% figure src="/docs-placeholder.svg" alt="Resource list with two CSV resources selected and ready for comparison." caption="Figure 24: Resource list with two CSV resources selected and ready for comparison." /%}

## Importing data

The import workflow preserves every supplied source file and connects its values to the facility context in which they were recorded. It supports self-describing CSV files, CSV files with JSON sidecars, and guided import for undocumented CSV files.

See [Importing data](/docs/importing-data) for the supported paths, complete file examples, and how to resolve conflicts between imported device IDs and the facility record.

## Compare resources

Select two or more resources and press **Compare**. The selected filenames are listed at the top of the comparison view, and compatible fields are overlaid in plots grouped by unit, such as volumetric flow, temperature, and concentration. Field names appear in the legend for each plot, as illustrated in Figure 25.

{% figure src="/docs-placeholder.svg" alt="Comparison view with selected resources, unit-grouped plots, Align Begin, and per-resource time-offset controls." caption="Figure 25: Comparison view with selected resources, unit-grouped plots, Align Begin, and per-resource time-offset controls." /%}

The left pane provides two ways to synchronize events:

- enable **Align Begin** to display all selected resources relative to a common starting point; or
- apply separate offsets in hours, minutes, and seconds to each resource.

Use **Align Begin** when datasets should be compared relative to experiment start rather than absolute clock time. Use explicit offsets when a known event occurred at different elapsed times. Record the rationale for any nonzero offset when the comparison will be used in a report or subsequent analysis.

Move the pointer over a plotted trace to inspect an individual point. The hover tag identifies the field, such as CO2; the source filename, such as JR-PdAl2O3_002_A-450C.csv; the timestamp; and the value. This is particularly useful when the same field is present in more than one selected resource, because the filename identifies which trace supplied the displayed point.
