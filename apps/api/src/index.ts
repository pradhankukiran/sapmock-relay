import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { createServer } from "./server.js";

const projectDir = process.env.SAPMOCK_PROJECT ? resolveProjectDir(process.env.SAPMOCK_PROJECT) : findDefaultProjectDir();
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

const app = await createServer({ projectDir, recordTarget: process.env.SAPMOCK_RECORD_TARGET });

await app.listen({ port, host });

function findDefaultProjectDir(): string {
  return resolveProjectDir("examples/supplier-portal");
}

function resolveProjectDir(projectPath: string): string {
  const direct = resolve(projectPath);
  if (existsSync(join(direct, "sapmock.config.json"))) {
    return direct;
  }

  let current = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = join(current, projectPath);
    if (existsSync(join(candidate, "sapmock.config.json"))) {
      return candidate;
    }
    current = dirname(current);
  }

  return direct;
}
