import {
  executeRelayRequest,
  loadConsoleData,
  reloadProject,
  type ContractSpec,
  type ExecuteRequestResult,
  type RequestLogEntry,
  type ScenarioSpec,
} from "./api";
import {
  createJsonToAbapTab,
  createSnapLogicTab,
  createLaunchpadTab,
  createOpenApiExplorerTab,
} from "./tools";
import { createSupplierPortalTab } from "./supplier-portal";
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
        "sap/m/IconTabBar",
        "sap/m/IconTabFilter",
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
        "sap/m/OverflowToolbar",
        "sap/m/GenericTile",
        "sap/m/TileContent",
        "sap/m/NumericContent",
        "sap/m/ObjectIdentifier",
        "sap/ui/layout/cssgrid/CSSGrid",
        "sap/ui/codeeditor/CodeEditor",
        "sap/f/Card",
        "sap/f/cards/Header",
        "sap/ui/layout/form/SimpleForm",
      ],
      (...modules: any[]) => {
        const [
          App,
          Button,
          Column,
          ColumnListItem,
          ComboBox,
          HBox,
          IconTabBar,
          IconTabFilter,
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
          OverflowToolbar,
          GenericTile,
          TileContent,
          NumericContent,
          ObjectIdentifier,
          CSSGrid,
          CodeEditor,
          Card,
          CardHeader,
          SimpleForm,
        ] = modules;

        Object.assign(controls, {
          App,
          Button,
          Column,
          ColumnListItem,
          ComboBox,
          HBox,
          IconTabBar,
          IconTabFilter,
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
          OverflowToolbar,
          GenericTile,
          TileContent,
          NumericContent,
          ObjectIdentifier,
          CSSGrid,
          CodeEditor,
          Card,
          CardHeader,
          SimpleForm,
        });

        createShell();
        void refreshData();
      },
    );
  });
}

