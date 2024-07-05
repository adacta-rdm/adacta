#!/bin/bash
cd ./apps/desktop-app/src/
rm doc.ts
find . -name "*.ts" | grep -v spec | grep -v rust/pkg | grep -v generated/schema | grep -v 'graphql.ts' |
while read -r line
do
	file=$(echo $line | sed 's/\.ts//g')
	echo "export * from '$file'" >> doc.ts
done
