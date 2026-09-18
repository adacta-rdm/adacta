---
name: Adacta
description: An interface for laboratory data that uses semantic color roles and one elevated content surface.
colors:
  canvas: "#ffffff"
  canvas-sunken: "oklch(0.967 0.001 286.375)"
  surface: "#ffffff"
  surface-muted: "oklch(0.985 0 0)"
  foreground: "oklch(0.141 0.005 285.823)"
  foreground-muted: "oklch(0.442 0.017 285.786)"
  border: "oklch(0.92 0.004 286.32)"
  border-strong: "oklch(0.871 0.006 286.286)"
  accent: "oklch(0.5 0.134 242.749)"
  accent-hover: "oklch(0.443 0.11 240.79)"
  accent-foreground: "#ffffff"
  link: "oklch(0.5 0.134 242.749)"
  link-underline: "oklch(0.828 0.111 230.318)"
  focus: "oklch(0.588 0.158 241.966)"
  danger: "oklch(0.505 0.213 27.518)"
  warning: "oklch(0.555 0.163 48.998)"
  success: "oklch(0.527 0.154 150.069)"
  series-1: "oklch(0.588 0.158 241.966)"
  series-2: "oklch(0.646 0.222 41.116)"
typography:
  headline:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "32px"
    fontFeature: "cv02, cv03, cv04, cv11"
  title:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "24px"
  body:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  supporting:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "InterVariable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "24px"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  full: "9999px"
spacing:
  control: "8px 12px"
  field-gap: "24px"
  page: "24px"
  card: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.supporting}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.accent-foreground}"
  input-text:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    width: "100%"
  card-shell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "40px"
  sidebar-item:
    textColor: "{colors.foreground}"
    typography: "{typography.supporting}"
    rounded: "{rounded.lg}"
    padding: "8px 8px"
  sidebar-item-current:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  badge-status:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.foreground-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  link-inline:
    textColor: "{colors.link}"
    typography: "{typography.supporting}"
---

# Design System: Adacta

## Overview

Adacta presents laboratory records through a restrained application interface. The data is
the main content on every page. Consistent alignment, borders, and spacing make that content
easier to scan. Color and motion have limited, defined purposes.

The implementation uses semantic color roles. For example, a component uses
`bg-surface` or `text-foreground-muted` instead of a palette value. Each role contains a
light value and a dark value. The `color-scheme` property and `light-dark()` function select
the applicable value. Therefore, Adacta components do not contain separate theme branches.

The interface presents enough information for laboratory work without reducing legibility.
Interface text is normally 14px, while documentation text is 16px. On large screens, the
application uses one elevated content card. Components within that card use borders and muted
backgrounds for separation.

The design has the following characteristics.

- Adacta components use semantic color roles.
- Sky blue is used for primary actions, links, and focus indicators.
- Zinc neutrals provide the canvas, surfaces, text, and borders.
- The application shell contains one elevated content card on large screens.
- InterVariable is the only typeface.
- Thin borders separate content within the application.

## Colors

The interface uses zinc neutrals and one sky-blue accent. Red, amber, and green communicate
status. Each semantic role has a light value and a dark value. The frontmatter records the
light value, while `.impeccable/design.json` also records the dark value.

### Primary

- **Accent** (`oklch(0.5 0.134 242.749)`): Used for the primary button and inline links. A
  brighter value is used for the focus ring.
- **Accent Hover** (`oklch(0.443 0.11 240.79)`): Used when a filled accent control is
  hovered.

### Neutral

- **Canvas** (`#ffffff`): Used for the page canvas and the content surface in the light
  theme. These roles have different values in the dark theme. The difference identifies the
  content card.
- **Large-screen Canvas** (`oklch(0.967 0.001 286.375)`): Used behind the content card at
  the `lg` breakpoint and above.
- **Muted Surface** (`oklch(0.985 0 0)`): Used for hovered rows, the current sidebar item,
  and small inset elements.
- **Foreground** (`oklch(0.141 0.005 285.823)`): Used for primary text.
- **Muted Foreground** (`oklch(0.442 0.017 285.786)`): Used for helper text, list metadata,
  and inactive icons.
