---
title: Importing files
---

> **Draft:** The replacement import workflow is under active development. File
> preview is available in the new path; durable upload and background processing
> are not yet complete.

Importing turns a source file into a resource that remains understandable in
its experimental context. Adacta should retain the original file, record how it
was interpreted, and associate the result with the applicable repository,
facility, inventory item, and sample. {% .lead %}

## Start an import

Drop a file anywhere inside a repository. Adacta opens the import preview and
captures the context of the page where the file was dropped. For example, a
file dropped while viewing an inventory item is pre-associated with that item.
The planned association is shown before upload and is represented in the URL
where practical.

At the preview stage the file remains local to the browser. Seeing its name,
metadata, or contents does not mean that it has been uploaded or saved.

<!-- TODO: Add a screenshot of the global drop overlay and import-context card. -->

## Review the source

The available previews depend on the detected format. Text-based measurement
files can offer both:

- **Raw text**, which shows a bounded portion of the original source; and
- **Parsed data**, which separates embedded metadata from measurement rows and
  presents the rows as a spreadsheet-style table.

Only a bounded portion is inspected in the browser, so preview remains quick
for large files. A truncated preview does not imply that the eventual import
will omit the remaining data.

<!-- TODO: Document image, PDF, and vendor-binary previews when examples exist. -->

## Confirm how the file should be interpreted

Detection identifies a likely file format, but it cannot provide every piece
of scientific context. Before import, confirm or supply values such as:

- the facility, inventory item, or device that produced the measurement;
- timestamp columns and timezone;
- the meaning and physical unit of each measurement column;
- applicable samples or facility state; and
- format-specific settings that cannot be inferred safely.

These choices form an import plan. In particular, a CSV file may contain values
and column names without recording their physical units; the user must then
provide those units rather than Adacta guessing them.

<!-- TODO: Add the settings workflow after the CSV example stabilizes it. -->

## Upload and processing

The completed workflow will upload the original file and process it in a
background task. Streaming avoids loading a complete large measurement file
into application memory. Adacta will preserve provenance connecting the source
file, chosen settings, importer version, and materialized resource.

Do not treat a local preview as a durable record. The import is complete only
after Adacta confirms that upload and processing succeeded.

<!-- TODO: Document progress, retry, cancellation, and failure recovery once the
     background-task lifecycle is implemented. -->
