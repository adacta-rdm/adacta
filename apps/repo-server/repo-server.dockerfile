# Keep in sync with the version in .github/workflows/ci.yml
FROM node:20.14.0-bullseye-slim

RUN groupadd --gid 2222 adacta \
 && useradd --uid 2222 --gid adacta --shell /bin/bash --create-home adacta

WORKDIR /adacta

RUN chown adacta -R /adacta

COPY --chown=adacta dist/repo-server/* /adacta/

USER adacta

EXPOSE 5000

# Start the server
CMD node main.js
