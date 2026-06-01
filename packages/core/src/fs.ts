import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fg from "fast-glob";
import type { ContractSpec, LoadedProject, RelayConfig, ScenarioSpec } from "./types.js";

async function readJson<T>(file: string): Promise<T> {
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

export async function loadProject(rootDir: string): Promise<LoadedProject> {
  const config = await readJson<RelayConfig>(join(rootDir, "sapmock.config.json"));
  const contractFiles = await fg("contracts/**/*.json", { cwd: rootDir, absolute: true });
  const scenarioFiles = await fg("scenarios/**/*.json", { cwd: rootDir, absolute: true });

  const contracts = await Promise.all(contractFiles.sort().map((file) => readJson<ContractSpec>(file)));
  const scenarioGroups = await Promise.all(
    scenarioFiles.sort().map((file) => readJson<ScenarioSpec | ScenarioSpec[]>(file)),
  );
  const scenarios = scenarioGroups.flatMap((group) => (Array.isArray(group) ? group : [group]));

  return { rootDir, config, contracts, scenarios };
}

