# Documentation for the `package.json` file

This file is to document, among other things:

- why entries in the [resolutions](https://yarnpkg.com/configuration/manifest/#resolutions) part of the package.json are
  necessary
- what the yarn patches are necessary for

## Resolutions

- `vis-data`: Required by `react-vis-timeline`. Otherwise, a required type would be missing or not exported (
  see [react-vis-timeline #14](https://github.com/razbensimon/react-vis-timeline/issues/14))
- `relay-test-utils`: Required by `use-relay-mock-environment`. (
  see [use-relay-mock-environmen #5](https://github.com/richardguerre/use-relay-mock-environment/issues/5#issuecomment-1031503635))

## Patches

## Miscellaneous notes
