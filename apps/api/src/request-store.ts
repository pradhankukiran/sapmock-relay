import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export interface RequestLogEntry {
  id: string;
  at: string;
  method: string;
  path: string;
  contractId?: string;
  scenarioId?: string;
  status: number;
  requestBody?: unknown;
  responseBody?: unknown;
}

export interface RequestLogInput {
  method: string;
  path: string;
  status: number;
  contractId?: string;
  scenarioId?: string;
  requestBody?: unknown;
  responseBody?: unknown;
}

export class RequestStore {
  private readonly db: DatabaseSync;

  constructor(dbPath: string) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS request_log (
        id TEXT PRIMARY KEY,
        at TEXT NOT NULL,
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        contract_id TEXT,
        scenario_id TEXT,
        status INTEGER NOT NULL,
        request_body TEXT,
        response_body TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_request_log_at ON request_log(at);
    `);
  }

  add(input: RequestLogInput): RequestLogEntry {
    const entry: RequestLogEntry = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      method: input.method,
      path: input.path,
      contractId: input.contractId,
      scenarioId: input.scenarioId,
      status: input.status,
      requestBody: input.requestBody,
      responseBody: input.responseBody,
    };

    this.db
      .prepare(
        `INSERT INTO request_log
          (id, at, method, path, contract_id, scenario_id, status, request_body, response_body)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.id,
        entry.at,
        entry.method,
        entry.path,
        entry.contractId ?? null,
        entry.scenarioId ?? null,
        entry.status,
        stringify(entry.requestBody),
        stringify(entry.responseBody),
      );

    return entry;
  }

  recent(limit = 100): RequestLogEntry[] {
    const rows = this.db
      .prepare(
        `SELECT id, at, method, path, contract_id, scenario_id, status, request_body, response_body
         FROM request_log
         ORDER BY at DESC
         LIMIT ?`,
      )
      .all(limit) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: String(row.id),
      at: String(row.at),
      method: String(row.method),
      path: String(row.path),
      contractId: nullableString(row.contract_id),
      scenarioId: nullableString(row.scenario_id),
      status: Number(row.status),
      requestBody: parse(String(row.request_body ?? "")),
      responseBody: parse(String(row.response_body ?? "")),
    }));
  }

  close(): void {
    this.db.close();
  }
}

function stringify(value: unknown): string | null {
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function parse(value: string): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function nullableString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

