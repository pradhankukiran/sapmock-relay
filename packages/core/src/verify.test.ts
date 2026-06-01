import { describe, expect, it } from "vitest";
import type { LoadedProject } from "./types.js";
import { matchContract } from "./match.js";
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
});

