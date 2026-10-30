---
title: Introduction
---

## What is Adacta?

Adacta is a research data management system. It links data files to the physical devices and samples that were in use when the measurements were collected. {% .lead %}

## Thinking in real-world objects

Adacta describes the laboratory in terms of the objects people work with in real life. A **product** describes a kind of equipment, while **equipment** is one particular physical unit of that product. The product defines capabilities shared by those items: for example, a mass flow controller product may provide a flow channel twice, once as a measurement and once as a setpoint.

Rigs, equipment, samples, files, and datasets remain separate objects because they have different identities and histories. Adacta connects them instead of merging their information into one record. This makes it possible to ask which physical item produced a recorded value, where it was installed, and which sample was involved.

See [Core concepts](/docs/concepts) for the expanded glossary and links to detailed explanations.

## Where to go next

{% quick-links %}

{% quick-link title="Core concepts" icon="lightbulb" href="/docs/concepts" description="The glossary behind products, inventory items, rigs, and samples, with links to the detailed pages." /%}

{% quick-link title="Importing files" icon="installation" href="/docs/importing-files" description="How to upload data files and import a CSV file with its sidecar." /%}

{% /quick-links %}
