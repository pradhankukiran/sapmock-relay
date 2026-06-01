import {
  Activity,
  Boxes,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  FileJson,
  Play,
  RefreshCw,
  RotateCcw,
  Server,
} from "lucide-react";
import type { ReactNode } from "react";
import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  executeRelayRequest,
  loadConsoleData,
  reloadProject,
  type ContractSpec,
  type ExecuteRequestResult,
  type ProjectSummary,
  type RequestLogEntry,
  type ScenarioSpec,
  type VerificationResult,
} from "./api";
import "./styles.css";

interface ConsoleData {
  project: ProjectSummary;
  contracts: ContractSpec[];
  scenarios: ScenarioSpec[];
  requests: RequestLogEntry[];
  verification: VerificationResult;
  apiBase: string;
}

function App() {
  const [data, setData] = useState<ConsoleData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      setData(await loadConsoleData());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      await reloadProject();
      setData(await loadConsoleData());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">SAPMock Relay</p>
          <h1>Integration Console</h1>
        </div>
        <div className="toolbar">
          <button className="iconButton" type="button" onClick={() => void reload()} aria-label="Reload project">
            <RotateCcw size={18} />
          </button>
          <button className="iconButton" type="button" onClick={() => void refresh()} aria-label="Refresh console">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {error ? (
        <section className="notice error">
          <CircleAlert size={18} />
          <span>API unavailable: {error}</span>
        </section>
      ) : null}

      {loading && !data ? <section className="notice">Loading relay state...</section> : null}
      {data ? <Console data={data} onRefresh={() => void refresh()} /> : null}
    </main>
  );
}

function Console({ data, onRefresh }: { data: ConsoleData; onRefresh: () => void }) {
  return (
    <>
      <section className="summary">
        <Metric icon={<Server size={18} />} label="API" value={data.apiBase} />
        <Metric icon={<FileJson size={18} />} label="Contracts" value={data.project.contractCount.toString()} />
        <Metric icon={<Boxes size={18} />} label="Scenarios" value={data.project.scenarioCount.toString()} />
        <Metric
          icon={data.verification.ok ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
          label="Verification"
          value={data.verification.ok ? "PASS" : "FAIL"}
        />
      </section>

      <section className="workspace">
        <RequestRunner data={data} onExecuted={onRefresh} />
        <Panel title="Recent Requests">
          <RequestLog requests={data.requests} />
        </Panel>
      </section>

      <section className="grid">
        <Panel title="Contracts">
          <ContractTable contracts={data.contracts} />
        </Panel>

        <Panel title="Scenarios">
          <ScenarioTable scenarios={data.scenarios} />
        </Panel>
      </section>
    </>
  );
}

function RequestRunner({ data, onExecuted }: { data: ConsoleData; onExecuted: () => void }) {
  const [contractId, setContractId] = useState(data.contracts[0]?.id ?? "");
  const selectedContract = data.contracts.find((contract) => contract.id === contractId) ?? data.contracts[0];
  const scenarios = useMemo(
    () => data.scenarios.filter((scenario) => scenario.contractId === selectedContract?.id),
    [data.scenarios, selectedContract?.id],
  );
  const [path, setPath] = useState(selectedContract ? samplePath(selectedContract.path) : "");
  const [scenarioId, setScenarioId] = useState("");
  const [recordId, setRecordId] = useState("");
  const [body, setBody] = useState(selectedContract ? sampleBody(selectedContract) : "");
  const [result, setResult] = useState<ExecuteRequestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!selectedContract) return;
    setPath(samplePath(selectedContract.path));
    setScenarioId("");
    setRecordId("");
    setBody(sampleBody(selectedContract));
    setResult(null);
    setError(null);
  }, [selectedContract?.id]);

  async function execute() {
    if (!selectedContract) return;
    setRunning(true);
    setError(null);
    try {
      const response = await executeRelayRequest({
        method: selectedContract.method,
        path,
        scenarioId: scenarioId || undefined,
        recordId: recordId || undefined,
        body,
      });
      setResult(response);
      onExecuted();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <Panel title="Request Runner">
      <div className="runner">
        <label>
          Contract
          <select value={contractId} onChange={(event) => setContractId(event.target.value)}>
            {data.contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.method} {contract.path}
              </option>
            ))}
          </select>
        </label>

        <label>
          Path
          <input value={path} onChange={(event) => setPath(event.target.value)} />
        </label>

        <div className="runnerRow">
          <label>
            Scenario
            <select value={scenarioId} onChange={(event) => setScenarioId(event.target.value)}>
              <option value="">default</option>
              {scenarios.map((scenario, index) => (
                <option key={`${scenario.contractId}-${scenario.id}-${index}`} value={scenario.id}>
                  {scenario.id} ({scenario.status})
                </option>
              ))}
            </select>
          </label>

          <label>
            Record ID
            <input
              value={recordId}
              placeholder="optional"
              onChange={(event) => setRecordId(event.target.value)}
            />
          </label>
        </div>

        {!["GET", "DELETE"].includes(selectedContract?.method ?? "GET") ? (
          <label>
            JSON Body
            <textarea value={body} onChange={(event) => setBody(event.target.value)} spellCheck={false} />
          </label>
        ) : null}

        <div className="actions">
          <button className="primaryButton" type="button" onClick={() => void execute()} disabled={running || !selectedContract}>
            <Play size={16} />
            {running ? "Running" : "Run"}
          </button>
          <a className="linkButton" href={`${data.apiBase}/api/openapi.json`} target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            OpenAPI
          </a>
        </div>

        {error ? <div className="inlineError">{error}</div> : null}
        {result ? <ResponseViewer result={result} /> : null}
      </div>
    </Panel>
  );
}

