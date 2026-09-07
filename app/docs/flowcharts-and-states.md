---
title: Facility flowcharts and states
---

The facility flowchart is the time-resolved representation of the experimental setup. Each state has a start date and time and remains valid until the next state begins. {% .lead %}

## Create the initial flowchart

A newly created facility has no setup history. In the **Setup Flowchart** panel, press **Create Initial Flowchart**, as shown in Figure 9. Enter the date and time at which the represented configuration first became valid, then add the devices, connections, annotations, and samples that describe the physical setup.

{% figure src="/docs-placeholder.svg" alt="New facility prompting the user to create its initial flowchart." caption="Figure 9: New facility prompting the user to create its initial flowchart." /%}

The initial flowchart establishes the first facility state. Subsequent physical changes should be represented by new states rather than by overwriting this baseline.

## Select a historical state

State cards are shown across the top of the facility flowchart view. Each card displays the state's effective timestamp and a small flowchart preview. Select a card to display that revision. The adjacent **Create new state** tile begins a new time-valid configuration, as shown in Figure 10.

{% figure src="/docs-placeholder.svg" alt="Facility-state cards and the Create new state tile." caption="Figure 10: Facility-state cards and the Create new state tile." /%}

Historical states are marked **Read-only** in the drawing area. The state panel identifies the date from which the configuration was valid and provides controls for authorized correction of the historical record. Figure 11 shows the selected historical state, the flowchart canvas, and the node palette.

{% figure src="/docs-placeholder.svg" alt="Read-only historical facility state with its validity date, flowchart canvas, and node palette." caption="Figure 11: Read-only historical facility state with its validity date, flowchart canvas, and node palette." /%}

The state panel explicitly distinguishes between correcting an incomplete or inaccurate record and documenting a real physical change. Use **Edit** only for a correction. Use **Create new state** when the equipment, connections, sample, or other physical configuration actually changed.

## Create a new state

Create a new state whenever the physical configuration changes. Press **Create new state**, then enter the date and time when the changed setup became valid. The dialog is shown in Figure 12.

{% figure src="/docs-placeholder.svg" alt="Date and time entry for a new facility state." caption="Figure 12: Date and time entry for a new facility state." /%}

The timestamp is operationally important. Adacta uses it to determine which state should be associated with a time-stamped resource. Enter the actual effective time, not merely the time at which the database entry is being made.

A new state begins from the latest prior configuration so that only the changed parts of the flowchart need to be updated. Existing nodes and connections therefore appear on the canvas when the new state opens. A blue banner identifies the effective time being documented, and the **Date/Time since this setup is valid** field can be checked or corrected before saving, as shown in Figure 13.

{% figure src="/docs-placeholder.svg" alt="New facility state initialized from the preceding flowchart, with its effective date and time available for review." caption="Figure 13: New facility state initialized from the preceding flowchart, with its effective date and time available for review." /%}

## Add devices and process nodes

The right-hand palette separates node types into two groups:

- Nodes with **Items available** have matching inventory items that can be assigned to the node.
- Nodes without available **Items** can be displayed as process symbols, but no matching inventory item is currently available for assignment.

Drag the required node onto the flowchart and select it. The node properties appear beneath the state panel. Enter a concise **Slot name** describing the node's role in this facility state, then use **Device** to select the corresponding physical inventory item. Figure 14 shows a furnace node being assigned to the inventory item named Tube Furnace.

{% figure src="/docs-placeholder.svg" alt="Assigning a physical inventory item to a selected flowchart node." caption="Figure 14: Assigning a physical inventory item to a selected flowchart node." /%}

Connect nodes with lines to represent process connections. Drag between the small connection handles on the node edges, then inspect the completed line before saving. The slot name belongs to the position in the facility configuration; the selected device identifies the physical item occupying that position. This distinction allows a later state to retain the same functional slot while assigning a replacement device.

When a required device is missing from the selectable inventory list, check whether:

