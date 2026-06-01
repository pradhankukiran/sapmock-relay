import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { createServer as createHttpServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "./server.js";

async function fixtureProject(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sapmock-api-"));
  await mkdir(join(root, "contracts"));
  await mkdir(join(root, "scenarios"));
  await writeFile(
    join(root, "sapmock.config.json"),
    JSON.stringify({
      name: "fixture",
      version: "1.0.0",
      systems: [{ id: "QM", label: "Quality", basePath: "/qm" }],
    }),
  );
  await writeFile(
    join(root, "contracts", "qm.json"),
    JSON.stringify({
      id: "qm-read",
      system: "QM",
      method: "GET",
      path: "/qm/notifications/:id",
      summary: "Read notification",
      responseSchema: {
        type: "object",
        required: ["notificationId"],
        properties: { notificationId: { type: "string" } },
      },
    }),
  );
  await writeFile(
    join(root, "contracts", "qm-create.json"),
    JSON.stringify({
      id: "qm-create",
      system: "QM",
      method: "POST",
      path: "/qm/notifications",
      summary: "Create notification",
      requestSchema: {
        type: "object",
        required: ["defectCode"],
        properties: { defectCode: { type: "string" } },
      },
      responseSchema: {
        type: "object",
        required: ["notificationId"],
        properties: { notificationId: { type: "string" } },
      },
    }),
  );
  await writeFile(
    join(root, "scenarios", "qm.json"),
    JSON.stringify({
      id: "happy",
      contractId: "qm-read",
      name: "Happy path",
      status: 200,
      response: { notificationId: "1001" },
    }),
  );
  await writeFile(
    join(root, "scenarios", "qm-create.json"),
    JSON.stringify({
      id: "happy",
      contractId: "qm-create",
      name: "Created",
      status: 201,
      response: { notificationId: "1002" },
    }),
  );
  return root;
}

describe("API relay", () => {
  let app: Awaited<ReturnType<typeof createServer>>;
  let target: Server | undefined;

  beforeEach(async () => {
    app = await createServer({ projectDir: await fixtureProject(), logger: false });
  });

  afterEach(async () => {
    if (app) await app.close();
    if (target) {
      await new Promise<void>((resolve) => target?.close(() => resolve()));
      target = undefined;
    }
  });

  it("serves contract scenario responses", async () => {
    const response = await app.inject({ method: "GET", url: "/qm/notifications/1001" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-sapmock-contract"]).toBe("qm-read");
    expect(response.json()).toEqual({ notificationId: "1001" });
  });

  it("returns useful miss for unknown routes", async () => {
    const response = await app.inject({ method: "GET", url: "/missing" });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ error: "NO_CONTRACT_MATCH" });
  });

  it("persists request and response bodies in the request log", async () => {
    await app.inject({ method: "GET", url: "/qm/notifications/1001" });
    const response = await app.inject({ method: "GET", url: "/api/requests" });
    expect(response.statusCode).toBe(200);
    expect(response.json()[0]).toMatchObject({
      method: "GET",
      path: "/qm/notifications/1001",
      contractId: "qm-read",
      responseBody: { notificationId: "1001" },
    });
  });

  it("validates request bodies before serving scenarios", async () => {
    const response = await app.inject({ method: "POST", url: "/qm/notifications", payload: {} });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: "REQUEST_SCHEMA_VALIDATION_FAILED", contractId: "qm-create" });
  });

  it("records proxied target responses as scenarios", async () => {
    const projectDir = await fixtureProject();
    const targetBaseUrl = await startTarget();
    await app.close();
    app = await createServer({ projectDir, recordTarget: targetBaseUrl, logger: false });

    const response = await app.inject({ method: "GET", url: "/qm/notifications/1001?record=target-qm" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-sapmock-recorded-scenario"]).toBe("target-qm");
    expect(response.json()).toEqual({ notificationId: "from-target" });

    const scenarios = await app.inject({ method: "GET", url: "/api/scenarios" });
    expect(scenarios.json()).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "target-qm", contractId: "qm-read" })]),
    );
  });

  async function startTarget(): Promise<string> {
    target = createHttpServer((request, response) => {
      if (request.url?.startsWith("/qm/notifications/1001")) {
        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ notificationId: "from-target" }));
        return;
      }

      response.statusCode = 404;
      response.end("missing");
    });

    await new Promise<void>((resolve) => target?.listen(0, "127.0.0.1", () => resolve()));
    const address = target.address();
    if (!address || typeof address === "string") throw new Error("No target port");
    return `http://127.0.0.1:${address.port}`;
  }
});
