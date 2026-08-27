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
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json bun.lock server.ts ./
EXPOSE 3000
CMD ["bun", "run", "start"]
