# Name Compositions

In order to find your way around a large database of devices and samples, it is important that you can immediately make sense of the name displayed.
To simplify systematic naming, there are name compositions that allow dynamic information to be incorporated directly into the title.
For MFCs, for example, the maximum flow rate from the specifications can also be displayed as part of the name

## Variables

Variables in the context of name compositions always reference a specification from devices/samples.
All variables have a name, which is only used to identify the variable and can be freely selected (e.g. serial number)
The most important part of the variable are the aliases, here you can configure which specifications are used to determine this value (e.g. serialNumber, serialNo, serial).
Several aliases are possible to cover different notations.

Optionally, a prefix/suffix can also be configured for the variable.
If a variable has a value for a device/sample, this value is displayed, followed by the prefix and then the suffix.

The prefix, suffix and value are only displayed if the value of the variable can be determined.
If a device does not have a corresponding specification, nothing is displayed.

## Constants

Constants can be used to add static text to the name (for example spaces/hyphens or other words/abbreviations).
Constants can be used like variables. They have a name and optionally a value.
If no value is specified, the name is used as the value.
This can be useful if you to have a meaningful name (like "Space") for the space (" ") constant.