- **Border** (`oklch(0.92 0.004 286.32)`): Used for dividers, input borders, and the content
  card border.
- **Strong Border** (`oklch(0.871 0.006 286.286)`): Used when a border must be more visible.
  For example, the sidebar resize handle uses this role when it is hovered.

### Data series

- **Series One** (`oklch(0.588 0.158 241.966)`) and **Series Two**
  (`oklch(0.646 0.222 41.116)`): Used to distinguish series in time-series charts. They are
  not used for application controls.

### Status

- **Danger** (`oklch(0.505 0.213 27.518)`), **Warning**
  (`oklch(0.555 0.163 48.998)`), and **Success**
  (`oklch(0.527 0.154 150.069)`): Each status has values for a solid color, tinted surface,
  surface text, and border. Components use the values for one status consistently.

### Color requirements

Adacta components use semantic color roles. They do not use palette names or `dark:`
classes. When a component needs a new color purpose, add a semantic role to `theme.css`.
Define both theme values on that role.

Sky blue is the only interface accent. Red, amber, and green indicate status. They are used
when an operation fails, needs attention, or succeeds. This distinction keeps application
controls and status messages consistent.

A typical page mainly uses foreground colors, muted foreground colors, and borders. Accent
and status colors should cover only a small part of a page in its normal state. Extensive
status color indicates that the page requires the user's attention.

## Typography

**Body font:** InterVariable, followed by `ui-sans-serif`, `system-ui`, and
`sans-serif` as fallbacks.

**Display font:** InterVariable. The documentation maps `--font-display` to the same
typeface.

The font is stored with the application. This preserves the selected character variants and
prevents requests to an external font service. The enabled variants are `cv02`, `cv03`,
`cv04`, and `cv11`. They provide a single-story `a` and open forms for `4`, `6`, and
`9`. These forms help distinguish characters in order codes, serial numbers, and
quantities.

### Hierarchy

- **Headline** (600, 20px/32px; 24px/32px below `sm`): Used for the page title. It is larger
  on small screens because the sidebar is absent and the title provides the page context.
- **Title** (600, 14px/24px; 16px/28px below `sm`): Used for section headings and the
  subtitle below a page title.
- **Body** (400, 16px/24px): Used for documentation and other reading text.
- **Supporting** (400, 14px/20px): Used for list rows, field labels, helper text, and buttons.
- **Label** (500, 12px/24px): Used for sidebar section headings and small badges.

### Typography requirements

Use InterVariable throughout the application and documentation. A single typeface maintains
consistent character forms in records and controls.

Use 14px text for application controls and supporting information. Use 16px text for prose.
When a control needs more visual emphasis, adjust its spacing or weight before increasing the
font size.

## Layout

The application has a fixed sidebar and a content area. The user can resize the sidebar with
a drag handle. The handle is a `separator` and provides `aria-valuemin`,
`aria-valuemax`, and `aria-valuenow`. It also supports keyboard input. The
`--sidebar-width` custom property stores the selected width.

Below the `lg` breakpoint, the sidebar becomes a slide-over and a compact navigation bar is
shown. The content then uses the page canvas directly with 24px padding. At the `lg`
breakpoint and above, the content uses a card with 40px padding. The card has an 8px gap from
the top and right edges of the viewport.

Content within the card has a maximum width of `max-w-6xl` (72rem). Forms and prose usually
use `max-w-xl` (36rem). Within a form, fields have 24px of vertical separation. A label,
helper text, and control have 8px of separation because they describe one field.

### Large-screen content card

The elevated content card is used at the `lg` breakpoint and above. On smaller screens, the
content is placed directly on the page canvas. This removes the card border, radius, and
shadow when screen space is limited.

## Elevation

The large-screen content card is the only elevated surface shown during normal use. It has an
8px radius, a 1px border, and the following shadow:
`0 1px 2px rgb(0 0 0 / 0.05)`.

Components within the content card use borders and muted surfaces for separation. Larger
shadows are reserved for overlays. Examples include dialogs, P&ID editor tool panels, file
drop targets, and documentation code blocks.

### Shadow definitions

- **Content card** (`box-shadow: 0 1px 2px rgb(0 0 0 / 0.05)`, with `ring-1` in the border
  role): Used for the application content area. The border provides most of the visible
  separation.