- the product was exported to inventory;
- the inventory item belongs to the selected facility;
- the item is already assigned elsewhere in the same state; or
- the inventory item's type matches the selected node type.

### Check device-usage warnings

After a device is selected, Adacta can display yellow notices listing other facilities and date intervals in which the same inventory item is recorded as being used. Figure 15 shows two existing usage intervals for the selected furnace.

{% figure src="/docs-placeholder.svg" alt="Device assignment with notices about existing usage intervals in another facility." caption="Figure 15: Device assignment with notices about existing usage intervals in another facility." /%}

Treat these notices as a traceability check. Compare the listed intervals with the effective time of the state being edited. Resolve an unintended overlap by correcting the device history, choosing the correct inventory item, or creating the missing facility state. An adjacent, nonoverlapping interval may be legitimate, but the transition time should still be verified before saving.

## Edit nodes and navigate the canvas

Select a node to expose its properties and editing actions. The node action menu includes **Delete**, **Delete and Reconnect**, and **Duplicate**, as shown in Figure 16.

- **Delete** removes the selected node and should be used only after checking its connections and child objects.
- **Delete and Reconnect** is intended for removal of an intermediate node while retaining the surrounding process path. Inspect the resulting connection before saving.
- **Duplicate** creates a second node based on the selected node. Give the copy the correct slot name and device assignment; do not leave two nodes assigned unintentionally to the same physical item.

{% figure src="/docs-placeholder.svg" alt="Node action menu, duplicated node, canvas controls, and minimap." caption="Figure 16: Node action menu, duplicated node, canvas controls, and minimap." /%}

The controls at the lower left of the canvas provide zoom and view-management functions, and the minimap at the lower right helps locate the visible region in a larger flowchart. Use these controls rather than compressing a large process into a small area of the canvas.

## Add samples

When a device contains a sample, select the device and use **Add Sample**. A flask symbol is added to the node. Select the required sample from the available list.

The sample should already exist in the **Samples** section before it is installed in the flowchart. The state timestamp then defines the period during which that sample is associated with the device and facility.

## Add explanatory annotations

Use a captioned circle for information that belongs on the flowchart but does not correspond to an inventory item or sample. This is appropriate for a note about a bypass, temporary operating arrangement, sampling point, or other contextual information.

To associate an annotation with a particular node, select the node and press **Add Captioned Circle**. The **Children** count increases, and the new circle is connected to the selected parent. Select the captioned circle to edit its **Top Label** and **Bottom Label**, as shown in Figure 17. Keep both labels concise enough to remain legible in the state-card preview.

{% figure src="/docs-placeholder.svg" alt="Captioned circle attached as a child of a flowchart node, with editable top and bottom labels." caption="Figure 17: Captioned circle attached as a child of a flowchart node, with editable top and bottom labels." /%}

## Save and correct states

When a historical state is placed in edit mode, a yellow banner identifies the state being edited and the **Date/Time since this setup is valid** field becomes available, as shown in Figure 18. Confirm both the selected state and its effective timestamp before changing the flowchart.

{% figure src="/docs-placeholder.svg" alt="Historical facility state in edit mode with its effective date and time." caption="Figure 18: Historical facility state in edit mode with its effective date and time." /%}

Press **Save** after checking the node assignments, connections, child samples or annotations, and any device-usage notices. Because the interface may not provide a separate cancel operation in every editing view, avoid making exploratory changes in a historical state. If the effective timestamp itself must be corrected, verify how the change affects neighboring state intervals and the resources associated with those intervals.

The state panel also provides **Delete** while editing. Adacta requests confirmation that the state is to be deleted permanently from the history, as shown in Figure 19. Delete a state only when it was created in error and after confirming that no retained resource or installation history depends on it. Use **Cancel** whenever the historical consequences have not been checked.

{% figure src="/docs-placeholder.svg" alt="Permanent-deletion confirmation for a facility state." caption="Figure 19: Permanent-deletion confirmation for a facility state." /%}

Use the following rule:

Edit a state to correct the record. Create a new state to represent a changed physical setup.
