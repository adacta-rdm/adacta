---
title: Core concepts
---

Adacta represents equipment, working places, samples, source files, and recorded data as separate real-world objects. It then records the relationships among them so that research data remains understandable and searchable. This page provides a short glossary; follow the links for fuller explanations. {% .lead %}

## Rigs and equipment

| Concept          | Short description                                                                                                                                                                                                                                            | Learn more                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| **Manufacturer** | The organization that makes or supplies catalog products.                                                                                                                                                                                                    | [Catalog](/docs/catalog)     |
| **Product**      | A catalog definition for a make and model of equipment. It describes what all physical items of that product have in common.                                                                                                                                 | [Catalog](/docs/catalog)     |
| **Channel**      | Something a product can record, such as actual flow, requested flow, temperature, valve position, or CO2 concentration. A channel has a stable key, name, description, role, value type, and, where applicable, a quantity kind.                             | [Catalog](/docs/catalog)     |
| **Equipment**    | One physical unit of a catalog product, such as an MFC with a specific serial number. It can be a component of a rig or a standalone instrument, such as a balance or an X-ray diffractometer. Its name and available channels come from its linked product. | [Inventory](/docs/inventory) |
| **Rig**          | A standalone experimental device with a location that the laboratory builds or whose components it describes in detail, such as a catalyst test stand. A sample is taken to a rig to obtain a result. A rig has a P&ID, notes, and data views.               | [Rigs](/docs/rigs)           |
| **Inventory**    | The combined list of rigs and equipment. Rigs have addresses under `/inventory/rigs/<slug>` and equipment under `/inventory/equipment/<slug>`.                                                                                                               | [Inventory](/docs/inventory) |
| **Location**     | Where a rig or a standalone instrument physically resides, such as a building, floor, room, or another description meaningful to the research group. Several of them can share one location.                                                                 | [Rigs](/docs/rigs)           |

## Samples and research context

| Concept          | Short description                                                                                                                                      | Learn more |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| **Sample batch** | Material sharing a common preparation history. Data from synthesis, characterization, activation, and testing can be found together through the batch. |            |
| **Sample**       | A physical portion of a sample batch that can be installed in a rig or used in a particular operation.                                                 |            |

## Files, importing, and recorded data

| Concept           | Short description                                                                                                                     | Learn more                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Original file** | One file kept as it was supplied. Its role in an import is recorded separately.                                                       | [Importing files](/docs/importing-files) |
| **Data sidecar**  | An optional, portable description supplied beside a CSV file. It can identify columns, channels, units, equipment, and other context. | [Importing data](/docs/importing-data)   |
| **Dataset**       | A logical group of an axis and recorded channels produced by an import. It is linked to, but distinct from, its original files.       | [Importing data](/docs/importing-data)   |
| **Axis**          | A coordinate on which recorded values depend, most commonly time.                                                                     | [Importing data](/docs/importing-data)   |
| **Quantity kind** | What a value represents physically, such as temperature, pressure, or volume flow rate.                                               | [Importing data](/docs/importing-data)   |
| **Unit**          | The scale in which a quantity is expressed, such as kelvin, bar, or millilitres per minute.                                           | [Importing data](/docs/importing-data)   |

## How the concepts connect

A product describes a kind of equipment and its channels. Equipment is one physical unit of that product. A rig is the experimental device at which samples are measured. Its P&ID describes its configuration.