function ContractTable({ contracts }: { contracts: ContractSpec[] }) {
  return (
    <table>
      <thead>
        <tr><th>Method</th><th>Path</th><th>System</th></tr>
      </thead>
      <tbody>
        {contracts.map((contract) => (
          <tr key={contract.id}>
            <td><span className="method">{contract.method}</span></td>
            <td><code>{contract.path}</code><small>{contract.summary}</small></td>
            <td>{contract.system}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ScenarioTable({ scenarios }: { scenarios: ScenarioSpec[] }) {
  return (
    <table>
      <thead>
        <tr><th>ID</th><th>Contract</th><th>Status</th></tr>
      </thead>
      <tbody>
        {scenarios.map((scenario, index) => (
          <tr key={`${scenario.contractId}-${scenario.id}-${index}`}>
            <td>{scenario.id}</td>
            <td>{scenario.contractId}<small>{scenario.name}</small></td>
            <td>{scenario.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RequestLog({ requests }: { requests: RequestLogEntry[] }) {
  if (requests.length === 0) {
    return <div className="empty"><Activity size={18} />No relay traffic yet</div>;
  }

  return (
    <table>
      <thead>
        <tr><th>Status</th><th>Method</th><th>Path</th></tr>
      </thead>
      <tbody>
        {requests.map((request) => (
          <tr key={request.id}>
            <td>{request.status}</td>
            <td><span className="method">{request.method}</span></td>
            <td><code>{request.path}</code><small>{request.contractId ?? "unmatched"}</small></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResponseViewer({ result }: { result: ExecuteRequestResult }) {
  const statusClass = result.status >= 400 ? "statusBad" : "statusGood";
  return (
    <div className="responseBox">
      <div className="responseHeader">
        <span>Status</span>
        <strong className={statusClass}>{result.status}</strong>
      </div>
      <pre>{JSON.stringify(result.body, null, 2)}</pre>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function samplePath(path: string): string {
  return path
    .split("/")
    .map((part) => (part.startsWith(":") ? sampleValue(part.slice(1)) : part))
    .join("/");
}

function sampleValue(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("notification")) return "10000042";
  if (lower.includes("po")) return "4500001234";
  if (lower.includes("delivery")) return "1800007777";
  return "TEST";
}

function sampleBody(contract: ContractSpec): string {
  if (!contract.requestSchema) return "";
  const properties = contract.requestSchema.properties as Record<string, { type?: string }> | undefined;
  const required = Array.isArray(contract.requestSchema.required) ? contract.requestSchema.required.map(String) : [];
  const body = Object.fromEntries(
    required.map((key) => {
      const type = properties?.[key]?.type;
      if (type === "number") return [key, 1];
      if (type === "boolean") return [key, true];
      return [key, sampleValue(key)];
    }),
  );
  return JSON.stringify(body, null, 2);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
