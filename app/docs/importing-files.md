---
title: Importing files
---

Adacta keeps each uploaded file as supplied. Files uploaded together share one
upload, which lets Adacta recognize source bundles such as a CSV and its TOML
measurement sidecar. {% .lead %}

## Start an upload

Drop files anywhere inside Adacta or choose them from the import page. A drop
from an inventory-item or sample-batch page carries that page as starting
context. A drop from a rig also preselects the rig for a matching measurement
sidecar.

## Upload a CSV with a TOML sidecar

Drop one CSV file and one TOML sidecar together. Adacta stores both originals
and opens the measurement review automatically. The review previews the CSV,
checks its structure against the sidecar, and lets you select the rig whose
P&ID resolves the sidecar's symbols. Select **Import measurements** to create
the dataset.

If the files do not form one unambiguous CSV and TOML pair, Adacta stores them
as an ordinary upload. The originals remain available after validation or
import errors, so you can correct the sidecar and upload the corrected pair.

See [Importing data](/docs/importing-data) for the sidecar format and the
measurement review details.
