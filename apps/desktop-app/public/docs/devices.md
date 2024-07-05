For introductory information, including terminology, please see the [Welcome](/doc/WELCOME) documentation.

# Device View

From the `Device` view, all of the devices in the database are listed. The `Devices` are by default shown in ascending alphabetical order, but can be sorted in ascending or descending alphabetical order by selecting the `sort direction arrow` at the top of the Name column.

If the "Show only root devices" switch is enabled, only devices that are not used in other devices, but are composed of other sub-components, are displayed. Showing only root devices is helpful to get a quick overview of the most important devices.

In the `Device` view, the following fields are displayed:

- Name (with photograph)

- Manufacturer

- Currently installed location

- Show (additional information)

To add a new device, press the "Add Device" button and provide the name of the Device, and select the Device Type from the pulldown list. The new device will appear in the Device list (but without an installation location).

Tip: When entering the name of a device, add a unique identifier that will make it easier to identify in Adacta menus and displays. For example, if there are two MFC ABC-100 mass flow controllers, consider naming the first device `MFC ABC-100 1` and the second device `MFC ABC-100 2`.

![alt-text](docs/images/Devices-AddADevice.png)

In the event the new Device is also a new Device Type (e.g., adding a new type of flow controller that does not already exist in the Adacta database), first the new Device Type must be setup before adding the new Device. In this case, firstly press the `Add Device Type` button. Then, in the Add Device-Type dialogue box enter the Device Type Name. Next, if the new Device is a Sub-type of an other Device Type (so the same specifications can be inherited), select the appropriate Subtype from the pulldown menu. The specifications associated with the Subtype can be edited via the `Edit Type` link. If the new Device Type is not a Subtype of another Device Type, select `No Device-Type` from the Sub-type menu. In either case, new specifications can be added by first pressing the `+` symbol under the specifications section of the menu. A new Specification field (key) can be typed into the `Key` field, with the value for this key in the `Value` field. If this Device Type can record data, then switch `Record data` to on, and select all the units that this Device Type can record from the pulldown menu.

![alt-text](docs/images/Devices-AddADeviceType.png)

The following describes the information displayed and the actions available when selecting `Show`.

# Device `Show` View

If the `Edit Images` link is selected, then it is possible to add more images, and select which saved image is to be the primary image (i.e., displayed in thumbnails in various views within Adacta).

![alt-text](docs/images/Device-Image-Edit.png)

Information about the Device Type (such as: manufacturer, model, modelNumber, and so on) can be edited by clicking the `Edit device type` link. The accepted units of measurement (e.g., volumetric flow, temperature, etc.) are also set here, assuming the Device Type can record data (which can be changed with a switch setting found in this view). Specific information about a specific device unit (e.g., an individual Device's serial number) is stored in the individual Device record.

![alt-text](docs/images/Devices-Edit-Type.png)

## Components

![alt-text](docs/images/Devices-Components.png)

From the `Components` view, a [Timeline](/doc/TIMELINE) conveniently shows how the `Device` (i.e., equipment) is configured in experimental configurations over time. For example, a controlled evaporator mixer (CEM) designated CEM W-202A is associated with `Components` MFC F-200CV and LC L13V12. Also, the Timeline shows that CEM W-202A is `used` in the NSC Setup experimental system (seen under `Usages`, which was used to test multiple `Samples` over time.

Next to each component is a red minus-in-circle icon, which allows a `Component` to be deleted. If this icon is selected, a dialogue box opens and the `Component` can be deleted.

![alt-text](docs/images/Devices-Components-Remove.png)

To the right of the red minus-in-circle icon is a red editing icon, which allows the selected `Component` to be exchanged with another `Component`, or to change the date of the `Component's` installation or removal from the selected `Device's` slot.

![alt-text](docs/images/Devices-Components-Edit.png)

At the bottom of the components list, the green "plus-in-circle" icon allows the addition of new `Components` under the selected `Device`.

![alt-text](docs/images/Devices-Components-Add.png)

More information about the `Timeline` is found in the [Timeline](/doc/TIMELINE) documentation.

## Specifications

![alt-text](docs/images/Devices-Specifications.png)

The specifications tab lists the properties of the `Device` that do not change. For this example, `Specifications` include the manufacturer, model, description, model number, flow rate range, and connections.

If there are no `Specifications`, the `Specifications` tab is not displayed.

## Samples

![alt-text](docs/images/Devices-Samples.png)

The `Samples` associated with this `Device` are listed in this view. Selecting a `Sample` will open the [Samples View](/doc/SAMPLES) for the selected object. If no samples are associated with a particular `Device` then the `Samples` tab is not displayed.

When a `Sample` name is clicked, the [Timeline](/doc/TIMELINE) conveniently shows how the selected `Sample` (e.g., catalyst) is used in different components (e.g., different tubes) over time.

![alt-text](docs/images/Samples-Show-Timeline.png)

From this Timeline chart, if the Timeline is selected (single left mouse button click on the green Timeline bar),`Selected Item` information about the Device containing the `Sample` appears beneath the Timeline. Then, from this `Selected Item` view, additional information about the Device containing the sample (in this case, `Quartz tube 4`) can be found by mousing over the Device name underneath the `Selected Item` field. Also, clicking on `Quartz Tube 4` transitions the browser to the `Device` information for `Quartz Tube 4` (e.g., the same page that would be viewed if one selected `Views`, then `Devices`, and then `Quartz Tube 4`).

In short, the Timeline helps visualize when `Devices` were in use, and the `Selected Item` frame allows the user to "drill down" and follow connections between `Samples` and `Devices` (including all of the various `components` that comprise the `Device`).

## History

![alt-text](docs/images/Devices-Activity.png)

The timestamps for when the present `Device` becomes associated with `Usages` and `Components` are listed in this view.
