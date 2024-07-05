For introductory information, including terminology, please see the [Welcome](/doc/WELCOME) documentation.

# Timeline

The Adacta `Timeline` appears when the `Show` link is clicked in the [Devices View](/doc/DEVICES) or [Samples View](/doc/SAMPLES).

The `Timeline` for `Samples` contains only the Timeline chart. The `Timeline` for `Devices` also includes `Components` and `Setup` sections.

## Timeline element

![alt-text](docs/images/Timeline.png)

`Devices` are shown with green bars; `Samples` with yellow bars; and `Resources` with light red bars.

Double clicking on an item the Timeline will zoom in and center around that item. To zoom, press the ctrl key and scroll with your scroll wheel or scroll gesture. To move the viewport, use the scroll wheel or scroll gestures. Alternatively, the view window can also be moved by dragging the mouse on the Timeline.

Click on an item in the Timeline to make it the "Selected Item," and see more information about it.

![alt-text](docs/images/Timeline-Device-SelectedItem.png)

If the `Selected Item` is clicked, the [Devices View](/doc/DEVICES) or [Samples View](/doc/SAMPLES) will open (depending on whether the `Selected Item` is a `Device` or `Sample`), allowing one to drill down for additional information about the `Selected Item`.

Pressing the 'Edit Usage' button allows one to edit the installation details of the "Selected Item" while inspecting the timeline of a parent Device. Specifically, the 'Edit Usage' feature allows the selected `Component` to be exchanged with another `Component`, or to change the date of the `Component's` installation or removal from the selected `Device's` slot.

![alt-text](docs/images/Devices-Components-Edit.png)

Finally, to rescale the Timeline, select the "gear" icon.

![alt-text](docs/images/Timeline-Rescale.png)

## Components

Shows all the `Components` of the current `Device`. The tags can be used to identify components in the Setup, described below.

![alt-text](docs/images/Devices-Components.png)

From the `Components` view, a [Timeline](/doc/TIMELINE) conveniently shows how the `Device` (i.e., equipment) is configured in experimental configurations over time. For example, a controlled evaporator mixer (CEM) designated CEM W-202A is associated with `Components` MFC F-200CV and LC L13V12. Also, the Timeline shows that CEM W-202A is `used` in the NSC Setup experimental system (seen under `Usages`, which was used to test multiple `Samples` over time.

Next to each component is a red minus-in-circle icon, which allows a `Component` to be deleted. If this icon is selected, a dialogue box opens and the `Component` can be deleted.

![alt-text](docs/images/Devices-Components-Remove.png)

To the right of the red minus-in-circle icon is a red editing icon, which allows one to enter the 'Edit Usage' mode, as described in the Timeline 'Selected Item' description, above.

At the bottom of the components list, the green "plus-in-circle" icon allows the addition of new `Components` under the selected `Device`.

![alt-text](docs/images/Devices-Components-Add.png)

More information about the `Devices View` is found in the [Devices View](/doc/DEVICES) documentation.

## Setup

Optionally, an image (such as a block flow diagram or flowsheet) can be uploaded to show the configuration of a device. If the mouse is hovered over a tag, more information about the device is displayed.

![alt-text](docs/images/Devices-Setup.png)

The image can be edited to add tags to different `Components` so that it is easy to visualize the connections between `Devices`.

Note that if a new Setup diagram is added, it must be an image file (i.e., JPEG, PNG, or GIF).

![alt-text](docs/images/Devices-Setup-Edit.png)
