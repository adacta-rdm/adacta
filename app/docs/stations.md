---
title: Stations
---

{% callout title="Evolving terminology" %}
The term **station** is planned to replace **facility**, but the final name has not been chosen. Current interface labels and several manual pages still use **facility**.
{% /callout %}

A station is one standalone experimental device. Stations are the central organizing principle in Adacta, because almost every other record is understood through the station at which the work was done. {% .lead %}

## What counts as a station

A station is a top-level object. It is not a part of anything larger, it has a location, and it is somewhere a person goes with a sample in order to obtain a result.

Both of the following are stations, despite being very different pieces of equipment:

- A flow-type test stand for catalyst activity measurements, assembled in the laboratory from mass flow controllers, a reactor, a furnace, and an analyzer. Its configuration changes over time as components are replaced or the flow path is rebuilt.
- A store-bought characterization instrument, such as a physisorption analyzer or a diffractometer. It arrives as one unit, is not assembled by users, and its internal arrangement is fixed.

The difference in complexity does not matter. Both are places a sample goes, and both produce results that have to be attributed to the right equipment and the right material.

Complexity does affect how much configuration is worth recording. An assembled test stand benefits from a detailed flowchart, because the parts inside it change. A store-bought instrument may need only a single node, or no detailed configuration at all.

## What is not a station

- A component inside a setup, such as a mass flow controller, a furnace, or a detector, is an **inventory item** occupying a position within a station. It is not a station of its own.
- A room, floor, or building is a **location**. Several stations can share one location.
- A project or a measurement campaign is a way of grouping results. It is not a place a sample can be taken to.

A practical test: if you would carry a sample to it, and it produces a result on its own, it is a station.

## Why stations are central

No single station answers a complete research question. A synthesis station produces the material. A characterization station describes its structure and surface. A test stand measures how it performs under reaction conditions. Each result describes one part of what is known about that material.

Adacta exists to keep those partial results connected. Every result is recorded against the station that produced it, the sample that was present, and the time interval involved. Results collected at different stations, on different days, by different people can therefore be brought back together through the sample and its batch.

This is why the station rather than the project or the file is the organizing principle. A file can be misplaced and a project can be renamed, but the question of which equipment produced a measurement, and on which material, stays meaningful for as long as the data is kept.

## A station over time

A station is stable. Its configuration is not.

The station record holds what does not change: its name, its location, its contacts, and its documentation. What was installed inside it at a given moment is held separately as a time-valid configuration, so that a component swap does not create a new station.

See [Facility flowcharts and states](/docs/flowcharts-and-states) for how configurations are recorded, and [Setup evidence and change types](/docs/setup-evidence) for how Adacta decides which configuration was valid when.

## Naming a station

Choose a name that stays true as the equipment inside it changes.

Include what the station is for and, where it helps, an internal designation used in the laboratory. Avoid encoding the current configuration into the name. A station named after the analyzer fitted to it in its first year becomes misleading as soon as that analyzer is replaced.

The location is recorded separately, so it does not need to be repeated in the name.
