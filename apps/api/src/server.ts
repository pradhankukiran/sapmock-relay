import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import cors from "@fastify/cors";
import {
  buildOpenApi,
  buildRelayResponse,
  validateRequestBody,
  loadProject,
  matchContract,
  pickScenario,
  verifyProject,
  type LoadedProject,
} from "@sapmock/core";
import Fastify, { type FastifyInstance } from "fastify";
import { recordScenario } from "./record.js";
import { RequestStore } from "./request-store.js";

export interface CreateServerOptions {
  projectDir: string;
  dbPath?: string;
  recordTarget?: string;
  logger?: boolean;
}

export async function createServer(options: CreateServerOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? true });
  const requestStore = new RequestStore(options.dbPath ?? join(options.projectDir, ".sapmock", "requests.sqlite"));
  let project: LoadedProject = await loadProject(options.projectDir);

  await app.register(cors, { origin: true });

  app.get("/health", async () => ({ ok: true, service: "sapmock-relay" }));

  app.post("/api/reload", async () => {
    project = await loadProject(options.projectDir);
    const verification = verifyProject(project);
    return { ok: verification.ok, verification };
  });

  app.get("/api/project", async () => ({
    config: project.config,
    contractCount: project.contracts.length,
    scenarioCount: project.scenarios.length,
  }));

  app.get("/api/contracts", async () => project.contracts);
  app.get("/api/scenarios", async () => project.scenarios);
  app.get("/api/requests", async () => requestStore.recent(100));
  app.get("/api/verify", async () => verifyProject(project));
  app.get("/api/openapi.json", async () => buildOpenApi(project));
  app.addHook("onClose", async () => requestStore.close());

  app.route({
    method: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    url: "/*",
    handler: async (request, reply) => {
    const url = new URL(request.url, "http://localhost");
    const route = matchContract(project.contracts, request.method, url.pathname);

    if (!route) {
      const body = {
        error: "NO_CONTRACT_MATCH",
        message: `${request.method} ${url.pathname} does not match any SAPMock contract`,
      };
      requestStore.add(logInput(request.method, url.pathname, 404, request.body, body));
      return reply.code(404).send(body);
    }

    const scenarioId = url.searchParams.get("scenario") ?? request.headers["x-sapmock-scenario"]?.toString();
    const recordScenarioId =
      url.searchParams.get("record") ?? request.headers["x-sapmock-record-scenario"]?.toString();
    const validation = validateRequestBody(route.contract, request.body);
    if (!validation.ok) {
      const body = {
        error: "REQUEST_SCHEMA_VALIDATION_FAILED",
        contractId: route.contract.id,
        issues: validation.errors,
      };
      requestStore.add(logInput(request.method, url.pathname, 400, request.body, body, route.contract.id));
      return reply.code(400).send(body);
    }

    if (recordScenarioId) {
      if (!options.recordTarget) {
        const body = {
          error: "RECORD_TARGET_MISSING",
          message: "Set SAPMOCK_RECORD_TARGET or createServer recordTarget before using record mode",
        };
        requestStore.add(logInput(request.method, url.pathname, 400, request.body, body, route.contract.id));
        return reply.code(400).send(body);
      }

      const recorded = await recordScenario({
        projectDir: options.projectDir,
        targetBaseUrl: options.recordTarget,
        requestUrl: request.url,
        method: request.method,
        headers: request.headers,
        requestBody: request.body,
        contract: route.contract,
        scenarioId: recordScenarioId,
      });
      project = await loadProject(options.projectDir);

      for (const [key, value] of Object.entries(recorded.headers)) {
        reply.header(key, value);
      }
      reply.header("x-sapmock-recorded-scenario", recorded.scenario.id);
      reply.header("x-sapmock-recorded-file", recorded.file);
      requestStore.add(
        logInput(
          request.method,
          url.pathname,
          recorded.status,
          request.body,
          recorded.body,
          route.contract.id,
          recorded.scenario.id,
        ),
      );
      return reply.code(recorded.status).send(recorded.body);
    }

    const scenario = pickScenario(project, route.contract, scenarioId);

    if (!scenario) {
      const body = {
        error: "NO_SCENARIO_MATCH",
        contractId: route.contract.id,
        message: `No scenario available for contract ${route.contract.id}`,
      };
      requestStore.add(logInput(request.method, url.pathname, 404, request.body, body, route.contract.id));
      return reply.code(404).send(body);
    }

    const relayResponse = buildRelayResponse(route.contract, scenario);
    if (relayResponse.delayMs > 0) {
      await delay(relayResponse.delayMs);
    }

    for (const [key, value] of Object.entries(relayResponse.headers)) {
      reply.header(key, value);
    }

    requestStore.add(
      logInput(
        request.method,
        url.pathname,
        relayResponse.status,
        request.body,
        relayResponse.body,
        route.contract.id,
        scenario.id,
      ),
    );
    return reply.code(relayResponse.status).send(relayResponse.body);
    },
  });

  return app;
}

function logInput(
  method: string,
  path: string,
  status: number,
  requestBody?: unknown,
  responseBody?: unknown,
  contractId?: string,
  scenarioId?: string,
): Parameters<RequestStore["add"]>[0] {
  return {
    method,
    path,
    status,
    requestBody,
    responseBody,
    contractId,
    scenarioId,
  };
}
