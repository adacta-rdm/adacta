---
title: Rigs
---

A rig is a standalone experimental device with a location. The laboratory builds it from components, or it describes the components inside it in detail, for example in a P&ID. {% .lead %}

## Definition and scope

A rig is a top-level object. It is not a part of anything larger, it has a location, and a person takes a sample to it to obtain a result.

A store-bought instrument shares these properties. For example, an analytical balance and an X-ray diffractometer are both standalone and have a location. Such an instrument is nevertheless **equipment**. The inventory therefore lists rigs and such instruments together, grouped by location.

The difference is the description of the inside. For example, a flow-type test stand for catalyst activity measurements is assembled in the laboratory from mass flow controllers, a reactor, a furnace, and an analyzer. Its configuration changes over time as components are replaced or the flow path is rebuilt. Its P&ID records these components. A store-bought instrument arrives as one unit of a catalog product. Its record identifies it through its product and serial number, and its inside is not described. Complexity does not decide which kind a device is. A diffractometer is far more complex than a balance, and both are equipment.

A component inside a rig, such as a mass flow controller, a furnace, or a detector, is also equipment. It occupies a position within the rig.

A room, floor, or building is a **location**. Several rigs and instruments can share one location. A project or a measurement campaign is a way of grouping results. It is not a place a sample can be taken to.

A practical test: if you take a sample to it and it produces a result on its own, it is a rig or a standalone instrument. It is a rig if the laboratory built it or describes the components inside it.

## Create and open a rig

Choose **Add inventory item** in Inventory, select **Rig**, and enter its name. A rig requires no catalog product. Its page provides **Overview**, **P&ID**, **Data**, and **Notes** views.

The P&ID represents its equipment and samples. Data lists the datasets imported for the rig. Notes record observations and can include file attachments. Editing a note retains its earlier version. Archiving removes the note from the active list while preserving its history. A note's observation time can differ from the time it was written.

## Archived rigs

An archived rig remains readable through its original address. Its **P&ID**, **Data**, and **Notes** views remain available. Diagram editing, note changes, and dataset-sidecar preparation require restoration. See [Inventory](/docs/inventory#archive-and-restore-an-item) for archive actions and equipment dependencies.

## A rig over time

A rig is stable. Its configuration is not.

The rig record holds what does not change: its name, its location, its contacts, and its documentation. What was installed inside it at a given moment is held separately as a time-valid configuration, so that a component swap does not create a new rig.

See [Rig flowcharts and states](/docs/flowcharts-and-states) for how configurations are recorded, and [Setup evidence and change types](/docs/setup-evidence) for how Adacta decides which configuration was valid when.

## Naming a rig

Choose a name that stays true as the equipment inside it changes.

Include what the rig is for and, where it helps, an internal designation used in the laboratory. Avoid encoding the current configuration into the name. A rig named after the analyzer fitted to it in its first year becomes misleading as soon as that analyzer is replaced.

The location is recorded separately, so it does not need to be repeated in the name.
