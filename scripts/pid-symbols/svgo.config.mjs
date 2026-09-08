/**
 * Prepares an original P&ID symbol for normalization in its React component.
 *
 * Presentation attributes are removed before path transforms are applied. This
 * lets SVGO flatten transforms that previously changed the apparent line width.
 * The original file remains in vendor/pid-symbols/ as a reference.
 */
export default {
	multipass: true,
	js2svg: {
		pretty: true,
		indent: 2,
	},
	plugins: [
		"convertStyleToAttrs",
		{
			name: "removeAttrs",
			params: {
				attrs: ".*:(style|color|display|overflow|visibility|opacity|fill.*|stroke.*|marker.*)",
			},
		},
		{
			name: "preset-default",
			params: {
				overrides: {
					convertShapeToPath: {
						convertArcs: true,
						floatPrecision: 3,
					},
					convertPathData: {
						applyTransforms: true,
						applyTransformsStroked: true,
						floatPrecision: 3,
					},
					mergePaths: false,
				},
			},
		},
	],
};
