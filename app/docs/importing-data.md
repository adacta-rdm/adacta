---
title: Importing data
---

Adacta preserves the original files supplied for an import and connects their recorded values to the equipment, rig configuration, and samples that give them scientific meaning. {% .lead %}

You can drop any data file into Adacta. Adacta retains it even when it cannot yet interpret the contents. The amount of work needed to import a CSV-based file depends on how much information the file provides about its columns, devices, and units.

## Choose an import path

All CSV import paths describe the file structure, an x axis, and each recorded field. A recorded field identifies the device, channel, and physical unit when those facts apply. Choose the path that best matches your control over the acquisition-system export.

1. Use the **Adacta Standard Format** when you can change the CSV export itself.
2. Supply a **TOML sidecar** when you can add a second file but must retain the existing CSV structure.
3. Use **guided import** when neither the CSV nor a sidecar contains enough information.

All supplied files form a source bundle. Adacta keeps that source evidence, the interpretation used for the import, and the resulting dataset separate. This means an improved or corrected import does not require the original data to be discarded or overwritten.

## 1. Use the Adacta Standard Format

The Adacta Standard Format is a CSV-based format with four header rows before the recorded values. The rows have a fixed order:

1. Display name
2. Device ID
3. Device channel
4. Physical unit

For example, a file from a reactor test stand could look like this:

```csv
Recorded at,MFC 1 measured flow,MFC 1 requested flow,Reactor temperature
,MFC-01,MFC-01,TC-01
time,flow measurement,flow setpoint,temperature measurement
,ml/min,ml/min,°C
2026-08-20T09:00:00Z,38.4,40.0,245.1
2026-08-20T09:00:01Z,38.7,40.0,245.3
2026-08-20T09:00:02Z,39.1,40.0,245.4
```

The first row provides the names shown in Adacta. The second row identifies the physical device associated with each recorded channel. It is empty for the time axis because a timestamp does not belong to a device. The third row identifies either the special `time` axis or the channel of the identified device, given as the channel followed by its role. A device can report the same channel in more than one sense, such as a measured flow and a requested one. The fourth row gives each channel's physical unit. The remaining rows contain the recorded values.

Because the file describes its own structure and meaning, Adacta can recognize it, validate the referenced devices and channels, and import it with little or no manual mapping. The file forms a source bundle containing one file.

## 2. Supply a TOML sidecar with an existing CSV file

Use a TOML sidecar when the acquisition system cannot produce the Adacta Standard Format, but can export an additional description of its CSV output. The CSV may then contain only values:

```csv
2026-08-20T09:00:00Z,38.4,40.0,245.1
2026-08-20T09:00:01Z,38.7,40.0,245.3
2026-08-20T09:00:02Z,39.1,40.0,245.4
```

The accompanying `sidecar.toml` supplies the same information that the Standard Format embeds in header rows:

```toml
[file_structure]
column_delimiter = ","
decimal_separator = "."
header_rows = 0
data_row = 1
file_encoding = "UTF-8"

[experiment]
operator_email = "operator@example.org"

[[experiment.samples]]
symbol_key = "Catalyst_Sample"
id = 12345

[[columns]]
name = "Recorded at"
axis = "time"
format = "%Y-%m-%dT%H:%M:%SZ"
timezone = "UTC"

[[columns]]
name = "MFC 1 measured flow"
symbol_key = "MFC_1"
channel = "flow"
role = "measurement"
unit = "ml/min"
item.slug = "mfc-01"

[[columns]]
name = "MFC 1 requested flow"
symbol_key = "MFC_1"
channel = "flow"
role = "setpoint"
unit = "ml/min"
item.slug = "mfc-01"

[[columns]]
name = "Reactor temperature"
symbol_key = "Thermocouple_1"
channel = "temperature"
role = "measurement"
unit = "°C"
item.slug = "tc-01"
```

Drop the CSV and TOML file together. Adacta stores both originals and opens the dataset review when the upload contains exactly one CSV and one TOML file. Select a file in the sidebar to inspect its preview. The CSV preview shows whether the sidecar matches the header and row structure. The sidecar preview shows the original TOML text and its validation issues. Validation problems keep the originals available. A drop on a rig preselects that rig when its P&ID can resolve the sidecar symbols.

