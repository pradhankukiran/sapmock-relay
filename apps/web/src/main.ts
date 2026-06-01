import {
  executeRelayRequest,
  loadConsoleData,
  reloadProject,
  type ContractSpec,
  type ExecuteRequestResult,
  type RequestLogEntry,
  type ScenarioSpec,
} from "./api";
import "./styles.css";

declare const sap: any;

interface ConsoleData {
  project: Awaited<ReturnType<typeof loadConsoleData>>["project"];
  contracts: ContractSpec[];
  scenarios: ScenarioSpec[];
  requests: RequestLogEntry[];
  verification: Awaited<ReturnType<typeof loadConsoleData>>["verification"];
  apiBase: string;
}

interface UiState {
  data?: ConsoleData;
  selectedContractId: string;
  path: string;
  scenarioId: string;
  recordId: string;
  body: string;
  result?: ExecuteRequestResult;
}

const state: UiState = {
  selectedContractId: "",
  path: "",
  scenarioId: "",
  recordId: "",
  body: "",
};

const controls: Record<string, any> = {};

void boot();

async function boot() {
  await waitForUi5();
  sap.ui.getCore().attachInit(() => {
    sap.ui.require(
      [
        "sap/m/App",
        "sap/m/Button",
        "sap/m/Column",
        "sap/m/ColumnListItem",
        "sap/m/ComboBox",
        "sap/m/HBox",
        "sap/m/Input",
        "sap/m/Label",
        "sap/m/Link",
        "sap/m/MessageStrip",
        "sap/m/ObjectStatus",
        "sap/m/Page",
        "sap/m/Panel",
        "sap/m/Select",
        "sap/m/Table",
        "sap/m/Text",
        "sap/m/TextArea",
        "sap/m/Title",
        "sap/m/Toolbar",
        "sap/m/ToolbarSpacer",
        "sap/m/VBox",
        "sap/ui/core/Item",
        "sap/ui/core/ListItem",
      ],
      (...modules: any[]) => {
        const [
          App,
          Button,
          Column,
          ColumnListItem,
          ComboBox,
          HBox,
          Input,
          Label,
          Link,
          MessageStrip,
          ObjectStatus,
          Page,
          Panel,
          Select,
          Table,
          Text,
          TextArea,
          Title,
          Toolbar,
          ToolbarSpacer,
          VBox,
          Item,
          ListItem,
        ] = modules;

        Object.assign(controls, {
          App,
          Button,
          Column,
          ColumnListItem,
          ComboBox,
          HBox,
          Input,
          Label,
          Link,
          MessageStrip,
          ObjectStatus,
          Page,
          Panel,
          Select,
          Table,
          Text,
          TextArea,
          Title,
          Toolbar,
          ToolbarSpacer,
          VBox,
          Item,
          ListItem,
        });

        createShell();
        void refreshData();
      },
    );
  });
}

function createShell() {
  const { App, Button, Page, Toolbar, ToolbarSpacer, Title, VBox } = controls;

  controls.root = new VBox({ width: "100%" }).addStyleClass("sapUiResponsiveContentPadding");
  controls.page = new Page({
    title: "SAPMock Relay",
    showHeader: true,
    customHeader: new Toolbar({
      content: [
        new Title({ text: "SAPMock Relay Integration Console", level: "H2" }),
        new ToolbarSpacer(),
        new Button({ icon: "sap-icon://refresh", tooltip: "Refresh", press: () => void refreshData() }),
        new Button({ icon: "sap-icon://synchronize", text: "Reload Project", press: () => void reloadData() }),
      ],
    }),
    content: [controls.root],
  });

  new App({ pages: [controls.page] }).placeAt("content");
}

async function refreshData() {
  setBusy(true);
  try {
    state.data = await loadConsoleData();
    if (!state.selectedContractId && state.data.contracts[0]) {
      selectContract(state.data.contracts[0].id);
    }
    render();
  } catch (error) {
    renderError((error as Error).message);
  } finally {
    setBusy(false);
  }
}

async function reloadData() {
  setBusy(true);
  try {
    await reloadProject();
    await refreshData();
  } catch (error) {
    renderError((error as Error).message);
  } finally {
    setBusy(false);
  }
}

function render() {
  if (!state.data) return;
  const { VBox } = controls;
  controls.root.removeAllItems();
  controls.root.addItem(summarySection());
  controls.root.addItem(new VBox({ items: [requestRunner(), recentRequestsPanel()] }).addStyleClass("sapmockWorkspace"));
  controls.root.addItem(new VBox({ items: [contractsPanel(), scenariosPanel()] }).addStyleClass("sapmockWorkspace"));
}

function renderError(message: string) {
  const { MessageStrip } = controls;
  controls.root.removeAllItems();
  controls.root.addItem(new MessageStrip({ text: `API unavailable: ${message}`, type: "Error", showIcon: true }));
}

