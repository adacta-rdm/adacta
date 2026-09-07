---
title: Introduction
---

## What is Adacta?

Adacta is a research data management system that creates a time-resolved digital representation of an experimental facility. It links data files to the physical devices, facility configuration, and samples that were in use when the measurements were collected. The resulting record can be used to reconstruct which catalyst, reactor configuration, instrument set, and operating history produced a particular dataset. {% .lead %}

Adacta is designed particularly for catalysis and reactive-flow laboratories, where equipment and samples can change during a test campaign. If a mass flow controller, catalyst charge, detector, or other component is replaced, Adacta records the corresponding facility state and the time at which the change became valid. Resources imported for that time period can then be associated with the correct configuration.

Adacta supports the FAIR data principles: data should be findable, accessible, interoperable, and reusable. The system adds context to raw data so that experimental results remain interpretable after the original campaign has ended.

Adacta is not a data acquisition system, a process historian, or a conventional electronic laboratory notebook. It does not replace the original measurement system. Instead, it stores structured relationships among products, physical inventory items, facilities, facility states, samples, and data resources.

## Thinking in real-world objects

Adacta describes the laboratory in terms of the objects people work with in real life. A **product** describes a kind of equipment, while an **inventory item** is one particular physical example of that product. The product defines capabilities shared by those items: for example, a mass flow controller product may provide a flow channel twice, once as a measurement and once as a setpoint.

Stations, equipment, samples, files, and datasets remain separate objects because they have different identities and histories. Adacta connects them instead of merging their information into one record. This makes it possible to ask which physical item produced a recorded value, where it was installed, and which sample was involved.

See [Core concepts](/docs/concepts) for the expanded glossary and links to detailed explanations.

## Core terminology

Table 1 summarizes the principal objects currently used throughout the interface. The term **facility** is planned to be replaced, with **station** as the working name while the final choice is made; the existing pages retain **facility** where that is still the wording shown by the application.

| Term                     | Meaning                                                                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product                  | A catalog definition for a make and model of equipment. A product is not necessarily a specific physical unit.                                                                                                  |
| Manufacturer             | The organization associated with one or more catalog products.                                                                                                                                                  |
| Inventory item or device | A specific physical item available to a facility, normally derived from a catalog product and distinguished by identifying information such as a product number, serial number, range, or other specifications. |
| Facility                 | One standalone experimental device with a location, such as a test stand, reactor system, or characterization instrument. See [Stations](/docs/stations).                                                       |
| Facility state           | A time-stamped flowchart representing the equipment and sample configuration that was valid from a particular date and time.                                                                                    |
| Batch                    | A prepared quantity of material, such as a catalyst preparation batch.                                                                                                                                          |
| Sample                   | A portion of a batch that can be installed in a device or facility state.                                                                                                                                       |
| Resource                 | A file or dataset associated with a facility, device, sample, or experiment. CSV files are the primary data-resource format documented in this manual.                                                          |
| Tag                      | A named classification available from the **Tags** view. Tags marked **PID** are used as process-flow or P&ID node types.                                                                                       |
| Captioned circle         | A flowchart annotation used to add explanatory text where no inventory item or sample is required.                                                                                                              |

## Where to go next

{% quick-links %}

{% quick-link title="Core concepts" icon="lightbulb" href="/docs/concepts" description="The glossary behind products, inventory items, facilities, and samples, with links to the detailed pages." /%}

{% quick-link title="Adacta workflow" icon="presets" href="/docs/workflow" description="The order the pieces are normally set up in, from catalog entry to a mapped data resource." /%}

{% quick-link title="Importing files" icon="installation" href="/docs/importing-files" description="How to get measurement files into a facility and map them to the right time period." /%}

{% quick-link title="Troubleshooting" icon="warning" href="/docs/troubleshooting" description="What to check when a resource will not map or a facility state does not cover the measurement." /%}

{% /quick-links %}
