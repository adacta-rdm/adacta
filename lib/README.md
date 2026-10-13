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

| Path                 | Purpose                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `env/`               | Reads environment values as typed values.                                                 |
| `form-values/`       | Reads submitted form fields as typed values.                                              |
| `id53/`              | Generates and reads 53-bit IDs that increase within a sequence.                           |
| `logger/`            | Writes structured log messages to a stream.                                               |
| `parallel-lines/`    | Turns a route of right-angled segments into parallel lines.                               |
| `service-container/` | Resolves services and provides independently configurable scopes.                         |
| `sqlite-errors/`     | Translates the unique-constraint failures of any SQLite driver into one error class.      |
| `storage-engine/`    | The common interface for storing files as streams. A runtime provides the implementation. |
| `tsrc/`              | Generates runtime validators from TypeScript declarations.                                |

Tests live beside the source. Each module's public API and tests are meaningful
without knowledge of the Adacta application.
