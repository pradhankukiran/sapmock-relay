import { Ajv2020 } from "ajv/dist/2020.js";
import type { ContractSpec } from "./types.js";

export interface SchemaValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateRequestBody(contract: ContractSpec, body: unknown): SchemaValidationResult {
  if (!contract.requestSchema) {
    return { ok: true, errors: [] };
  }

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validate = ajv.compile(contract.requestSchema);
  const ok = validate(body);

  return {
    ok,
    errors: ok ? [] : (validate.errors ?? []).map((error) => `${error.instancePath || "/"} ${error.message ?? "invalid"}`),
  };
}

