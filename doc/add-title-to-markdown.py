#!/bin/env python
# This script is used to add a header in the form of
#
#     ---
#     title: asdf.testMethod() method
#     ---
#
# into each file to have nicer titles in MkDocs
import glob
import os
import re

pages_dir = "pages/api/"
os.chdir(pages_dir)
for name in glob.glob("*.md"):
    with open(name, "r+") as f:
        old = f.read()
        if "title: " in old:
            print(name + "is already patched")
        else:
            print("Setting title for "+name)
            newTitle = re.findall('## (.+)', old)[0]
            if newTitle != "":
                f.seek(0)
                f.write("---\ntitle: " + newTitle + "\n---\n\n" + old)