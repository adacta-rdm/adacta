---
title: Troubleshooting
---

This chapter lists common problems encountered while working with Adacta together with the steps that resolve them. {% .lead %}

## A device is not available in the flowchart palette

Check that the corresponding product has been exported to inventory, the item is assigned to the selected facility, the item is not already used elsewhere in the state, and its type matches the selected node.

## A resource cannot be linked to a device

Compare the resource timestamp range with the device usage intervals and facility-state dates.

{% callout title="Resolution" %}
The relevant intervals must overlap. Correct the device usage history or the facility-state dates so that the resource timestamp falls within a recorded installation interval.
{% /callout %}

## A resource is associated with the wrong sample

Inspect the facility state that was valid at the resource timestamp.

{% callout title="Resolution" %}
Correct the sample installation history or create the missing state, then repeat the resource mapping if necessary.
{% /callout %}

## An import was interrupted

Reopen the resource, restart the import wizard, and load the saved preset. If no preset was saved, the column mapping may need to be repeated.

## A historical flowchart needs correction

Edit the historical state only when it was incomplete or inaccurate.

{% callout title="Resolution" %}
If the physical setup actually changed, restore the historical state and create a new state with the correct effective timestamp.
{% /callout %}
