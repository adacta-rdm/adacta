---
title: Adacta workflow
---

This chapter describes the recommended order for configuring a new Adacta deployment, keeping it current, and using the data it stores. {% .lead %}

## First-time setup

A new deployment should normally be configured in the following order:

1. Synchronize the catalog and confirm that the required manufacturers and products are available.
2. Add any missing manufacturers or products.
3. Export the products used by the laboratory to create physical inventory items.
4. Create the facility and add the relevant contacts and facility documents.
5. Create the initial time-stamped facility state and build the flowchart using available inventory items.
6. Create catalyst or material batches and samples.
7. Install the applicable sample in the device shown on the facility flowchart.
8. Import data resources and map the data columns to the appropriate devices, variables, and units.
9. Validate that the imported resource is associated with the correct facility state and sample.

The order is important. A resource can only be associated reliably when the required devices, samples, and time-valid facility state already exist.

## Ongoing maintenance

After the initial setup:

1. Add catalog products and inventory items as new equipment enters the laboratory.
2. Create batches and samples as materials are prepared.
3. Create a new facility state whenever the physical setup changes.
4. Import resources as data become available.
5. Verify that the resource timestamp overlaps the intended device-installation interval and facility state.

Do not modify a historical state merely because the physical setup has changed. Edit an existing state only to correct an incomplete or inaccurate record. A real configuration change requires a new state with the date and time at which the change became effective.

## Using the stored data

The database can be used to:

- review the history of a particular inventory item;
- identify the facility state that was valid when a resource was collected;
- verify which sample was installed during a test;
- inspect and compare imported resources; and
- reconstruct the equipment and sample context for a historical dataset.
