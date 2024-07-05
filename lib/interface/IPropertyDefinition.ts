export interface IPropertyDefinition {
	/**
	 * The name of the property. Must be unique among all `IDeviceDefinitionDocument`s belonging to
	 * the same `DeviceDefinition`.
	 */
	name: string;

	/**
	 * This defines what type the property has. When new `IPropertyDocument` objects are created, the
	 * type defined here is set on the created property.
	 */
	type: "Device" | "Sample";
}
