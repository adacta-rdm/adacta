# Seed presets

`bun run db:setup [preset]` resets the application database and loads one
directory under `presets/`. The default preset is `demo`. User records come
from `users/`. The development user is recorded as the creator of seeded
catalog records and image files.

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

`__tests__/seedCatalog.test.ts` tests the catalog import. `seedCatalog` takes
the catalog directory as an argument. A test therefore writes its catalog to a
temporary directory instead of adding a preset.

Command-line validation and database-reset tests remain in
`scripts/__tests__/db.test.ts`.