function createShell() {
  const { App, Button, Page, VBox, OverflowToolbar, ToolbarSpacer, Title } = controls;

  controls.root = new VBox({ width: "100%" }).addStyleClass("sapUiResponsiveContentPadding sapmockContainer");
  
  const refreshBtn = new Button({
    icon: "sap-icon://refresh",
    tooltip: "Refresh Data",
    type: "Transparent",
    press: () => void refreshData()
  });

  const reloadBtn = new Button({
    icon: "sap-icon://synchronize",
    text: "Reload Project",
    type: "Transparent",
    press: () => void reloadData()
  });

  controls.page = new Page({
    showHeader: true,
    customHeader: new OverflowToolbar({
      content: [
        new Title({ text: "SAPMock Relay", level: "H2" }).addStyleClass("sapUiTinyMarginBegin"),
        new Title({ text: "Integration Console", level: "H5" }).addStyleClass("sapUiTinyMarginBegin sapUiMutedText"),
        new ToolbarSpacer(),
        refreshBtn,
        reloadBtn
      ]
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

function selectContractAndSwitchTab(contractId: string) {
  selectContract(contractId);
  controls.tabBar?.setSelectedKey("run");
}

function render() {
  if (!state.data) return;
  const { IconTabBar, IconTabFilter } = controls;
  controls.root.removeAllItems();
  controls.root.addItem(summarySection());
  
  const contractsCount = state.data.contracts.length;
  const scenariosCount = state.data.scenarios.length;

  controls.tabBar = new IconTabBar({
    expandable: false,
    backgroundDesign: "Transparent",
    headerMode: "Inline", // Render tab elements on a single, clean horizontal line
    items: [
      new IconTabFilter({
        key: "run",
        text: "Request Runner",
        content: [runnerWorkspace()],
      }),
      new IconTabFilter({
        key: "requests",
        text: "Recent Requests Log",
        content: [recentRequestsPanel()],
      }),
      new IconTabFilter({
        key: "contracts",
        text: `API Contracts (${contractsCount})`,
        content: [contractsPanel()],
      }),
      new IconTabFilter({
        key: "scenarios",
        text: `Mock Scenarios (${scenariosCount})`,
        content: [scenariosPanel()],
      }),
      new IconTabFilter({
        key: "supplierPortal",
        text: "Supplier Portal Demo",
        content: [createSupplierPortalTab(controls)],
      }),
      new IconTabFilter({
        key: "jsonToAbap",
        text: "JSON-to-ABAP Generator",
        content: [createJsonToAbapTab(controls)],
      }),
      new IconTabFilter({
        key: "snaplogic",
        text: "SnapLogic Mapper",
        content: [createSnapLogicTab(controls, state.data)],
      }),
      new IconTabFilter({
        key: "launchpad",
        text: "Launchpad Tile Designer",
        content: [createLaunchpadTab(controls)],
      }),
      new IconTabFilter({
        key: "openapiExplorer",
        text: "OpenAPI Explorer",
        content: [createOpenApiExplorerTab(controls, state.data, selectContractAndSwitchTab)],
      }),
    ],
  }).addStyleClass("sapmockTabs sapUiMediumMarginTop");

  controls.root.addItem(controls.tabBar);
}

function renderError(message: string) {
  const { MessageStrip } = controls;
  controls.root.removeAllItems();
  controls.root.addItem(new MessageStrip({ text: `API unavailable: ${message}`, type: "Error", showIcon: true }));
}

function summarySection() {
  const { HBox, GenericTile, TileContent, NumericContent, Text } = controls;
  const data = requireData();

  const apiTile = new GenericTile({
    header: "API Base Endpoint",
    subheader: data.apiBase.replace(/^https?:\/\//, ""),
    frameType: "TwoByOne",
    tileContent: [
      new TileContent({
        content: new Text({ text: "ACTIVE" }).addStyleClass("sapmockTileText sapUiTinyMarginTop")
      })
    ]
  }).addStyleClass("sapUiTinyMarginEnd sapUiTinyMarginBottom");

  const contractsTile = new GenericTile({
    header: "Contracts",
    subheader: "Active specifications",
    frameType: "OneByOne",
    tileContent: [
      new TileContent({
        content: new NumericContent({
          value: String(data.project.contractCount),
          icon: "sap-icon://document-text",
          valueColor: "Neutral"
        })
      })
    ]
  }).addStyleClass("sapUiTinyMarginEnd sapUiTinyMarginBottom");

  const scenariosTile = new GenericTile({
    header: "Scenarios",
    subheader: "Mocked routes",
    frameType: "OneByOne",
    tileContent: [
      new TileContent({
        content: new NumericContent({
          value: String(data.project.scenarioCount),
          icon: "sap-icon://copy",
          valueColor: "Neutral"
        })
      })
    ]
  }).addStyleClass("sapUiTinyMarginEnd sapUiTinyMarginBottom");

  const verificationTile = new GenericTile({
    header: "Verification",
    subheader: data.verification.ok ? "All contracts verified" : "Issues detected",
    frameType: "OneByOne",
    tileContent: [
      new TileContent({
        content: new Text({ 
          text: data.verification.ok ? "PASSED" : "FAILED" 
        }).addStyleClass(data.verification.ok ? "sapmockTileTextPass sapUiTinyMarginTop" : "sapmockTileTextFail sapUiTinyMarginTop")
      })
    ]
  }).addStyleClass("sapUiTinyMarginBottom");

  return new HBox({
    wrap: "Wrap",
    items: [apiTile, contractsTile, scenariosTile, verificationTile]
  }).addStyleClass("sapmockSummary");
}

function runnerWorkspace() {
  const { VBox } = controls;
  return new VBox({
    width: "100%",
    items: [requestRunner(), recentRequestsPanel()]
  }).addStyleClass("sapmockWorkbench");
}

function requestRunner() {
  const {
    Button,
    ComboBox,
    HBox,
    Input,
    Label,
    Link,
    Card,
    CardHeader,
    Select,
    CodeEditor,
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
    placeholder: "Optional record ID",
    liveChange: (event: any) => {
      state.recordId = event.getParameter("value");
    },
  });

  // Helper to build label-control vertical stacks cleanly
  function field(labelText: string, control: any) {
    return new VBox({
      width: "100%",
      items: [
        new Label({ text: labelText }),
        control
      ]
    }).addStyleClass("sapmockField");
  }

  // Modern CSS Grid for form layout
  const formGrid = new HBox({
    width: "100%",
    items: [
      field("Contract Specification", contractSelect),
      field("Request Path", pathInput),
      field("Scenario Mock", scenarioSelect),
      field("Record ID", recordInput)
    ]
  }).addStyleClass("sapmockFormGrid");

  const runnerItems = [formGrid];

  if (contract && !["GET", "DELETE"].includes(contract.method)) {
    runnerItems.push(
      new VBox({
        width: "100%",
        items: [
          new Label({ text: "JSON Request Body" }).addStyleClass("sapUiSmallMarginTop sapUiTinyMarginBottom"),
          new CodeEditor({
            value: state.body,
            type: "json",
            width: "100%",
            height: "180px",
            change: (event: any) => {
              state.body = event.getSource().getValue();
            },
          }),
        ]
      })
    );
  }

  runnerItems.push(
    new HBox({
      alignItems: "Center",
      justifyContent: "SpaceBetween",
      items: [
        new Button({ text: "Execute Request", icon: "sap-icon://media-play", type: "Emphasized", press: () => void runRequest() }),
        new Link({ text: "View OpenAPI Specification", href: `${data.apiBase}/api/openapi.json`, target: "_blank" }),
      ],
    }).addStyleClass("sapmockActions sapUiSmallMarginTop"),
  );

  if (state.result) {
    runnerItems.push(responsePanel(state.result));
  }

  return new Card({
    header: new CardHeader({
      title: "Mock Request Runner",
      subtitle: "Execute mock REST requests to verify schemas",
      iconSrc: "sap-icon://process"
    }),
    content: new VBox({
      items: runnerItems
    }).addStyleClass("sapUiContentPadding")
  }).addStyleClass("sapmockRunnerPanel");
}

function responsePanel(result: ExecuteRequestResult) {
  const { ObjectStatus, CodeEditor, VBox, Label } = controls;
  return new VBox({
    width: "100%",
    items: [
      new ObjectStatus({
        title: "HTTP Status Response",
        text: String(result.status),
        state: result.status >= 400 ? "Error" : "Success",
      }).addStyleClass("sapUiSmallMarginBottom"),
      new Label({ text: "JSON Response Payload" }).addStyleClass("sapUiTinyMarginBottom"),
      new CodeEditor({
        width: "100%",
        height: "280px",
        type: "json",
        editable: false,
        value: JSON.stringify(result.body, null, 2),
      })
    ],
  }).addStyleClass("sapmockResponse");
}

function contractsPanel() {
  const { Card, CardHeader } = controls;
  return new Card({
    header: new CardHeader({
      title: "API Contracts Catalog",
      subtitle: "Active contract specifications mapping to SAP backends",
      iconSrc: "sap-icon://document-text"
    }),
    content: contractsTable(),
  });
}

function scenariosPanel() {
  const { Card, CardHeader } = controls;
  return new Card({
    header: new CardHeader({
      title: "Mock Scenarios Configuration",
      subtitle: "Predefined success/failure mock returns",
      iconSrc: "sap-icon://copy"
    }),
    content: scenariosTable(),
  });
}

function recentRequestsPanel() {
  const { Card, CardHeader } = controls;
  return new Card({
    header: new CardHeader({
      title: "Recent Requests Log",
      subtitle: "List of recently processed transactions through mock proxy",
      iconSrc: "sap-icon://activity-items"
    }),
    content: requestsTable(),
  }).addStyleClass("sapmockRequestsPanel");
}

function contractsTable() {
  const { Column, ColumnListItem, ObjectStatus, Table, Text, ObjectIdentifier } = controls;
  const table = new Table({
    alternateRowColors: true,
    columns: [
      new Column({ header: new Text({ text: "Method" }), width: "6rem" }),
      new Column({ header: new Text({ text: "Endpoint / Details" }) }),
      new Column({ header: new Text({ text: "Target System" }), width: "10rem" }),
    ],
  });
  requireData().contracts.forEach((contract) => {
    table.addItem(
      new ColumnListItem({
        vAlign: "Middle",
        cells: [
          new ObjectStatus({ text: contract.method, state: methodState(contract.method) }),
          new ObjectIdentifier({ title: contract.path, text: contract.summary }),
          new ObjectStatus({ text: contract.system, state: "None" }),
        ],
      }),
    );
  });
  return table;
}

function scenariosTable() {
  const { Column, ColumnListItem, ObjectStatus, Table, Text, ObjectIdentifier } = controls;
  const table = new Table({
    alternateRowColors: true,
    columns: [
      new Column({ header: new Text({ text: "Scenario ID / Description" }) }),
      new Column({ header: new Text({ text: "Contract ID" }), width: "20rem" }),
      new Column({ header: new Text({ text: "Response Status" }), width: "10rem" }),
    ],
  });
  requireData().scenarios.forEach((scenario) => {
    table.addItem(
      new ColumnListItem({
        vAlign: "Middle",
        cells: [
          new ObjectIdentifier({ title: scenario.id, text: scenario.name }),
          new Text({ text: scenario.contractId }),
          new ObjectStatus({ text: String(scenario.status), state: scenario.status >= 400 ? "Error" : "Success" }),
        ],
      }),
    );
  });
  return table;
}

function requestsTable() {
  const { Column, ColumnListItem, ObjectStatus, Table, Text, ObjectIdentifier } = controls;
  const table = new Table({
    alternateRowColors: true,
    columns: [
      new Column({ header: new Text({ text: "Status" }), width: "6rem" }),
      new Column({ header: new Text({ text: "Method" }), width: "6rem" }),
      new Column({ header: new Text({ text: "Path / Match" }) }),
    ],
  });
  requireData().requests.forEach((request) => {
    table.addItem(
      new ColumnListItem({
        vAlign: "Middle",
        cells: [
          new ObjectStatus({ text: String(request.status), state: request.status >= 400 ? "Error" : "Success" }),
          new ObjectStatus({ text: request.method, state: methodState(request.method) }),
          new ObjectIdentifier({ title: request.path, text: request.contractId ?? "unmatched" }),
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