In the review, choose the rig whose P&ID should resolve the sidecar's symbols, then select **Import dataset**. Adacta resolves the equipment, channel, sample, operator, and diagram references, and writes the recorded values to a Parquet dataset. The dataset page shows charts, recorded values, and saved mappings. An invalid value or unresolved reference stops the import and reports an error. The original files remain available.

The rig where the files were dropped supplies the P&ID used to resolve sidecar symbol keys. A symbol on another rig does not satisfy a reference in this import.

A CSV can use a numeric x axis without a timestamp. For example, a scan may record position in mm:

```csv
Position,Temperature
0,24.1
0.5,24.8
1.0,25.3
```

Its sidecar defines the position column as the x axis:

```toml
[[columns]]
name = "Position"
axis = "numeric"
unit = "mm"

[[columns]]
name = "Temperature"
symbol_key = "TC_1"
item.slug = "thermocouple-1"
channel = "temperature"
role = "measurement"
unit = "°C"
```

The remaining file structure and experiment tables have the same form as the time-based example. A numeric axis may also include `symbol_key`, `item`, `channel`, and `role` when an equipment channel produced its values. Supply all four fields together. A sidecar defines one x axis: either one numeric column or one time column. A date column may accompany a time column. Every data row needs a finite numeric x value. Use `unit = "1"` for an axis without a physical unit.

Adacta reads the CSV and writes Parquet in batches. The full CSV and Parquet file are not held in memory during import.

The dataset page charts the complete recording using a bounded overview. Each interval retains its first and last row, the minimum and maximum value for each numeric channel, and the outer missing-value boundaries. When an interval has additional gaps, one marker can stand for several gaps and interrupts the chart line. The data table shows 200 exact rows per page. A quality table reports exact missing-value counts and channel ranges. It also reports repeated or backward x values and the longest forward step. The Parquet file records the x axis in file metadata.

The order of `columns` is the order of fields in the CSV. An equipment unit is identified by exactly one of `id`, `slug`, or `serial_number`. The `slug` belongs to equipment, even when a rig has the same slug. Each entry in `experiment.samples` pairs a diagram `symbol_key` with exactly one sample `id` or `slug`. The sample list can be empty. Prefer `slug` for reusable item mappings because database IDs can differ between Adacta installations. Sample slugs are unique only within their batch; generated sidecars use sample IDs to identify them unambiguously.

### Serial numbers shared by different products

Serial numbers are unique within a product. If `serial_number` matches several equipment units in the selected rig's P&ID, the import stops and names those units. Use the unit's `id` or `slug` in the corrected sidecar, then upload it with the CSV again.

## Generate device mappings in control software

The Standard Format and TOML-sidecar paths are especially convenient when hardware-control software, such as LabVIEW, can read the configured devices' identifiers and use them when it exports data. The control software can then generate the CSV header rows or sidecar automatically instead of requiring an operator to enter a mapping after each recording.

When a file receives its device IDs directly from the configured hardware, you may treat those device mappings as authoritative. If Adacta reports that they conflict with the saved rig flowchart, the file is strong evidence that the rig record needs correction. Adacta still reports the conflict, so that you can review the change before updating the rig record.

## 3. Use guided import

Use guided import when you cannot change the CSV export and cannot supply a TOML sidecar. Upload the file and let Adacta guide you through the missing information.

Adacta shows a preview and asks for the file structure, time axis, column meanings, device IDs, device channels, and physical units that the source does not provide. It validates the resulting interpretation in the same way as the Standard Format and sidecar paths.

This is the most manual import path, but it makes ordinary and undocumented CSV files importable without changing the acquisition system.

## Resolve conflicts with the rig record

Adacta compares the device IDs supplied or selected during import with the rig flowchart (P&ID) recorded for the data's time range. If they disagree, Adacta reports the conflict rather than automatically deciding which record is correct.

You can then choose one of two actions:

- Correct the source file or sidecar and upload the corrected files when the imported device information is wrong.
- Change the rig record when the imported device information is correct and the saved rig flowchart no longer reflects the real setup.

The original source bundle remains available in either case. Corrected files are uploaded as a new source bundle; Adacta does not overwrite the original evidence.

## Validate the imported dataset

Before relying on an imported dataset, verify its time range, each device and channel association, physical units, rig context, and any reported conflicts or warnings. Correct the source description or rig record when necessary, then repeat the import using the preserved source files.
