# What is it

The library crawls through given src files and creates descriptive JSON file for each component. The JSON file contains information about component's properties, interfaces and dependencies (other components).

# How to

In `read-folder.js` file there are 2 constants to setup:

    const from = "path to src folder of your projet";
    const target = "path where the json files will be generated (must exist)";

After setting up the folders, you can simply execute

    node read-folder.js
    
# JSON files

    {
      "name": "component name",
      "description": {
        "cs": "component description",
        "en": "in languages"
      },
      "file": "component file",
      "lessFile": "used less file",
      "lsiFile": "used lsi file",
      "pageCode": "page code in uuBookKit",
      "mixins": [
        "list of mixins of the component"
      ],
      "statics": "copy of the statics part of the component",
      "propTypes": {
        "key": "...description of propTypes"
      },
      "interface": {
        "key": "...description of interface methods"
      },
      "dependencies": {
        "filePath": "path to a file the component is importing"
      }
    }

# TODO

The library has a long way to go, this is kind of initial version.
* Better handling of propTypes, especially combined types.
* HoC, contexts
* handler methods
* and the rest what is missing :)
