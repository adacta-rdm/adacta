---
title: Importing data
---

Adacta preserves the original files supplied for an import and connects their recorded values to the equipment, facility configuration, and samples that give them scientific meaning. {% .lead %}

You can drop any data file into Adacta. Adacta retains it even when it cannot yet interpret the contents. The amount of work needed to import a CSV-based file depends on how much information the file provides about its columns, devices, and units.

## Choose an import path

All CSV import paths describe the same information: the file structure, the time axis, each recorded field, the device that produced it, the device channel, and the physical unit. Choose the path that best matches your control over the acquisition-system export.

1. Use the **Adacta Standard Format** when you can change the CSV export itself.
2. Supply a **JSON sidecar** when you can add a second file but must retain the existing CSV structure.
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

The first row provides the names shown in Adacta. The second row identifies the physical device that produced each measurement. It is empty for the time axis because a timestamp does not belong to a device. The third row identifies either the special `time` axis or the channel of the identified device, given as the channel followed by its role. A device can report the same channel in more than one sense, such as a measured flow and a requested one. The fourth row gives each measurement's physical unit. The remaining rows contain the recorded values.

Because the file describes its own structure and meaning, Adacta can recognize it, validate the referenced devices and channels, and import it with little or no manual mapping. The file forms a source bundle containing one file.

## 2. Supply a JSON sidecar with an existing CSV file

Use a JSON sidecar when the acquisition system cannot produce the Adacta Standard Format, but can export an additional description of its CSV output. The CSV may then contain only values:

```csv
2026-08-20T09:00:00Z,38.4,40.0,245.1
2026-08-20T09:00:01Z,38.7,40.0,245.3
2026-08-20T09:00:02Z,39.1,40.0,245.4
```

The accompanying `run-042.json` file supplies the same information that the Standard Format embeds in header rows:

```json
{
	"version": 1,
	"dataFile": "run-042.csv",
	"csv": {
		"delimiter": ",",
		"decimalSeparator": ".",
		"headerRows": 0
	},
	"columns": [
		{
			"index": 0,
			"name": "Recorded at",
			"channel": "time"
		},
		{
			"index": 1,
			"name": "MFC 1 measured flow",
			"deviceId": "MFC-01",
			"channel": "flow",
			"role": "measurement",
			"unit": "ml/min"
		},
		{
			"index": 2,
			"name": "MFC 1 requested flow",
			"deviceId": "MFC-01",
			"channel": "flow",
			"role": "setpoint",
			"unit": "ml/min"
		},
		{
			"index": 3,
			"name": "Reactor temperature",
			"deviceId": "TC-01",
			"channel": "temperature",
			"role": "measurement",
			"unit": "°C"
		}
	]
}
```

Drop the CSV and JSON file into Adacta together. They form one source bundle containing two files. Adacta preserves both originals and uses the JSON sidecar to interpret the CSV.

## Generate device mappings in control software

The Standard Format and JSON-sidecar paths are especially convenient when hardware-control software, such as LabVIEW, can read the configured devices' identifiers and use them when it exports data. The control software can then generate the CSV header rows or sidecar automatically instead of requiring an operator to enter a mapping after each recording.

When a file receives its device IDs directly from the configured hardware, you may treat those device mappings as authoritative. If Adacta reports that they conflict with the saved facility flowchart, the file is strong evidence that the facility record needs correction. Adacta still reports the conflict, so that you can review the change before updating the facility record.

## 3. Use guided import

Use guided import when you cannot change the CSV export and cannot supply a JSON sidecar. Upload the file and let Adacta guide you through the missing information.

Adacta shows a preview and asks for the file structure, time axis, column meanings, device IDs, device channels, and physical units that the source does not provide. It validates the resulting interpretation in the same way as the Standard Format and sidecar paths.

This is the most manual import path, but it makes ordinary and undocumented CSV files importable without changing the acquisition system.

## Resolve conflicts with the facility record

Adacta compares the device IDs supplied or selected during import with the facility flowchart (P&ID) recorded for the data's time range. If they disagree, Adacta reports the conflict rather than automatically deciding which record is correct.

You can then choose one of two actions:

- Correct the source file or sidecar and upload the corrected files when the imported device information is wrong.
- Change the facility record when the imported device information is correct and the saved facility flowchart no longer reflects the real setup.

The original source bundle remains available in either case. Corrected files are uploaded as a new source bundle; Adacta does not overwrite the original evidence.

## Validate the imported dataset

Before relying on an imported dataset, verify its time range, each device and channel association, physical units, facility context, and any reported conflicts or warnings. Correct the source description or facility record when necessary, then repeat the import using the preserved source files.