- **Overlay panel** (`shadow-lg`): Used for a component displayed above the page. Examples
  include dialogs, editor panels, drop targets, and documentation code blocks.

### Elevation requirement

Use one elevated surface during normal application use. Before adding a shadow, determine
whether the component is displayed above the page. Components within the normal document
flow use a border instead.

## Shapes

Most controls and containers use an 8px radius. Small inset elements, such as badges and icon
buttons, use a 6px radius. Large framed regions, such as documentation code blocks and the
P&ID canvas, use a 12px radius. Fully rounded corners are reserved for counts and compact
labels that require this shape.

Inputs use a 1px border on the surface background. Tables and lists use borders between
items. P&ID symbols use line drawings with non-scaling strokes. Therefore, the stroke width
remains constant at every zoom level.

### Radius requirement

Use an 8px radius by default. Use 6px for small inset elements and 12px for large framed
regions. Use a fully rounded shape only for counts and controls whose meaning depends on that
shape.

## Components

### Buttons

- **Shape:** Use an 8px radius.
- **Primary:** Use the accent background with white text. Apply 8px vertical padding and 12px
  horizontal padding. Use 14px semibold text. On hover, use Accent Hover. On focus, show a 2px
  focus outline with a 2px offset. A disabled button uses 50% opacity.
- **Related action:** Pair a primary button with a plain text link in Muted Foreground. On
  hover, the link changes to Foreground. Forms do not use a second filled or outlined button
  for this action.
- **Busy state:** Change the label to a present participle, such as "Creating…" or
  "Adding…". Keep the button disabled until the resulting page has loaded.

### Inputs and fields

- **Style:** Use the surface background, a 1px border, an 8px radius, and 8px by 12px padding.
- **Width:** Set a maximum width based on the expected value. Use 24ch for a code, date, or
  formula. Use 44ch for a name. A line of prose may use the full column. On a narrower screen,
  the control uses the available width.
- **Label group:** Use a 14px medium label and optional 14px helper text in Muted Foreground.
  Place the control 8px below this text. Use one `<label>` for the group when the HTML
  structure permits it.
- **Focus:** Change the border to the focus role and remove the native outline.
- **Placeholder:** Show a realistic example, such as an order code or formula. Put explanatory
  text in the helper line.
- **Error:** Change the border to Danger. Place a 14px message in the same role 8px below the
  control. Give the message `role="alert"`. Set `aria-invalid` on the control and connect the
  message with `aria-describedby`. Keep the label and helper text unchanged.
- **Choice:** Use visible radio buttons when the answer determines the type of record. Place a
  description beside each option. Use a fieldset with a legend styled as a field label. Use a
  select for a long list of equivalent choices, such as manufacturers.

### Field width

A control should match the expected length of its value. For example, an order code does not
need the width used for a paragraph. The width helps the user understand what type of value
the field accepts.

### Validation messages

Place a validation message below the relevant control. When several controls are invalid,
report all of them in their page order. This allows the user to correct them in one attempt.
Show at most one message for each control. Apply the validation rules in order and show the
first applicable message.

### Badges

- **Style:** Use 12px medium text, a 6px radius, a tinted background, and text from the
  corresponding semantic role.
- **Use:** Show a classification that belongs to the record. For example, an inventory badge
  can identify a rig with a P&ID or a standalone equipment item.

### Cards and containers

- **Corner radius:** 8px.
- **Background:** Surface.
- **Shadow:** Apply a shadow only to the large-screen content card.
- **Border:** Use a 1px border.
- **Internal padding:** Use 40px at the `lg` breakpoint and above. Use 24px below it.

### Navigation

- **Sidebar item:** Use 14px medium text, an 8px radius, and 8px padding. Separate the icon and
  label by 12px. The current item uses the muted surface and a darker icon. Its text weight and
  color remain unchanged.
- **Tree:** Indent nested navigation and use smaller text. The sidebar can be resized because
  labels such as batch names and product codes can be long.
- **Mobile:** Replace the sidebar with a slide-over. Show the page title in a compact navigation
  bar.

### Lists

