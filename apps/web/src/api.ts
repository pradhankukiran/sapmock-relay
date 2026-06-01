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

