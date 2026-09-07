---
title: Inventory and facilities
---

The Inventory view contains physical devices and the facilities in which those devices can be used. {% .lead %}

## Inventory list

Select **Components** in the left pane to view all physical inventory items. The list shows each item's name and stable identifier, product number, specifications, and current status. An item is **Available** when it is not installed in the setup revision that is valid now. An installed item links to its current facility and shows that facility's location.

Use the **All** and **Available** controls above the table to include every item or only items that can currently be assigned. The selected filter is retained in the page URL. Figure 4 shows multiple physical devices based on several catalog products.

{% figure src="/docs-placeholder.svg" alt="Inventory items available to a selected facility." caption="Figure 4: Inventory items available to a selected facility." /%}

Use device names that are unique and recognizable during resource import. A practical name may include the manufacturer or model, a serial or internal asset number, and a stable range designation. Avoid including operating details that can change, such as the gas currently assigned to a mass flow controller.

## Create and manage a facility

Facilities in the left pane are grouped by building and room. Select **New facility** at the bottom of the pane, enter the facility name and structured location, then press **Create**, as shown in Figure 5.

{% figure src="/docs-placeholder.svg" alt="Form used to create a facility." caption="Figure 5: Form used to create a facility." /%}

After creation, select the facility to maintain its information. The facility page brings together:

- facility name and location;
- relevant contacts and contact roles;
- the current setup flowchart;
- linked documents and images;
- linked measurement resources; and
- controls for editing or deleting the facility.

Use **Edit Facility** to correct the name or location. The edit form uses the same two fields as the creation form. Delete a facility only when the record was created in error and no retained historical data depend on it.

## Contacts

In the **Relevant Contacts** area, use the add-contact control to open the contact form shown in Figure 6. Enter the **Contact Role**, then identify the person by one of two methods:

- select an existing **Adacta User**; or
- enter an external person's name under **Someone else**.

Press **Submit** to add the contact. Use a role such as test engineer, facility owner, technical manager, or safety contact rather than relying on the person's name alone. This preserves the reason the person is associated with the facility.

{% figure src="/docs-placeholder.svg" alt="Facility contact form for an Adacta user or an external person." caption="Figure 6: Facility contact form for an Adacta user or an external person." /%}

## Facility documents and linked resources

The facility page separates linked content into **Documents / Images** and **Measurements**. Select **Resources** or **Manage Resources** to open the resource-management page shown in Figure 7.

{% figure src="/docs-placeholder.svg" alt="Facility resource-management page with linked resources and the Add Resource form." caption="Figure 7: Facility resource-management page with linked resources and the Add Resource form." /%}

The linked-resource table displays the preview, name, file type, role, and optional label. Use the edit control to revise the display name, role, or label. Use the delete control to remove the link when it was created in error; confirm first that the underlying resource is not needed elsewhere.

To link an existing resource:

1. choose **Link existing resource** as the source;
2. select the role;
3. add an optional label;
4. select the resource; and
5. press **Link Resource**.

To upload and link a new file, change the source to the upload option, choose the file, provide the requested metadata, and complete the upload-and-link action. The available facility-resource roles shown by the current interface are:

- **Measurement**;
- **Facility Image**;
- **Safety Documentation**; and
- **Miscellaneous**.

Use **Facility Image** for photographs or diagrams showing the facility or parts of it. Use **Safety Documentation** for files related to facility security or safety measures. Use descriptive labels and retain the original filename where it contributes to traceability.

## Device details and usage history

Select an inventory item to view its descriptive information and its historical usage. The item page can show specifications such as pressure rating, measurement range, and configured service. More importantly, the **Usages of this item** section lists the facilities and date intervals in which the item appeared, with thumbnails linking to the corresponding flowchart revisions.

Figure 8 shows one mass flow controller used in three successive facility-state intervals.

{% figure src="/docs-placeholder.svg" alt="Inventory-item details and time-resolved facility usage history." caption="Figure 8: Inventory-item details and time-resolved facility usage history." /%}

This history provides the device-level traceability needed to determine where a physical instrument was installed at a particular time.
