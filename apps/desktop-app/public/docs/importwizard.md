## Resource import process - using saved presets

1. If there is a saved preset that includes all of the devices in the imported data, then resource import is fairly automatic. To load a saved present, press the file load button to the right of the "My Preset" accordion menu.

![alt-text](docs/images/ResourceAdd-Step5.png)

2. Now that presets are successfully loaded, the resource import process is automatic (since all of the Devices are included in the saved preset)

![alt-text](docs/images/ResourceAdd-Step6.png)

![alt-text](docs/images/ResourceAdd-Step7.png)

3. New devices are automatically fitted. Hit `Import` to finish the import process. A red progress bar is located at the top of the screen.

![alt-text](docs/images/ResourceAdd-Step8.png)

4. When the import is completed, the device list is shown. Press `Parent` to return to the [Resources](/app/resources) view.

![alt-text](docs/images/ResourceAdd-Step9.png)

## Resource import process - Without saved presets

### Step 1: File Structure

Select important information about the file structure (in particular, the column delimiter, decimal separator, the number of header row, and the first data row)

### Step 2: Column Types

1. For each column, firstly select whether to skip the column, or if the column represents a Number, Date, Time, Date + Time, or an Offset based time. Note that column names must be unique. One possible solution is to configure a header consisting of multiple lines. Another solution is to skip non-unique headers in Step 2.

2. For date and time columns, select the appropriate options to ensure the format is properly captured.

   Some data types may have a normalizer like Euro, or degrees, and so on. If so, the far right Normalizer pull down menu can be used to cut off information in the data sheet after the first space.

   Date and time are likely independent variables, and if so the Independent variable switch should be toggled on in many circumstances. Move through the preview menu column by column until all the data types plus independent and dependent relationships are established (along with any additional steps, like handling Normalizers).

   Number columns can made be Independent if the appropriate switch is set to on. Otherwise, if not an Independent variable, the dependency on the associated independent variable and can be set. If there is only one independent variable, then setting the dependency is optional.

### Step 3: Column metadata

The relationships established in Step 2 (Column types) are now readily visible in the preview menu of the Column metadata step. Independent variables are termed "Xi," and dependent variables are termed "Yj (Xi)" (i.e., Yj is a function of Xi). So "Y4 (X2)" represents the fourth dependent variable that is a function of the second independent variable.

1. Select a dependent variable and the Unit box will appear.Define the units of the selected columns by typing them. Common patterns are recognized, like "kg/hr". The unit information is used to provide suggestions for further user input.

2. Lastly, specify the device with which the data in the column was recorded. The unit information is again used to provide suggestions of possible devices.

### Step 4 : Summary

Now that the import is completed, return to the [Resources](/app/resources) view to see the newly imported resource. It is also possible to dump the presets to a file, to speed up the process for importing tabular data for the same or similar device configuration in the future.

## Resolving issues with Resource import

There are some general guidelines that must be followed to successfully import a resource:

- You need at least one date/time/offset column.
- You should define at least one column which is linked to a device
- You should define at least one independent variable
- Column names must be unique (which can be resolved with multiple header lines that make the header field unique, or skipping columns with duplicate header names).
