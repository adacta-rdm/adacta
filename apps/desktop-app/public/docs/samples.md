For introductory information, including terminology, please see the [Welcome](/doc/WELCOME) documentation.

# Samples View

![alt-text](docs/images/Samples.png)

All the available `Samples` are listed in this view. The `Sample` name, Creator, current installation location, and `Show` links are displayed. If the Creator link is selected, the information about this `User` is displayed. The `Currently Installed in` link allows one to visit the [Devices View](/doc/DEVICES) for the object in which the sample is contained. If the mouse is placed over the `Device` name, then information about the containing `Device` is shown in a pop-up window, as seen below.

![alt-text](docs/images/Samples-CurrentlyInstalled-MouseOver.png)

## Adding a new Sample

To add a sample, press the "Add Sample" button and provide the name of the sample. The new sample will appear in the Sample list (but without a current installation location)

![alt-text](docs/images/Samples-AddASample.png)

## Samples `Show` Link

If the `Show` link is selected in the `Samples` view, the `Timeline` and additional details about the `Sample` of interest appears.

### Timeline tab

When the `Show` link is selected for a particular sample, a timeline conveniently shows how the selected `Sample` (e.g., catalyst) is used in different components (e.g., different tubes) over time. For example, when `Show` is depressed next to `Sample` `PL-Pd-Pt-CZ`, the timeline reveals that it was utilized in `Quartz tube 4`.

![alt-text](docs/images/Samples-Show-Timeline.png)

From this [Timeline](/doc/TIMELINE), if the timeline is selected (single left mouse button click on the green timeline bar),`Selected Item` information about the Device containing the `Sample` appears beneath the timeline. Then, from this `Selected Item` view, additional information about the Device containing the sample (in this case, `Quartz tube 4`) can be found by mousing over the Device name underneath the `Selected Item` field. Also, clicking on `Quartz Tube 4` transitions the browser to the `Device` information for `Quartz Tube 4` (e.g., the same page that would be viewed if one selected `Views`, then `Devices`, and then `Quartz Tube 4`).

In short, the timeline helps visualize when `Samples` were in use, and the `Selected Item` frame allows the user to "drill down" and follow connections between `Samples` and `Devices` (including all of the various `components` that comprise the `Device`).

For more information, see the [Timeline](/doc/TIMELINE) documentation.

### Data tab

![alt-text](docs/images/Samples-Data.png)

The `Resources` (i.e., Data) associated with the `Sample` are shown in the `Data` tab. The various `Devices` associated with a `Sample` are listed here, with a preview of the data plotted to the right side of the frame. Clicking on the `Device` name or the `Creator` name will lead to the associated entry in the `Device` and `Users` view (respectively). Clicking on the `Show` link next to the Data preview leads to a new screen with the Device, Time of Recording, Sample (`Derived From`) and an expanded plot.

![alt-text](docs/images/Samples-Data-Show.png)

### Activity tab

![alt-text](docs/images/Samples-Activity.png)

The `Devices` into which the `Sample` is installed are listed in this view. Clicking on the `Device` name opens information on this object in [Devices View](/doc/DEVICES).
