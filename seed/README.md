# Seed presets

`bun run seed:load [preset]` deletes the local data and loads one directory
under `presets/`. The default preset is `demo`. User records come
from `users/`. The development user is recorded as the creator of seeded
catalog records and image files.

## Inventory

Each file in `presets/<preset>/inventory/` describes a rig or equipment unit.
Its `kind` selects the table. A rig supplies its own `name`. Equipment has
no name field and requires a `product` key. Its product supplies its name.
The rig or product name supplies the URL slug. Rigs use
`/inventory/rigs/<slug>` and equipment uses `/inventory/equipment/<slug>`.
The seed chooses slugs within each kind. A rig and an equipment unit may share
a slug. The record and its slug are written in one batch.

The optional `location` object uses `building`, `room`, and `position`:

```json
{ "location": { "building": "B3", "room": "101", "position": "Bench 2" } }
```

Building and room names are text because they can contain letters and numbers,
such as "B3" and "101a". The optional `position` describes a place within the
room, for example "Bench 2" or "Cabinet A". An entry without a fixed place
omits `location`.

Equipment names a product by its manufacturer directory and product filename:

```json
{ "product": "mettler-toledo/xs205" }
```

The catalog loads before the inventory. An unknown product stops the seed.
The demo analytical balance links to the Mettler Toledo XS205 product.
The spare controller uses the DFC-100 product. The demo Micro GC 490 and the
pilot Gas Chromatograph 8890 use products under Agilent Technologies.
New catalog products may contain only a name and product number. Their
subtitle, specifications, channels, and images are optional.

## Catalog channels and specifications

A channel may name a `quantityKind`, for example `"VolumeFlowRate"` for a
flow measurement or setpoint. A specification line may use the same key:

```json
{ "name": "Maximum inlet pressure", "value": "10 bar", "quantityKind": "Pressure" }
```

The key is optional. For example, a seal material has only a name and value:

```json
{ "name": "Seal material", "value": "FKM" }
```

Each `quantityKind` must be a key of `QUANTITY_KINDS` in
`app/lib/quantities.ts`. An unknown kind stops the seed. For a specification,
the error names the product, the line, and the kind. It directs the author to
add the kind to `app/lib/quantities.ts`. A line without the key stores no
quantity kind. Both product specifications and specifications under a
series' `shared` field support this key.

## Catalog images

Each catalog manufacturer has a directory with `manufacturer.json`, optional
`products/` and `series/` directories, and its image files. The JSON fields
`logo` and `image` name paths relative to the manufacturer directory:

```json
{ "name": "Adacta Demo Instruments", "logo": "images/manufacturer-logo.svg" }
```

A product can name its own image. A series can name an image under `shared`.
The product's own image takes precedence over the shared image.

`seedCatalog` stores referenced images through `UploadManager`. Paths are
normalized and imported once per manufacturer. For example, products naming
`images/controller.webp` and `./images/controller.webp` share one file ID.
All images of a manufacturer share one upload ID. Different manufacturers
receive separate uploads, even when their image bytes are equal.

The original file name is the last segment of the path. The extension sets
the media type. Extension matching ignores case.

| Extensions      | Media type      |
| --------------- | --------------- |
| `.png`          | `image/png`     |
| `.jpg`, `.jpeg` | `image/jpeg`    |
| `.webp`         | `image/webp`    |
| `.gif`          | `image/gif`     |
| `.svg`          | `image/svg+xml` |

An unsupported extension or a missing referenced file stops the seed. The
error names the image path and the JSON record that refers to it. Image
references are checked before any bytes for that manufacturer are staged.
Files that no JSON record names are not imported.

The database stores `Manufacturer.logoFileId` and `Product.imageFileId` as
references to `OriginalFile.id`. The application serves the bytes through
`/files/originals/<file id>`. This route requires a signed-in user and sends
`Cache-Control: private, max-age=31536000, immutable`.

The demo preset includes a drawn SVG logo and a generated photograph of a
fictional flow controller. Each image is under 20 KB.

## Tests

`__tests__/seedPID.test.ts` checks that `seedPID` resolves equipment links by inventory filename key.
It uses a temporary diagram.
A diagram node can set `equipment` to the filename of an equipment inventory item without `.json`.
For example, `"equipment": "pressure-sensor"` links a symbol to `inventory/pressure-sensor.json`.
