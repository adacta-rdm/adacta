import { prepareImageHTTPEndpoint } from "~/apps/repo-server/src/microservices/prepareImageHTTPEndpoint";
import { createDigitalOceanFunction } from "~/lib/serverless/digitalocean/createDigitalOceanFunction";

export const main = createDigitalOceanFunction(prepareImageHTTPEndpoint);
