---
title: Inventory
---

Inventory lists the custom rigs and physical equipment in the laboratory. A catalog product describes a model. An equipment entry describes one physical unit of that model. {% .lead %}

## Find an inventory entry

Select **Inventory** in the sidebar. The list shows each entry's name, catalog model, serial number, location, and type. Rigs are custom assemblies with a P&ID. Equipment represents individual physical units.

Use the search field to find an entry by its name, serial number, manufacturer, model, or location. Each word must appear somewhere in the entry. For example, a building identifier and serial number can locate one controller.

The sidebar groups entries by building and room. Entries without a recorded location appear under **Unassigned**. Archived entries are omitted from the list and sidebar.

## Add equipment

Import an existing model from the **Catalog**, or choose **Add inventory item** and select **Equipment** when its model is missing. See [Catalog](/docs/catalog#import-physical-equipment) for both forms.

Equipment takes its name from its linked product. Equipment without a product link is shown by its URL slug. Record a serial number or unit-specific values to distinguish units of the same model.

An equipment page shows the product name, serial number, location, and linked catalog model. The catalog supplies model-wide specifications and channels. Values requested during import describe that one physical unit. The model link opens the product page.

Rigs and equipment share the address `/inventory/<slug>`. Each slug belongs to one rig or one equipment unit. Archived entries retain their addresses.

## Work with a rig

Choose **Add inventory item**, select **Rig**, and enter its name. A rig requires no catalog product.

A rig page provides **Overview**, **P&ID**, **Data**, and **Notes** views. The P&ID shows its assembly. Data lists recordings associated with the rig. Notes record observations and can include file attachments.

Editing a note retains its earlier version. Archiving a note removes it from the active list while preserving its recorded history. The note's observation time can differ from the time it was written.
