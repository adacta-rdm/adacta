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
only their geometry. Secondary construction details use the
`pid-symbol-detail` class and `--pid-detail-line-width`.

The shared SVG surface displays strokes outside the view box. SVG centers a
stroke on its path, so this keeps an outline at the boundary complete.

The SVGO configuration in `scripts/pid-symbols/` removes presentation attributes
and flattens transforms. Its output is reviewed before the path data is copied
into a symbol component.

Valve drawings use a `0 0 32 32` view box. Their geometry keeps its original
proportions inside this shared coordinate system. The square also gives every
valve the same node bounds when it is rotated.

Circular bodies use a 40-unit diameter. This group includes circular heat
exchangers, pumps, compressors, fans, and the steam trap. Lines and other details
may extend outside the body, so the complete view box can be larger. The
displayed body size still follows the role of the symbol in the diagram.

Non-circular heat exchanger bodies use 40 units for their longest dimension.
Connection stubs may extend beyond that body. Finer lines inside the exchanger
use the shared detail weight.

Major equipment uses 56 units for its long axis. Related horizontal and vertical
symbols therefore retain the same scale when they are rotated.

Compact symbols use 40 units for their long axis unless a distinct body defines
their scale. Inline fittings use 32 units. This keeps symbols in the same
footprint group comparable without changing their proportions.
