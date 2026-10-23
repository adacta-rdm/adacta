---
version: 1
slug: "app-routes-inventory-index-tsx"
primary_target: "app/routes/inventory._index.tsx"
related_targets: ["app/routes/catalog._index.tsx","app/routes/samples._index.tsx"]
---

# Catalog, Inventory, and Samples lists

Mode: Operate. Researchers find laboratory records and switch between active and archived records.

## Direction contract

THESIS: Reuse the Inventory table structure across the three index pages. Preserve their columns and domain operations.

OWN-WORLD: Use the existing semantic colors, Inter typography, 12px panel corners, shaded column headers, and separated rows.

STORY: A researcher searches records and opens the matching record. Inventory and Samples retain distinct Active and Archived views. Catalog has one view.

FIRST VIEWPORT: Show the page heading and existing actions above the controls. All three pages use ListView for shared search placement above ListPanel content. Inventory has separate rig and equipment panels with independent archive navigation and counts. Their tabs preserve the other panel selection and the shared query. Samples has one panel with archive navigation. The panel places tabs inside its border with 16px below them. Catalog omits archive navigation. Shared table headers and empty states keep the content aligned. Batch and expanded sample rows retain their original shared column alignment.

FORM: Extend the existing surfaces. The user's Inventory reference determines the structure. No concept seed applies to this narrow refinement.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Inventory archival

Inventory rows offer Archive or Restore according to their recorded state. Pending actions disable the row controls. Dependency failures appear beside the affected row with links to the blocking records. Archived names remain links. Rows show the archive date below the name.

Archived detail pages show the archive date, read-only status, and a link to restoration in Inventory. Rigs retain readable diagrams, notes, datasets, and files. Diagram and note changes are blocked. Equipment archival requires no active rig links. Rig restoration requires all linked equipment to be active. Imports require restoration of archived records. Archive dates describe application actions rather than measurement or removal times.
