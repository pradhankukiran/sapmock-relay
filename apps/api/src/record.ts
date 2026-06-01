import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ContractSpec, ScenarioSpec } from "@sapmock/core";

export interface RecordedScenario {
  scenario: ScenarioSpec;
  body: unknown;
  status: number;
  headers: Record<string, string>;
  file: string;
}

export async function recordScenario(params: {
  projectDir: string;
  targetBaseUrl: string;
  requestUrl: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  requestBody: unknown;
  contract: ContractSpec;
  scenarioId: string;
}): Promise<RecordedScenario> {
  const targetUrl = new URL(params.requestUrl, params.targetBaseUrl);
  targetUrl.searchParams.delete("record");
  targetUrl.searchParams.delete("scenario");

  const response = await fetch(targetUrl, {
    method: params.method,
    headers: proxyHeaders(params.headers, params.requestBody),
    body: params.requestBody === undefined ? undefined : JSON.stringify(params.requestBody),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  const scenario: ScenarioSpec = {
    id: params.scenarioId,
    contractId: params.contract.id,
    name: `Recorded ${params.method.toUpperCase()} ${new URL(params.requestUrl, "http://localhost").pathname}`,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    response: body,
  };

  const dir = join(params.projectDir, "scenarios", "recorded");
  await mkdir(dir, { recursive: true });
  const file = join(dir, `${safeFilePart(params.contract.id)}.${safeFilePart(params.scenarioId)}.json`);
  await writeFile(file, `${JSON.stringify(scenario, null, 2)}\n`, "utf8");

  return {
    scenario,
    body,
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    file,
  };
}

function proxyHeaders(headers: Record<string, string | string[] | undefined>, requestBody: unknown): HeadersInit {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (["host", "content-length", "connection"].includes(lower)) continue;
    if (lower.startsWith("x-sapmock-")) continue;
    if (Array.isArray(value)) {
      result[key] = value.join(",");
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  if (requestBody !== undefined) {
    result["content-type"] = "application/json";
  }

  return result;
}

function safeFilePart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

