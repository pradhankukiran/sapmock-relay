import { Activity, Boxes, CheckCircle2, CircleAlert, FileJson, RefreshCw, Server } from "lucide-react";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ReactNode } from "react";
import { loadConsoleData, type ContractSpec, type ProjectSummary, type RequestLogEntry, type ScenarioSpec, type VerificationResult } from "./api";
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
        <button className="iconButton" type="button" onClick={() => void refresh()} aria-label="Refresh console">
          <RefreshCw size={18} />
        </button>
      </header>

      {error ? (
        <section className="notice error">
          <CircleAlert size={18} />
          <span>API unavailable: {error}</span>
        </section>
      ) : null}

      {loading && !data ? <section className="notice">Loading relay state...</section> : null}
      {data ? <Console data={data} /> : null}
    </main>
  );
}

function Console({ data }: { data: ConsoleData }) {
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

      <section className="grid">
        <Panel title="SAP Systems">
          <table>
            <thead>
              <tr><th>ID</th><th>Label</th><th>Base Path</th></tr>
            </thead>
            <tbody>
              {data.project.config.systems.map((system) => (
                <tr key={system.id}><td>{system.id}</td><td>{system.label}</td><td><code>{system.basePath}</code></td></tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Contracts">
          <table>
            <thead>
              <tr><th>Method</th><th>Path</th><th>System</th></tr>
            </thead>
            <tbody>
              {data.contracts.map((contract) => (
                <tr key={contract.id}>
                  <td><span className="method">{contract.method}</span></td>
                  <td><code>{contract.path}</code><small>{contract.summary}</small></td>
                  <td>{contract.system}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Scenarios">
          <table>
            <thead>
              <tr><th>ID</th><th>Contract</th><th>Status</th></tr>
            </thead>
            <tbody>
              {data.scenarios.map((scenario, index) => (
                <tr key={`${scenario.contractId}-${scenario.id}-${index}`}>
                  <td>{scenario.id}</td>
                  <td>{scenario.contractId}<small>{scenario.name}</small></td>
                  <td>{scenario.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Recent Requests">
          {data.requests.length === 0 ? (
            <div className="empty"><Activity size={18} />No relay traffic yet</div>
          ) : (
            <table>
              <thead>
                <tr><th>Status</th><th>Method</th><th>Path</th></tr>
              </thead>
              <tbody>
                {data.requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.status}</td>
                    <td><span className="method">{request.method}</span></td>
                    <td><code>{request.path}</code><small>{request.contractId ?? "unmatched"}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </section>
    </>
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
