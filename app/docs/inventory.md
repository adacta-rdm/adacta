---
title: Inventory
---

Inventory lists the rigs and physical equipment in the laboratory. A catalog product describes a model. An equipment entry describes one physical unit of that model. {% .lead %}

## Find an inventory entry

Select **Inventory** in the sidebar. The sidebar then lists every rig and equipment unit, grouped by building and room. Entries without a recorded location appear under **Unassigned**. Archived entries are omitted. Select an entry to open its page.

## Add equipment

Import an existing model from the **Catalog**, or choose **Add inventory item** and select **Equipment** when its model is missing. See [Catalog](/docs/catalog#import-physical-equipment) for both forms.

Every equipment unit has a product and takes its name from that product. Record a serial number or unit-specific values to distinguish units of the same model. A serial number is unique within a product. Different products can share a serial number.

An equipment page shows the product name, serial number, location, and linked catalog model. The catalog supplies model-wide specifications and channels. Values requested during import describe that one physical unit. The model link opens the product page.

## Work with a rig

Rigs appear alongside equipment in Inventory. Open a rig to work with its P&ID, datasets, and notes. See [Rigs](/docs/rigs) for creation, configuration, and naming.

## Addresses

Each rig has an address such as `/inventory/rigs/methanation-test-stand`. Each equipment unit has an address such as `/inventory/equipment/analytical-balance-xs205`. A rig and an equipment unit may end in the same name, because the address also names the kind. Within each kind, a repeated name receives a number, for example `analytical-balance-xs205-2`. An archived record keeps its address reserved.

A rig's views add `/pid`, `/data`, or `/notes` to its address.
