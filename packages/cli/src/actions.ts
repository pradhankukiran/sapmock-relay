import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer } from "@sapmock/api";
import { buildRelayResponse, loadProject, matchContract, pickScenario, verifyProject } from "@sapmock/core";
import {
  abapHelperTemplate,
  configTemplate,
  poContractTemplate,
  qmContractTemplate,
  scenarioTemplate,
} from "./templates.js";

export async function initProject(targetDir: string): Promise<string[]> {
  const root = resolve(targetDir);
  await mkdir(join(root, "contracts"), { recursive: true });
  await mkdir(join(root, "scenarios"), { recursive: true });
  await mkdir(join(root, "abap"), { recursive: true });

  const written = [
    ["sapmock.config.json", configTemplate(root.split("/").at(-1) ?? "sapmock-project")],
    ["contracts/mm-po-read.json", poContractTemplate],
    ["contracts/qm-notification-read.json", qmContractTemplate],
    ["scenarios/base.json", scenarioTemplate],
    ["abap/zcl_sapmock_bapi_return.clas.abap", abapHelperTemplate("zcl_sapmock_bapi_return").toLowerCase()],
  ] as const;

  for (const [file, content] of written) {
    await writeFile(join(root, file), `${content}\n`, { flag: "wx" });
  }

  return written.map(([file]) => join(root, file));
}

export async function verifyCommand(projectDir: string): Promise<number> {
  const project = await loadProject(resolve(projectDir));
  const result = verifyProject(project);
  console.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : 1;
}

export async function replayCommand(
  projectDir: string,
  method: string,
  path: string,
  scenarioId?: string,
): Promise<number> {
  const project = await loadProject(resolve(projectDir));
  const route = matchContract(project.contracts, method, path);
  if (!route) {
    console.error(`No contract matched ${method.toUpperCase()} ${path}`);
    return 1;
  }
  const scenario = pickScenario(project, route.contract, scenarioId);
  if (!scenario) {
    console.error(`No scenario found for ${route.contract.id}`);
    return 1;
  }
  console.log(JSON.stringify(buildRelayResponse(route.contract, scenario), null, 2));
  return 0;
}

export async function serveCommand(projectDir: string, port: number): Promise<void> {
  const app = await createServer({ projectDir: resolve(projectDir) });
  await app.listen({ port, host: "0.0.0.0" });
}

export async function abapTestDoubleCommand(outFile: string, className: string): Promise<string> {
  const out = resolve(outFile);
  await mkdir(resolve(out, ".."), { recursive: true });
  await writeFile(out, abapHelperTemplate(className), "utf8");
  return out;
}

