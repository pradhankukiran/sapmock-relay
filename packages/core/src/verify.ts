import { Ajv2020 } from "ajv/dist/2020.js";
import type { LoadedProject, VerificationIssue, VerificationResult } from "./types.js";

const ajv = new Ajv2020({ allErrors: true, strict: false });

function basicProjectIssues(project: LoadedProject): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  const contractIds = new Set<string>();

  for (const contract of project.contracts) {
    if (contractIds.has(contract.id)) {
      issues.push({ level: "error", contractId: contract.id, message: `Duplicate contract id ${contract.id}` });
    }
    contractIds.add(contract.id);
    if (!contract.path.startsWith("/")) {
      issues.push({ level: "error", contractId: contract.id, message: `Contract path must start with /` });
    }
  }

  for (const scenario of project.scenarios) {
    if (!contractIds.has(scenario.contractId)) {
      issues.push({
        level: "error",
        scenarioId: scenario.id,
        contractId: scenario.contractId,
        message: `Scenario references missing contract ${scenario.contractId}`,
      });
    }
  }

  return issues;
}

export function verifyProject(project: LoadedProject): VerificationResult {
  const issues = basicProjectIssues(project);

  for (const contract of project.contracts) {
    let validateResponse: ReturnType<typeof ajv.compile>;
    try {
      if (contract.requestSchema) {
        ajv.compile(contract.requestSchema);
      }
      validateResponse = ajv.compile(contract.responseSchema);
    } catch (error) {
      issues.push({
        level: "error",
        contractId: contract.id,
        message: `Invalid schema: ${(error as Error).message}`,
      });
      continue;
    }

    const scenarios = project.scenarios.filter((scenario) => scenario.contractId === contract.id);
    if (scenarios.length === 0) {
      issues.push({ level: "warning", contractId: contract.id, message: `No scenarios for contract ${contract.id}` });
    }

    for (const scenario of scenarios) {
      const valid = validateResponse(scenario.response);
      if (!valid) {
        issues.push({
          level: "error",
          contractId: contract.id,
          scenarioId: scenario.id,
          message: ajv.errorsText(validateResponse.errors, { separator: "; " }),
        });
      }
    }
  }

  return {
    ok: issues.every((issue) => issue.level !== "error"),
    issues,
    contractCount: project.contracts.length,
    scenarioCount: project.scenarios.length,
  };
}
