For introductory information, including terminology, please see the [Welcome](/doc/WELCOME) documentation.

# Resources View

![alt-text](docs/images/Resources.png)

The `Resources` view lists the Name, Device, Creation Date, Creator, and Preview. Under Actions, if `Show` is selected, the raw data table that comprises the `Resource` is displayed:

![alt-text](docs/images/Resources-Show.png)

If the `Creator` name is clicked, user information about the person who created this `Resource` is displayed.

## Adding a new Resource

A resource is added to a `Device`. Typically the highest level `Device` (that is a not a `Component` of any other device), like a test stand, is selected for adding a `Resource`. For example, to add a `Resource` to the `NSC` test stand,

1. Click on the search icon and type "NSC"

![alt-text](docs/images/ResourceAdd-Step1.png)

2. Select `NSC Setup` from the list. Then, at the `Device NSC Setup` page click `Add Resources`

![alt-text](docs/images/ResourceAdd-Step2.png)

![alt-text](docs/images/ResourceAdd-Step3.png)

3. Find `headOfOriginal.tsv` (small example file) in `src/services/fixtures/resources` and drag the file to Lexman.

![alt-text](docs/images/ResourceAdd-Step4.png)

## Resource import process - using saved presets

1. If there is a saved preset that includes all of the devices in the imported data, then resource import is fairly automatic. To load a saved present, press the file load button to the right of the "My Preset" accordion menu.

![alt-text](docs/images/ResourceAdd-Step5.png)

2. Now that presets are successfully loaded, the resource import process is automatic (since all of the Devices are included in the saved preset)

![alt-text](docs/images/ResourceAdd-Step6.png)

3. New devices are automatically fitted. Hit `Import` to finish the import process.

![alt-text](docs/images/ResourceAdd-Step7.png)

4. Now that the import is completed, return to the `Resources` view to see the newly imported resource.

![alt-text](docs/images/ResourceAdd-Step8.png)

![alt-text](docs/images/ResourceAdd-Step9.png)

## Resource import process - Without saved presets

1. Select columns (multiple selections possible with ctrl-click or shift-click)

2. Define the units of the selected columns by typing them. Common patterns are recognized. The unit information is used to provide suggestions for further user input.

3. If applicable, specify further information to add context to the data in the selected columns. For example, data with units "mol" or "kg" could also contain species information to indicate which species the data in the column refers to.

4. Lastly, specify the device with which the data in the column was recorded. The unit information is again used to provide suggestions of possible devices.

5. Now that the import is completed, return to the `Resources` view to see the newly imported resource.

## Accessing the Import Wizard after adding a resource

From the `Resources` view, selecting a resource and then pressing the the "Import file" button allows one to revisit the Import Wizard so that any changes necessary changes can be made to the resource import process.
