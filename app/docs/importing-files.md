---
title: Importing files
---

Adacta keeps each uploaded file as supplied. Files uploaded together share one
upload, which lets Adacta recognize source bundles such as a CSV and its TOML
dataset sidecar. {% .lead %}

## Start an upload

Drop files anywhere inside Adacta or choose them from the import page. A drop
from an inventory-item or sample-batch page carries that page as starting
context. A drop from a rig also preselects the rig for a matching dataset
sidecar.

Before upload, Adacta reads a bounded part of a selected file in the browser.
The preview can show raw text or parsed CSV rows. A preview does not mean the
file has been uploaded or saved. A truncated preview does not limit the later
import.

## Upload a CSV with a TOML sidecar

Drop one CSV file and one TOML sidecar together. Adacta stores both originals
and opens the dataset review automatically. The review previews the CSV,
checks its structure against the sidecar, and lets you select the rig whose
P&ID resolves the sidecar's symbols. Select either file in the sidebar to
inspect its preview. The sidecar preview shows the original TOML text.
Select **Import dataset** to create the dataset.

If the files do not form one unambiguous CSV and TOML pair, Adacta stores them
as an ordinary upload. The originals remain available after validation or
import errors, so you can correct the sidecar and upload the corrected pair.

See [Importing data](/docs/importing-data) for the sidecar format and the
dataset review details.