function summarySection() {
  const { HBox, ObjectStatus, Panel, Text, VBox } = controls;
  const data = requireData();
  return new HBox({
    wrap: "Wrap",
    items: [
      metric("API", data.apiBase, "Information"),
      metric("Contracts", String(data.project.contractCount), "Information"),
      metric("Scenarios", String(data.project.scenarioCount), "Information"),
      new Panel({
        width: "18rem",
        content: [
          new VBox({
            items: [
              new Text({ text: "Verification" }).addStyleClass("sapmockMetricLabel"),
              new ObjectStatus({
                text: data.verification.ok ? "PASS" : "FAIL",
                state: data.verification.ok ? "Success" : "Error",
                icon: data.verification.ok ? "sap-icon://sys-enter-2" : "sap-icon://error",
              }),
            ],
          }),
        ],
      }).addStyleClass("sapmockMetric"),
    ],
  }).addStyleClass("sapmockSummary");
}

function metric(label: string, value: string, state: string) {
  const { ObjectStatus, Panel, Text, VBox } = controls;
  return new Panel({
    width: "18rem",
    content: [
      new VBox({
        items: [
          new Text({ text: label }).addStyleClass("sapmockMetricLabel"),
          new ObjectStatus({ text: value, state }),
        ],
      }),
    ],
  }).addStyleClass("sapmockMetric");
}

function requestRunner() {
  const {
    Button,
    ComboBox,
    HBox,
    Input,
    Label,
    Link,
    Panel,
    Select,
    TextArea,
    VBox,
    Item,
  } = controls;
  const data = requireData();
  const contract = selectedContract();
  const scenarios = data.scenarios.filter((scenario) => scenario.contractId === contract?.id);

  const contractSelect = new ComboBox({
    width: "100%",
    selectedKey: contract?.id,
    selectionChange: (event: any) => selectContract(event.getSource().getSelectedKey()),
  });
  data.contracts.forEach((item) => {
    contractSelect.addItem(new Item({ key: item.id, text: `${item.method} ${item.path}` }));
  });

  const scenarioSelect = new Select({
    width: "100%",
    selectedKey: state.scenarioId,
    change: (event: any) => {
      state.scenarioId = event.getSource().getSelectedKey();
    },
  });
  scenarioSelect.addItem(new Item({ key: "", text: "default" }));
  scenarios.forEach((scenario) => {
    scenarioSelect.addItem(new Item({ key: scenario.id, text: `${scenario.id} (${scenario.status})` }));
  });
  scenarioSelect.attachChange((event: any) => {
    state.scenarioId = event.getSource().getSelectedKey();
  });

  const pathInput = new Input({
    value: state.path,
    liveChange: (event: any) => {
      state.path = event.getParameter("value");
    },
  });

  const recordInput = new Input({
    value: state.recordId,
    placeholder: "optional",
    liveChange: (event: any) => {
      state.recordId = event.getParameter("value");
    },
  });

  const runnerItems = [
    field("Contract", contractSelect),
    field("Path", pathInput),
    new HBox({
      wrap: "Wrap",
      items: [field("Scenario", scenarioSelect), field("Record ID", recordInput)],
    }).addStyleClass("sapmockFormRow"),
  ];

  if (contract && !["GET", "DELETE"].includes(contract.method)) {
    runnerItems.push(
      field(
        "JSON Body",
        new TextArea({
          value: state.body,
          width: "100%",
          rows: 7,
          liveChange: (event: any) => {
            state.body = event.getParameter("value");
          },
        }),
      ),
    );
  }

  runnerItems.push(
    new HBox({
      items: [
        new Button({ text: "Run", icon: "sap-icon://media-play", type: "Emphasized", press: () => void runRequest() }),
        new Link({ text: "OpenAPI", href: `${data.apiBase}/api/openapi.json`, target: "_blank" }),
      ],
    }).addStyleClass("sapmockActions"),
  );

  if (state.result) {
    runnerItems.push(responsePanel(state.result));
  }

  return new Panel({
    headerText: "Request Runner",
    expandable: false,
    content: [new VBox({ items: runnerItems })],
  }).addStyleClass("sapUiMediumMarginBottom");

  function field(label: string, control: any) {
    return new VBox({
      width: "100%",
      items: [new Label({ text: label }), control],
    }).addStyleClass("sapmockField");
  }
}

function responsePanel(result: ExecuteRequestResult) {
  const { ObjectStatus, TextArea, VBox } = controls;
  return new VBox({
    items: [
      new ObjectStatus({
        title: "Status",
        text: String(result.status),
        state: result.status >= 400 ? "Error" : "Success",
      }),
      new TextArea({
        width: "100%",
        rows: 12,
        editable: false,
        value: JSON.stringify(result.body, null, 2),
      }).addStyleClass("sapmockCodeBox"),
    ],
  }).addStyleClass("sapmockResponse");
}

function contractsPanel() {
  const { Panel } = controls;
  return new Panel({
    headerText: "Contracts",
    content: [contractsTable()],
  });
}

