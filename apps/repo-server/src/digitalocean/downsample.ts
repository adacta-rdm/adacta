import { downsampleHTTPEndpoint } from "../microservices/downsampleHTTPEndpoint";

import { createDigitalOceanFunction } from "~/lib/serverless/digitalocean/createDigitalOceanFunction";

export const main = createDigitalOceanFunction(downsampleHTTPEndpoint);
