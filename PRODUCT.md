# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Adacta supports researchers during and after an experimental campaign.

- **During a campaign.** A researcher operates the experimental equipment and records each
  change. For example, they may replace a mass flow controller, install a new catalyst charge,
  or replace a detector. They often enter this information between experiments and may be
  interrupted.
- **After a campaign.** The same researcher or a colleague reconstructs how a dataset was
  produced. They may do this during analysis, while preparing a publication, or several months
  later.

A separate data steward or curator role has been considered but has not been confirmed.
Therefore, future work must support the researcher who performs both tasks.

## Product Purpose

Adacta is a research data management system. It creates a time-resolved digital representation
of an experimental rig. The system links data files to the physical devices, rig configuration,
and samples used for each measurement. As a result, a researcher can determine
which catalyst, reactor configuration, instruments, and operating history produced a dataset.

Adacta is intended for catalysis and reactive-flow laboratories. Equipment and samples often
change during a test campaign in these laboratories. When a component is replaced, Adacta
records the new rig state and the time when that state became valid. Resources from that
period can then be linked to the correct configuration.

The documentation states that Adacta supports the FAIR data principles. Data should be
findable, accessible, interoperable, and reusable.

## Positioning

Adacta stores research data and the relationships needed to interpret it. A data acquisition
system or process historian remains responsible for the original measurements. A conventional
electronic laboratory notebook may hold other experimental records.

Adacta represents the laboratory as real objects with distinct identities and histories. It
also records when each rig configuration was valid. Consequently, the data model can
answer specific questions about a recorded value. For example, it can identify the physical
item that produced the value, where the item was installed, and which sample was involved.

## Operating Context

- The instance is the unit of ownership. Each research group runs one instance. Its SQLite file
  holds users, sessions, and every record. Every signed-in user may do everything. Roles are
  planned.
- Work uses a catalog of equipment models, an inventory of physical items, sample batches,
  individual samples, and imported source files.
- Equipment and samples can change during a campaign. Adacta records each change and preserves
  the earlier state.

## Capabilities and Constraints

Future work must preserve the following confirmed constraints.

- **Self-hosted for each research group.** Each group has one instance with one SQLite file.
- **Long-term records.** A record must remain interpretable after a campaign has ended. It must
  also remain interpretable when the original researchers or Adacta are unavailable. This
  requirement constrains storage formats and export functions.

**Terminology.** The user manual in `app/docs/` defines the current product terms. The main
objects include manufacturer, product, product capability, channel, inventory item, rig,
location, rig configuration, rig slot, tag, sample batch, sample, resource, context, and
experiment.

Use _rig_ for a recognizable experimental system at a fixed location. A rig may be a reactor
system, a characterization instrument, or another system where samples are handled and results
are produced. The names for samples and batches were also reviewed, and `SampleBatch` was
retained.

**Catalog ownership.** A catalog record taken from a manufacturer's documents is owned outside
the instance. The application therefore does not allow that record to be edited. A record
entered in the application belongs to the instance and remains editable. The
`externallyOwned` flag records this distinction on `Manufacturer`, `ProductSeries`, and
`Product`. Their child records follow the ownership of the parent record.

The following functions have not been completed.

- The import model for data resources is documented as a plan. Source files can be uploaded,
  but they cannot yet be resolved into recorded data.
- Inventory entries cannot be created in the application. Only the seed process creates them.
- Catalog editing is incomplete. The application has a guided product creation page. This page
  can create the manufacturer at the same time. The application does not have forms for
  editing, deletion, product series, or specifications.

Some requirements remain undecided. No accessibility standard has been confirmed as a product
requirement. Future work must therefore avoid claiming compliance with a specific standard.
Alignment with NFDI4Cat community vocabularies has also been discussed but is not binding. The
FAIR statement in the documentation is a supported principle. It does not define a specific
interoperability requirement.

## MVP Scope

The first version used by a research group requires the object model and file import. It also
requires time-resolved rig configurations and their P&ID diagrams. Time is part of the central
data model. Therefore, the first usable version includes this information.

## Brand Commitments

- The product is named **Adacta**. It is built for the
  [NFDI4Cat](https://nfdi4cat.org) project.
- **Voice.** Use plain and correct English in short sentences. Use US spelling and brief
  examples. Avoid idioms, metaphors, and vivid language. Apply these rules to interface text,
  the user manual, and source comments.
- **Register.** Use formal and professional language. The readers are researchers, and most are
  European scientists with doctorates. Use the precise term that a specialist would expect.
  For example, use the heading "Identification" instead of "What it is."

## Evidence on Hand

- `app/docs/` contains a 15-page user manual, including `introduction.md` and
  `concepts.md`. These documents define the product and its terminology.
- `seed/presets/demo/` and `seed/presets/pilot/` contain committed development data.
- `seed/presets/akd/` contains private development data. It is excluded from Git and restored
  from the `private/seed` branch. The data includes 20 manufacturers, 43 products, 246
  specifications, 39 channels, 6 sample batches, and 29 samples. The repository does not state
  what "akd" means. Documentation must not assign a meaning to it.
- The akd data contains no inventory entries. Its empty Inventory page therefore reflects the
  available data.

The repository contains no testimonials, named customers, pricing, licensing claims,
benchmarks, or deployment and adoption claims. It also does not establish whether a research
group currently depends on Adacta. Future work must not create any of these claims.

## Product Principles

1. **Each object retains its identity.** Rigs, equipment, samples, files, and
   datasets have separate identities and histories. Adacta records the relationships between
   them.
2. **The record includes time.** A configuration is valid from a recorded time. Earlier
   configurations remain available.
3. **The same person enters and retrieves information.** Entry must support interruptions
   during a campaign. Retrieval must remain possible several years later. Therefore, the
   interface must support both activities.
4. **Records remain readable without Adacta.** Storage and export formats must preserve the
   meaning of the data when the application is unavailable.
5. **Each research group has one instance.** The instance is the unit of ownership,
   isolation, and access.