When a list has groups, use the same hierarchy in the list and the sidebar. The inventory
provides an example: buildings contain rooms. Because the group already identifies the place,
each row contains the record name, its position within the room, and its classification. A
list without this hierarchy remains flat. For example, the batch list is ordered by date.

- **Building heading:** Place a 14px semibold heading with the building icon above the card.
  Use one card for each building.
- **Room heading:** Use a full-width muted surface at the start of the group. Show 14px medium
  text in Muted Foreground and place the add control at the right. Omit the heading when it has
  no room name and no control.
- **Row:** Show the icon, name, position in the room, and classification badge. Link the row to
  the record and use the muted surface on hover.

### Empty states

An empty section and an empty repository require different information.

- **Empty section:** Show one sentence in Muted Foreground. For example, use "No products yet."
  or "No batches have been recorded yet." The sentence reports the state without adding
  instructions that the page does not require.
- **Empty repository:** The Inventory page is the first page shown for a repository. A new
  research group may need an explanation when it contains no records. Show a bordered panel
  that explains rigs and standalone equipment. Provide one primary action and one text link.

Use the explanatory panel only for the empty repository and the guided catalog creation page.
Other empty sections use one sentence.

### P&ID diagrams

P&ID diagrams use line drawings on a light surface in both themes. Process lines use 1.5px
strokes, while details use 1px strokes. Both use
`vector-effect: non-scaling-stroke`. A selected symbol has an accent outline with a 3px
offset. Its fill does not change.

### Reuse of P&ID symbols

Illustrations use the symbol set in `app/components/pid-symbols/`. This set contains 45
symbols and is also used by the P&ID editor. Reusing it keeps the geometry consistent between
illustrations and diagrams.

`app/components/RigSchematic.tsx` provides an example. It places a gas bottle, control
valve, furnace, and vent on a process line. The illustration reuses the geometry from the
symbol set. Its symbols have no fill because the shared symbol class otherwise uses the
diagram surface. The illustration uses a semantic color role at reduced opacity so it has
similar contrast in both themes.

### Create controls within groups

Place a create control in the group that will contain the new record. Include the group
identifier in the link to the form. For example, an add control in Room 101 opens the form
with the building and room already selected through query parameters. The user does not need
to enter information that the selected group already provides.

The create control does not specify the record type because the form asks for that information
first. A separate control in the page heading creates a record that does not yet belong to a
group.

### Vendored Catalyst components

The project stores the Catalyst Tailwind template in `vendor/catalyst-ui-kit/`. This
directory is the unchanged reference version. When an application component needs different
behavior or semantic colors, copy the component into `app/` and edit the copy. Preserve the
component structure, spacing, and Headless UI integration where they meet the requirements.
Replace palette colors and `dark:` classes with Adacta color roles.

`app/layout/SidebarLayout.tsx` provides an example. It began as the 82-line vendored
`sidebar-layout.tsx`. The application copy uses semantic roles and adds the resizable
sidebar.

## Implementation guidance

### Use

- Use a semantic color role such as `bg-surface` or `text-foreground-muted`. If the
  required role does not exist, add it to `theme.css` with light and dark values.
- Use the border role to separate components within the page.
- Use an 8px radius by default and 14px text for application controls.
- Pair a filled primary button with a plain text link.
- Put a realistic example in a placeholder. Put the explanation in the helper text.
- Describe an empty section with one muted sentence.
- Copy a Catalyst component into `app/` when it requires changes. Convert its palette colors
  to semantic roles in the application copy.

### Avoid

- Do not add palette colors or `dark:` classes to an Adacta component. The vendored Catalyst
  components use them because they remain unchanged.
- Do not edit files under `vendor/`. Copy the required component into `app/`.
- Do not add another accent hue. Use status colors only for status information.
- Do not add a shadow to a component in the normal document flow.
- Do not add another typeface.
- Do not use color, heavier text, or an accent border to identify the current navigation item.
  Use the muted surface and darker icon.
- Do not add text below a page title when it only repeats the title. Add text when it provides
  information that the title and page content cannot provide. For example, a batch page may
  explain what a batch represents.
- Do not use an illustrated panel or a multistep guide for an ordinary empty section. Reserve
  explanatory panels for the guided catalog creation page and the empty repository.
