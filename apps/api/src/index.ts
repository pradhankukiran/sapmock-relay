import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createServer } from "./server.js";

const projectDir = process.env.SAPMOCK_PROJECT ? resolve(process.env.SAPMOCK_PROJECT) : findDefaultProjectDir();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

const app = await createServer({ projectDir });

await app.listen({ port, host });

function findDefaultProjectDir(): string {
  let current = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(current, "examples", "supplier-portal");
    if (existsSync(join(candidate, "sapmock.config.json"))) {
      return candidate;
    }
    current = dirname(current);
  }
  return resolve("examples/supplier-portal");
}
