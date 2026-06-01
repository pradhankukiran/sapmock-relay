import type { ContractSpec, LoadedProject, RelayResponse, ScenarioSpec } from "./types.js";

export function pickScenario(
  project: LoadedProject,
  contract: ContractSpec,
  requestedScenario?: string,
): ScenarioSpec | undefined {
  const candidates = project.scenarios.filter((scenario) => scenario.contractId === contract.id);
  if (requestedScenario) {
    return candidates.find((scenario) => scenario.id === requestedScenario);
  }
  if (project.config.defaultScenario) {
    return candidates.find((scenario) => scenario.id === project.config.defaultScenario) ?? candidates[0];
  }
  return candidates[0];
}

export function buildRelayResponse(contract: ContractSpec, scenario: ScenarioSpec): RelayResponse {
  return {
    status: scenario.status || contract.defaultStatus || 200,
    headers: {
      "content-type": "application/json",
      "x-sapmock-contract": contract.id,
      "x-sapmock-scenario": scenario.id,
      ...(scenario.headers ?? {}),
    },
    body: scenario.response,
    delayMs: scenario.delayMs ?? 0,
    scenario,
    contract,
  };
}

