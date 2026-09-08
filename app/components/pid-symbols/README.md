# P&ID symbols

This directory contains the symbols used in process and instrumentation
diagrams. Each symbol file keeps its SVG drawing and connection points together.

The plain component renders only the symbol. The connectable component adds the
interactive handles used by the diagram editor. Shared components provide
consistent sizing, rotation, and handle behavior.

The drawings were prepared with SVGO before being copied into these components.
The original SVG files remain in `vendor/pid-symbols/` as references.
