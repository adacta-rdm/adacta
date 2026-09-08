# P&ID symbols

This directory contains the symbols used in process and instrumentation
diagrams. Each symbol file keeps its SVG drawing and connection points together.

The plain component renders only the symbol. The connectable component adds the
interactive handles used by the diagram editor. Shared components provide
consistent sizing, rotation, and handle behavior.

The drawings were prepared with SVGO before being copied into these components.
The original SVG files remain in `vendor/pid-symbols/` as references.

Normalized drawings use the `pid-symbol-drawing` class. It supplies the fill,
color, line width, caps, and joins. The `--pid-line-width` property is also used
by process lines, so their visible weights remain equal. Individual paths keep
only their geometry.

The SVGO configuration in `scripts/pid-symbols/` removes presentation attributes
and flattens transforms. Its output is reviewed before the path data is copied
into a symbol component.
