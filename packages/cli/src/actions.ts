import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createServer } from "@sapmock/api";
import { buildOpenApi, buildRelayResponse, loadProject, matchContract, pickScenario, verifyProject } from "@sapmock/core";
import {
  abapHelperTemplate,
  abapContractTestTemplate,
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

export async function serveCommand(projectDir: string, port: number, recordTarget?: string): Promise<void> {
  const app = await createServer({ projectDir: resolve(projectDir), recordTarget });
  await app.listen({ port, host: "0.0.0.0" });
}

export async function openApiCommand(projectDir: string, outFile?: string): Promise<number> {
  const project = await loadProject(resolve(projectDir));
  const document = JSON.stringify(buildOpenApi(project), null, 2);
  if (outFile) {
    await writeFile(resolve(outFile), `${document}\n`, "utf8");
  } else {
    console.log(document);
  }
  return 0;
}

export async function abapTestDoubleCommand(outFile: string, className: string): Promise<string> {
  const out = resolve(outFile);
  await mkdir(resolve(out, ".."), { recursive: true });
  await writeFile(out, abapHelperTemplate(className), "utf8");
  return out;
}

export async function abapContractTestsCommand(projectDir: string, outDir: string): Promise<string[]> {
  const project = await loadProject(resolve(projectDir));
  const target = resolve(outDir);
  await mkdir(target, { recursive: true });

  const files: string[] = [];
  for (const contract of project.contracts) {
    const scenarios = project.scenarios.filter((scenario) => scenario.contractId === contract.id);
    const generated = abapContractTestTemplate(contract, scenarios);
    const file = join(target, `${generated.className}.clas.testclasses.abap`);
    await writeFile(file, generated.source, "utf8");
    files.push(file);
  }

  return files;
}
