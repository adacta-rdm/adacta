---
title: Setup evidence and change types
---

{% callout type="warning" title="Planned feature" %}
This document describes planned features. They are currently not available.
{% /callout %}

Adacta records which equipment was installed in a facility at any point in the past. This page describes where that record comes from, how well it is supported, and what happens when two sources disagree. {% .lead %}

The facility state itself is described in [Facility flowcharts and states](/docs/flowcharts-and-states).

## Two kinds of setup change

Not every change to a facility costs the same amount of work. Adacta distinguishes two kinds.

A **light change** replaces one item with another of the same kind in the same position. Fitting a spare mass flow controller after the original fails is a light change. The process itself is unchanged, so the flowchart stays as it is and existing photographs still show the setup correctly. Only the record of which physical item occupied the position changes.

A **heavy change** alters the setup itself. Adding a position, removing one, or reconnecting the flow path are heavy changes. The flowchart must be edited to match, and existing photographs may no longer show the setup as it is.

|                                    | Light change | Heavy change            |
| ---------------------------------- | ------------ | ----------------------- |
| Flowchart                          | Unchanged    | Must be edited          |
| Existing photographs               | Remain valid | May need to be replaced |
| Can be proposed from imported data | Yes          | No                      |

Because a light change cannot alter the flowchart, it is safe to derive from imported data and confirm afterwards. A heavy change always requires a person to edit the flowchart, and to supply new photographs when the visible setup changed.

## Photographs of the setup

A flowchart shows how a facility is meant to work. A photograph shows what was actually there. Both are worth keeping.

A photograph carries its own **capture date and time**. This is separate from the validity date of a facility state, and it is what makes the photograph useful as evidence. It records the condition of the equipment at one specific moment.

Upload photographs whenever the visible setup changes, and after every heavy change. A photograph taken at commissioning and never replaced becomes misleading once the rig has been rebuilt.

Adacta can point out when the photographs for a facility are older than its most recent heavy change.

### Placing tags on a photograph

A **tag** marks a region of a photograph and links it to something in the facility. Mark the region, then choose what it refers to:

- a position in the flowchart;
- a specific inventory item, when the photograph shows something that identifies it, such as a serial number plate;
- a sample; or
- free text, for something that has no entry in Adacta.

A tag that refers to a position stays correct after a light change. The tag identifies the position, not the item occupying it, so Adacta can show whichever item was installed when the photograph was taken. Replacing a mass flow controller therefore does not require anyone to revisit the photographs.

Use free text for anything the flowchart does not describe, such as a bypass line, a temporary operating arrangement, a sampling point, or a note about access.

## Evidence from imported data

Imported data can state which item recorded each channel, either through a data sidecar or through information embedded in the source. [Planned data import and traceability](/docs/planned-data-import) describes how sidecars work.

Where that information includes a recording time, it is a dated statement about the setup: at this time, this item was recording in this position. Adacta keeps the statement as evidence and uses it to build the setup record.

Repeated imports that agree do not create repeated entries. They confirm the existing one, and Adacta records how long the statement held.

### Confirmation applies to the mapping

Confirmation is requested once for each mapping, not once for each file.

The judgment a person has to make is whether a source identifier such as `FT-101` refers to a particular position in a particular facility. Once that mapping is confirmed, later imports using the same identifier are applied without asking again. An identifier that Adacta has not seen before triggers a new request.

### What a sidecar can and cannot show

A sidecar shows how the acquisition system was configured. That is not the same as what was physically installed.

If someone replaces a device without updating the acquisition system, the sidecar keeps reporting the old device, confidently and on every run. Manual bookkeeping is less complete, but the person who wrote the entry was looking at the equipment.

Neither source is reliable in every case. Weigh them against the question being asked:

| Question                                         | Strongest source                |
| ------------------------------------------------ | ------------------------------- |
| Under what configuration was this data recorded? | The sidecar                     |
| What equipment was physically present?           | A photograph or a scanned label |

Keeping the source of every statement is what makes this judgment possible later. Adacta records where each statement came from instead of merging everything into one undifferentiated history.

## When sources disagree

Disagreement is expected. A sidecar, a manual entry, and a photograph can each say something different about the same moment. Adacta shows the disagreement instead of choosing silently.

The most common case is an item recorded as being in two places at the same time. This is physically impossible, so at least one of the records is wrong.

### Disputed records

When a record is known to be wrong but the correct answer is not yet established, mark it as **disputed**.

This is a normal working state, not an error. Finding out what actually happened may need a conversation with a colleague or a look at a lab notebook. Marking the record keeps the uncertainty visible while that happens. That is better than leaving a confident but wrong entry in place, and better than deleting the history.

A disputed record stays readable, and anything that depends on it is marked as well.

### Where warnings appear

Warnings appear where the affected information is used:

- on the facility, for conflicts touching that facility;
- on a facility state, for conflicts inside its validity period; and
- on a resource, when the setup record covering its recording interval is disputed.

The last one matters most. Someone downloading a dataset needs to know that the setup record for that period is contested, and that person may never open the facility page.

A repository-wide warning is reserved for conflicts that nobody has marked. An unmarked conflict means something went wrong that no one noticed, so it is shown at the top of the repository until it is resolved or marked as disputed. Conflicts that are already marked as disputed do not trigger this warning, because someone is already dealing with them.

The warning names what is wrong rather than reporting a general fault:

```text
2 unresolved conflicts

MFC-4 (serial 12345)
  Catalyst Test Station A, position MFC-4   2026-03-01 to 2026-06-14
  Catalyst Test Station B, position MFC-2   2026-05-02 to open
  Sources: sidecar (Station A), manual entry (Station B)
```

## Recording changes well

- Record a light change when an item is replaced in an otherwise unchanged setup.
- Create a new facility state for a heavy change, and edit the flowchart to match.
- Take a photograph after every heavy change, and tag the positions it shows.
- Do not correct a record you are unsure about. Mark it as disputed and resolve it once the facts are known.
- Keep the source of every statement. A record whose origin is unknown cannot be weighed against a record that disagrees with it.
