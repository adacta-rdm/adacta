# `lib`

This directory contains project-agnostic modules with clearly separated
concerns. Each direct child has the boundaries needed for use as a standalone
project. This is a design criterion; extraction is optional.

## Dependency boundary

Modules in `lib/` depend only on runtime APIs, third-party packages, and other
modules in `lib/`. They have no dependencies on another top-level directory in
this repository. Application-specific values and collaborators enter through
their public APIs.

## Contents

| Path                 | Purpose                                                           |
| -------------------- | ----------------------------------------------------------------- |
| `env/`               | Reads environment values as typed values.                         |
| `logger/`            | Writes structured log messages to a stream.                       |
| `service-container/` | Resolves services and provides independently configurable scopes. |
| `storage-engine/`    | Stores files as streams behind a common interface.                |

Tests live beside the source. Each module's public API and tests are meaningful
without knowledge of the Adacta application.
