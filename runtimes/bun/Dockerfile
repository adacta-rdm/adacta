# Builds an image that serves Adacta with the Bun runtime. Run it from the
# project root, which is the build context:
#
#   docker build -f runtimes/bun/Dockerfile .
#
# The image runs "bun run start". That command applies pending migrations
# before it serves the build. It therefore needs the scripts, the runtime, the
# migrations and the modules they import, besides the build itself.

FROM oven/bun:1 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
CMD ["bun", "run", "start"]
