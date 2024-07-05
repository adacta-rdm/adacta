/**
 * Represents a key/value pair on the related `IDeviceDefinitionDocument`/`IDeviceDocument`.
 * Specifications are common to all devices of the `IDeviceDefinitionDocument`.
 * Examples include manufacturer, model number, pressure range, or any other property that will
 * never change. Currently, only string-based values are supported.
 */
export interface ISpecification {
	/**
	 * The name of the specification, i.e. the "key" part of the "key/value" pair. Must be unique
	 * among all `ISpecification`s belonging to the same
	 * `IDeviceDefinitionDocument`/`IDeviceDocument`.
	 */
	name: string;

	/**
	 * Text-based value of the specification.
	 */
	value: string;
}
