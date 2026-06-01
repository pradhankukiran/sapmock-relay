import { resolve } from "node:path";
import { createServer } from "./server.js";

const projectDir = resolve(process.env.SAPMOCK_PROJECT ?? "examples/supplier-portal");
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

const app = await createServer({ projectDir });

await app.listen({ port, host });

