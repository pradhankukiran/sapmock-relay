export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type SapSystem = "MM" | "QM" | "EWM" | "FI" | "CUSTOM";

export interface RelayConfig {
  name: string;
  version: string;
  defaultScenario?: string;
  systems: Array<{
    id: SapSystem | string;
    label: string;
    basePath: string;
  }>;
}

export interface ContractSpec {
  id: string;
  system: SapSystem | string;
  method: HttpMethod;
  path: string;
  summary: string;
  requestSchema?: Record<string, unknown>;
  responseSchema: Record<string, unknown>;
  defaultStatus?: number;
}

export interface ScenarioSpec {
  id: string;
  contractId: string;
  name: string;
  description?: string;
  status: number;
  delayMs?: number;
  headers?: Record<string, string>;
  response: unknown;
}

export interface LoadedProject {
  rootDir: string;
  config: RelayConfig;
  contracts: ContractSpec[];
  scenarios: ScenarioSpec[];
}

export interface VerificationIssue {
  level: "error" | "warning";
  file?: string;
  message: string;
  contractId?: string;
  scenarioId?: string;
}

export interface VerificationResult {
  ok: boolean;
  issues: VerificationIssue[];
  contractCount: number;
  scenarioCount: number;
}

export interface RouteMatch {
  contract: ContractSpec;
  params: Record<string, string>;
}

export interface RelayResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  delayMs: number;
  scenario: ScenarioSpec;
  contract: ContractSpec;
}

