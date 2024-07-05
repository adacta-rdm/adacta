#!/bin/bash
set -euf -o pipefail

# Unstage everything so only the built files are added to the commit
git reset HEAD

# Repoint the build branch to the current commit and checkout that branch
git branch --force build/auth-server
git checkout build/auth-server

# Add the built files even though they are in the .gitignore
git add -f apps/auth-server/packages

git commit -m "$(date +%F) auth-server $(git rev-parse --short HEAD)"

git push -f origin build/auth-server
