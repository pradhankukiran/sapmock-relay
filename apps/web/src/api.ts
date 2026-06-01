const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface ProjectSummary {
  config: {
    name: string;
    version: string;
    systems: Array<{ id: string; label: string; basePath: string }>;
  };
  contractCount: number;
  scenarioCount: number;
}

export interface ContractSpec {
  id: string;
  system: string;
  method: string;
  path: string;
  summary: string;
  requestSchema?: Record<string, unknown>;
  responseSchema: Record<string, unknown>;
}

export interface ScenarioSpec {
  id: string;
  contractId: string;
  name: string;
  status: number;
  delayMs?: number;
}

export interface RequestLogEntry {
  id: string;
  at: string;
  method: string;
  path: string;
  contractId?: string;
  scenarioId?: string;
  status: number;
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface VerificationResult {
  ok: boolean;
  contractCount: number;
  scenarioCount: number;
  issues: Array<{ level: "error" | "warning"; message: string; contractId?: string; scenarioId?: string }>;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBase}${path}`);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

export async function reloadProject(): Promise<VerificationResult> {
  const response = await fetch(`${apiBase}/api/reload`, { method: "POST" });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  const payload = (await response.json()) as { verification: VerificationResult };
  return payload.verification;
}

export interface ExecuteRequestInput {
  method: string;
  path: string;
  scenarioId?: string;
  recordId?: string;
  body?: string;
}

export interface ExecuteRequestResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export async function executeRelayRequest(input: ExecuteRequestInput): Promise<ExecuteRequestResult> {
  const url = new URL(`${apiBase}${input.path}`);
  if (input.scenarioId) url.searchParams.set("scenario", input.scenarioId);
  if (input.recordId) url.searchParams.set("record", input.recordId);

  const hasBody = !["GET", "DELETE"].includes(input.method) && input.body?.trim();
  const response = await fetch(url, {
    method: input.method,
    headers: hasBody ? { "content-type": "application/json" } : undefined,
    body: hasBody ? input.body : undefined,
  });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body,
  };
}

export async function loadConsoleData() {
  const [project, contracts, scenarios, requests, verification] = await Promise.all([
    getJson<ProjectSummary>("/api/project"),
    getJson<ContractSpec[]>("/api/contracts"),
    getJson<ScenarioSpec[]>("/api/scenarios"),
    getJson<RequestLogEntry[]>("/api/requests"),
    getJson<VerificationResult>("/api/verify"),
  ]);
  return { project, contracts, scenarios, requests, verification, apiBase };
}
