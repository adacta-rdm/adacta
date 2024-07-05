# Basic Navigation

![alt-text](docs/images/Navigation.png)

### Right side of browser window

The `Views` icon (9 dots) on the far right of the browser window allows the user to select between different views:

- [Devices View](/doc/DEVICES)

- [Samples View](/doc/SAMPLES)

- [Resources View](/doc/RESOURCES)

- `Settings`

To the left of the `Views` icon, the user initial is shown. If the user is not logged in, the `User` icon will be shown. Pressing the `User` icon when not logged in will prompt for the username and password.

The search icon allows one to search any `Device`, `Sample`, `Resource`, or `User`.

### Left side of the browser window

The Home icon opens a screen that shows the most recently viewed items. The left and right arrows allow one to move forward and backward in the view screens, in order to facilitate navigation between screens previously viewed.

![alt-text](docs/images/Home-Screen.png)

# First Steps

When you open Adacta the first time, you will be requested to login.

![alt-text](docs/images/Login.png)

If you do not already have login credentials, click on register and follow the steps to obtain a new account.

![alt-text](docs/images/Register.png)

After logging in, a welcome screen with a search bar appears. At this point, there is no data yet. To get started quickly, you may load a preconfigured set of data by configuring a remote. A remote is a server that you can either manually pull from or Adacta can keep your local data in sync with. If you choose to sync, any data that you add locally will be pushed back to the remote. If other users push data to the same remote, then that data will also eventually be downloaded to your locally running Adacta instance. Keep this in mind when entering sensitive data.

The `Views` icon (9 dots) on the far right of the window allows you to select between different views.

![alt-text](docs/images/Navigation.png)

Click settings where you can configure remotes.

![alt-text](docs/images/Settings.png)

Add a new remote by entering `repo.adacta.software/adacta` in the URL field and choose a name for the remote, for example “ITCP Test”. Click “Add remote” when you are finished. The remote appears in the list with sync turned off by default. Turn sync on by flipping the “Keep in sync” switch and a status bar indicating the progress of the sync will show on the bottom right of the window. Wait until the initial sync has finished, which may take several minutes depending on your network connection. When the sync has finished the progress bar on the bottom right will disappear.

At this point, you may begin exploring the set of test data by navigation to the appropriate views from the Views icon, or by entering a search query. Try entering “NSC” in the search bar that is accessible from the top navigation bar.

![alt-text](docs/images/SearchNSC.png)

One of the shown search results should be the “NSC Setup”. Navigate to that result by clicking on it.

![alt-text](docs/images/DeviceNSC.png)

The “NSC Setup” acts as a good starting point for exploring the test data as it is linked with several other devices, samples and resources.

# Adacta Terminology

Adacta is a data management system connecting experimental data (called `Resources`) and experimental equipment (called `Devices`) as well as samples under test (called `Samples`).

Because Adacta is a general tool for any type of experimental system, the software is designed for flexibility. Hence, some terminology may seem abstract, but the basic principle is that data (called `Resources`) are connected to equipment (called `Devices`). A `Device` may be as large as a test stand or as small as a thermocouple. As such, one `Device` may be comprised of other `Devices`. `Devices` that are components of a "larger" device are called `Components`. As an example, a catalyst test stand (in itself, a `Device`) may be comprised of many pieces of equipment and subsystems that are also `Devices`, called `Components`.

The definitions of common Adacta terminology follow.

### Device

A `device` is a piece of `equipment`, such as a mass flow controller, a tube, or a thermocouple. A `device` has at minimum the following attributes: `manufacturer`, `creator`, and `currently installed in`. These attributes are visible from the `Devices` list. Additional `specifications` are visible when selecting `Show` from the `Devices` list. A `Device` that is the "child" of another (parent) device is called a `Component` (see `Components`).

Why is the term `Device` used instead of `Equipment`? Devices are intended to include a wide range of physical hardware, from a test stand that is filled with `Components` down to the small components like mass flow controllers or thermocouples. Using the term `Device` makes Adacta more universal in its treatment of physical hardware so that the software is applicable to the widest range of applications.

## Device Type

A `Device Type` is a group of Devices with the same specifications. As an example, if there are multiple mass flow controllers (MFCs) of a certain model, only differing in serial #, then the basically identical MFCs are considered to be the same `Device Type.`

### Specification

`Specifications` are attributes of a `device` or a `sample` that **cannot change**, such as the manufacturer of a mass flow controller, the model number of a piece of equipment, etc.

### Usages

The test configurations in which the `Device` is used.

### Component

A `Device` or `Sample` that is linked to another `Device` (e.g., as part of a system) is called a `Component`. As can be seen in the following hierarchy of `Components` found in `Device` "NSC Setup," (below the [Timeline](/doc/TIMELINE)), the test stand is comprised of many `Components` and a `Sample`. One of the `Components`, called "Cem 1", is both a `Component` of "NSC Setup," but "Cem 1" is also comprised of a subsystem of `Components`. These `Components` of "Cem 1" are a Liquid Flow Controller a Mass Flow Controller. Thus, `Components` allow `Devices` to be linked to create subsystems and hierarchies (like a test stand, which is itself a `Device` that is comprised of many `Component` `Devices`, some of which contain `Samples` or subsystems of more `Components`).

![alt-text](docs/images/Components.png)

### Samples

A catalyst or other material that is the focus of the experimental testing. Samples are associated with `Data` (a `Resource`) and are tagged with a `Creator` and the `Currently installed in` location. When `Show` is selected from the `Sample` menu, the associated `Devices`, `Creation Dates`, `Creators`, and `Resource` filenames are listed.

### Resources

A piece of data that is the input or output of a `transformation`. Resources include tabulated data and pictures. A common `resource` is a csv or tsv data table that is obtained from a data acquisition system, like LabView.

### Transformation

`Transformations` are mathematical calculations that manipulate `resources` or other data stored in the database. Since `resources` include data, `Transformations` include calculations involving data (e.g., the conversion of volumetric flow rate at standard conditions to actual velocity), and the output of a `transformation` is a new `resource`.
