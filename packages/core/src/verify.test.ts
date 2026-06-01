import { describe, expect, it } from "vitest";
import type { LoadedProject } from "./types.js";
import { matchContract } from "./match.js";
import { buildOpenApi } from "./openapi.js";
import { validateRequestBody } from "./schema.js";
import { verifyProject } from "./verify.js";

const project: LoadedProject = {
  rootDir: "/tmp/demo",
  config: {
    name: "demo",
    version: "1.0.0",
    systems: [{ id: "QM", label: "Quality", basePath: "/qm" }],
  },
  contracts: [
    {
      id: "qm-notification-read",
      system: "QM",
      method: "GET",
      path: "/qm/notifications/:id",
      summary: "Read notification",
      responseSchema: {
        type: "object",
        required: ["notificationId", "status"],
        properties: {
          notificationId: { type: "string" },
          status: { type: "string" },
        },
      },
    },
  ],
  scenarios: [
    {
      id: "happy-path",
      contractId: "qm-notification-read",
      name: "Open notification",
      status: 200,
      response: { notificationId: "1001", status: "OPEN" },
    },
  ],
};

describe("core verifier", () => {
  it("validates scenario response against contract schema", () => {
    expect(verifyProject(project)).toMatchObject({ ok: true, contractCount: 1, scenarioCount: 1 });
  });

  it("matches parameterized SAP routes", () => {
    expect(matchContract(project.contracts, "GET", "/qm/notifications/1001")).toMatchObject({
      params: { id: "1001" },
      contract: { id: "qm-notification-read" },
    });
  });

  it("validates request schemas when present", () => {
    const contract = { ...project.contracts[0], requestSchema: { type: "object", required: ["id"] } };
    expect(validateRequestBody(contract, {})).toMatchObject({ ok: false });
    expect(validateRequestBody(contract, { id: "1001" })).toMatchObject({ ok: true });
  });

  it("exports OpenAPI paths from contracts", () => {
    const doc = buildOpenApi(project);
    expect(doc.openapi).toBe("3.1.0");
    expect(doc.paths["/qm/notifications/{id}"]).toBeDefined();
  });
});
