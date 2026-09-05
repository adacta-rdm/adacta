# Inter

Version 4.1, from <https://rsms.me/inter/>.

| File                        | What it is                                   |
| --------------------------- | -------------------------------------------- |
| `InterVariable.woff2`       | the upright variable font as published        |
| `InterVariable-latin.woff2` | cut down from it, and the file the app loads  |

The published file is kept so the cut-down one can be made again without
downloading anything. Nothing loads it.

The same place publishes an italic and a file per weight. The application uses
neither. Download `InterVariable-Italic.woff2` and add a second `@font-face`
rule if real italics are ever wanted.

Used under the SIL Open Font License. `LICENSE.txt` comes from the same
distribution.

## How the cut-down file is made

The published font covers Greek, Cyrillic, Vietnamese, and much else, and
carries 22 character variants. The application writes Latin text and uses four
of the variants. Removing the rest takes 344 KB down to 170 KB.

```sh
pyftsubset InterVariable.woff2 \
  --output-file=InterVariable-latin.woff2 \
  --flavor=woff2 \
  --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF" \
  --layout-features+=cv02,cv03,cv04,cv11
```

`pyftsubset` comes from the `fonttools` package. It writes a new file and leaves
the one it reads alone.

The character ranges are the "latin" and "latin-ext" sets Google Fonts uses. A
name such as "Bürkert" therefore renders.

`--layout-features+=` is required. Without it the subsetter drops every
character variant, including the four `app/app.css` selects. Check what survived
after changing the command:

```sh
python3 -c "from fontTools.ttLib import TTFont; f=TTFont('InterVariable-latin.woff2'); \
print(sorted({r.FeatureTag for r in f['GSUB'].table.FeatureList.FeatureRecord}))"
```

Expect `cv02`, `cv03`, `cv04`, and `cv11`. Both axes must also survive: `opsz`
14 to 32 and `wght` 100 to 900.