function scenariosPanel() {
  const { Panel } = controls;
  return new Panel({
    headerText: "Scenarios",
    content: [scenariosTable()],
  });
}

function recentRequestsPanel() {
  const { Panel } = controls;
  return new Panel({
    headerText: "Recent Requests",
    content: [requestsTable()],
  }).addStyleClass("sapUiMediumMarginBottom");
}

function contractsTable() {
  const { Column, ColumnListItem, ObjectStatus, Table, Text } = controls;
  const table = new Table({
    columns: [
      new Column({ header: new Text({ text: "Method" }) }),
      new Column({ header: new Text({ text: "Path" }) }),
      new Column({ header: new Text({ text: "System" }) }),
    ],
  });
  requireData().contracts.forEach((contract) => {
    table.addItem(
      new ColumnListItem({
        cells: [
          new ObjectStatus({ text: contract.method, state: methodState(contract.method) }),
          new Text({ text: `${contract.path}\n${contract.summary}` }),
          new ObjectStatus({ text: contract.system, state: "Information" }),
        ],
      }),
    );
  });
  return table;
}

function scenariosTable() {
  const { Column, ColumnListItem, ObjectStatus, Table, Text } = controls;
  const table = new Table({
    columns: [
      new Column({ header: new Text({ text: "Scenario" }) }),
      new Column({ header: new Text({ text: "Contract" }) }),
      new Column({ header: new Text({ text: "Status" }) }),
    ],
  });
  requireData().scenarios.forEach((scenario) => {
    table.addItem(
      new ColumnListItem({
        cells: [
          new Text({ text: `${scenario.id}\n${scenario.name}` }),
          new Text({ text: scenario.contractId }),
          new ObjectStatus({ text: String(scenario.status), state: scenario.status >= 400 ? "Error" : "Success" }),
        ],
      }),
    );
  });
  return table;
}

function requestsTable() {
  const { Column, ColumnListItem, ObjectStatus, Table, Text } = controls;
  const table = new Table({
    columns: [
      new Column({ header: new Text({ text: "Status" }) }),
      new Column({ header: new Text({ text: "Method" }) }),
      new Column({ header: new Text({ text: "Path" }) }),
    ],
  });
  requireData().requests.forEach((request) => {
    table.addItem(
      new ColumnListItem({
        cells: [
          new ObjectStatus({ text: String(request.status), state: request.status >= 400 ? "Error" : "Success" }),
          new ObjectStatus({ text: request.method, state: methodState(request.method) }),
          new Text({ text: `${request.path}\n${request.contractId ?? "unmatched"}` }),
        ],
      }),
    );
  });
  return table;
}

async function runRequest() {
  const contract = selectedContract();
  if (!contract) return;
  setBusy(true);
  try {
    state.result = await executeRelayRequest({
      method: contract.method,
      path: state.path,
      scenarioId: state.scenarioId || undefined,
      recordId: state.recordId || undefined,
      body: state.body,
    });
    await refreshData();
  } finally {
    setBusy(false);
  }
}

function selectContract(contractId: string) {
  state.selectedContractId = contractId;
  const contract = selectedContract();
  if (!contract) return;
  state.path = samplePath(contract.path);
  state.scenarioId = "";
  state.recordId = "";
  state.body = sampleBody(contract);
  state.result = undefined;
  if (state.data) render();
}

function selectedContract(): ContractSpec | undefined {
  return requireData().contracts.find((contract) => contract.id === state.selectedContractId) ?? requireData().contracts[0];
}

function requireData(): ConsoleData {
  if (!state.data) throw new Error("Console data not loaded");
  return state.data;
}

function setBusy(busy: boolean) {
  controls.page?.setBusy(busy);
}

function methodState(method: string) {
  if (method === "GET") return "Success";
  if (method === "POST") return "Information";
  if (["PUT", "PATCH"].includes(method)) return "Warning";
  return "None";
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
  if (lower.includes("quantity")) return "100";
  if (lower.includes("date")) return "2026-06-20";
  if (lower.includes("item")) return "00010";
  return "TEST";
}

function sampleBody(contract: ContractSpec): string {
  if (!contract.requestSchema) return "";
  const properties = contract.requestSchema.properties as Record<string, { type?: string }> | undefined;
  const required = Array.isArray(contract.requestSchema.required) ? contract.requestSchema.required.map(String) : [];
  const body = Object.fromEntries(
    required.map((key) => {
      const type = properties?.[key]?.type;
      if (type === "number") return [key, Number(sampleValue(key)) || 1];
      if (type === "boolean") return [key, true];
      return [key, sampleValue(key)];
    }),
  );
  return JSON.stringify(body, null, 2);
}

function waitForUi5(): Promise<void> {
  return new Promise((resolve) => {
    const tick = () => {
      if ((globalThis as typeof globalThis & { sap?: any }).sap?.ui?.getCore) {
        resolve();
        return;
      }
      window.setTimeout(tick, 20);
    };
    tick();
  });
}
