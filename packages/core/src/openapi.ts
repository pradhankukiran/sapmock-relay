import type { ContractSpec, LoadedProject } from "./types.js";

export interface OpenApiDocument {
  openapi: "3.1.0";
  info: {
    title: string;
    version: string;
  };
  paths: Record<string, Record<string, unknown>>;
  tags: Array<{ name: string; description?: string }>;
}

export function buildOpenApi(project: LoadedProject): OpenApiDocument {
  const paths: OpenApiDocument["paths"] = {};

  for (const contract of project.contracts) {
    const path = toOpenApiPath(contract.path);
    paths[path] ??= {};
    paths[path][contract.method.toLowerCase()] = operationFor(contract);
  }

  return {
    openapi: "3.1.0",
    info: {
      title: `${project.config.name} SAPMock Relay API`,
      version: project.config.version,
    },
    tags: project.config.systems.map((system) => ({ name: system.id, description: system.label })),
    paths,
  };
}

function operationFor(contract: ContractSpec): Record<string, unknown> {
  const operation: Record<string, unknown> = {
    operationId: contract.id,
    summary: contract.summary,
    tags: [contract.system],
    parameters: pathParameters(contract.path),
    responses: {
      [String(contract.defaultStatus ?? 200)]: {
        description: contract.summary,
        content: {
          "application/json": {
            schema: contract.responseSchema,
          },
        },
      },
    },
  };

  if (contract.requestSchema) {
    operation.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: contract.requestSchema,
        },
      },
    };
  }

  return operation;
}

function toOpenApiPath(path: string): string {
  return path
    .split("/")
    .map((part) => (part.startsWith(":") ? `{${part.slice(1)}}` : part))
    .join("/");
}

function pathParameters(path: string): Array<Record<string, unknown>> {
  return path
    .split("/")
    .filter((part) => part.startsWith(":"))
    .map((part) => ({
      name: part.slice(1),
      in: "path",
      required: true,
      schema: { type: "string" },
    }));
}

