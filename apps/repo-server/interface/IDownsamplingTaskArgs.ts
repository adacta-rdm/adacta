export interface IDownsamplingTaskArgs {
	input: {
		/**
		 * Passed to the storage engine to determine the location of the resource. This is the repository name.
		 * Workaround, will be removed when the downsampling service gets passed a presigned URL.
		 */
		prefix: string;

		/**
		 * The path to the TabularData resource to downsample.
		 */
		path: string;

		/**
		 * The number of rows in the input resource.
		 */
		numberRows: number;

		/**
		 * The number of columns in the input resource.
		 */
		numberColumns: number;

		/**
		 * The column indices to downsample.
		 */
		columns: { x: number; y: number[] };
	};

	/**
	 * Which threshold to downsample to. In most cases, this number is the number of rows the resulting data will have.
	 * The only exception is when the input data has fewer rows than `threshold`, in which case the resulting data will
	 * have the same number of rows than the input. Consequently, this value gives the guarantee that the resulting data
	 * will contain at most `threshold` rows.
	 */
	threshold: number;
}
