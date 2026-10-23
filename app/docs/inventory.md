---
title: Inventory
---

Inventory lists the rigs and physical equipment in the laboratory. A catalog product describes a model. An equipment entry describes one physical unit of that model. {% .lead %}

## Find an inventory entry

Select **Inventory** in the sidebar. The sidebar lists rigs and equipment units with a recorded building, grouped by building and room. Select **All entries** to find entries without a recorded building. The sidebar omits archived entries. The **All entries** page has separate panels for rigs and equipment. Each panel has independent **Active** and **Archived** tabs. Select an entry to open its page.

The **All entries** page lists rigs in the upper table and equipment in the lower table. Both tables include entries without a recorded location. Rigs show their name and location. Equipment shows its name, catalog model, manufacturer, and location. Select an entry name to open its record. Archived records remain readable. Select a catalog model to open its product page.

One search field filters both panels as you type. Use **Filter inventory** to find entries by name or location. Equipment also matches serial numbers, manufacturers, model numbers, and model descriptions. Each word must match a field in the entry. Select **Clear filter** to show all entries in the selected views again.

## Archive and restore an item

Select **Archive** in an active rig or equipment row. The item leaves its active list and the sidebar. Its **Archived** tab retains the record and shows when it was archived. Select **Restore** there to return the same record to active use. The search query and the other panel's selected view remain unchanged.

Archiving retains the item's identifiers and relationships. A rig retains its diagram, notes, datasets, and original files. Its equipment is not archived automatically. Archived rig diagrams and notes are read only. Existing datasets and file downloads remain accessible.

Equipment linked to an active rig cannot be archived. The error lists the rigs that use it. Remove those links from their diagrams, or archive the rigs first. An archived rig with archived equipment cannot be restored until that equipment has been restored. Related records are never restored automatically.

Restore archived rigs and equipment before importing measurements that reference them. Archiving does not release an item's address or an equipment unit's serial number. Reuse **Restore** when the same physical item returns to service.

The archive date records when the entry was archived in Adacta. It does not establish when equipment was removed or measurements stopped.

## Add equipment

Import an existing model from the **Catalog**, or choose **Add inventory item** and select **Equipment** when its model is missing. See [Catalog](/docs/catalog#import-physical-equipment) for both forms.

Every equipment unit has a product and takes its name from that product. Record a serial number or unit-specific values to distinguish units of the same model. A serial number is unique within a product. Different products can share a serial number.

An equipment page shows the product name, serial number, location, and linked catalog model. The catalog supplies model-wide specifications and channels. Values requested during import describe that one physical unit. The model link opens the product page.

## Work with a rig

Rigs appear alongside equipment in Inventory. Open a rig to work with its P&ID, datasets, and notes. See [Rigs](/docs/rigs) for creation, configuration, and naming.

## Addresses

Each rig has an address such as `/inventory/rigs/methanation-test-stand`. Each equipment unit has an address such as `/inventory/equipment/analytical-balance-xs205`. A rig and an equipment unit may end in the same name, because the address also names the kind. Within each kind, a repeated name receives a number, for example `analytical-balance-xs205-2`. An archived record keeps its address reserved.

A rig's views add `/pid`, `/data`, or `/notes` to its address.
