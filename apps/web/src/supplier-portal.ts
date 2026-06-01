import { executeRelayRequest, type ExecuteRequestResult } from "./api";

interface SupplierPortalState {
  poNumber: string;
  notificationId: string;
  deliveryNumber: string;
  po?: any;
  notification?: any;
  delivery?: any;
  confirmation?: ExecuteRequestResult;
  qualityResponse?: ExecuteRequestResult;
  lastResult?: ExecuteRequestResult;
  message: string;
}

const state: SupplierPortalState = {
  poNumber: "4500001234",
  notificationId: "10000042",
  deliveryNumber: "1800007777",
  message: "Ready",
};

export function createSupplierPortalTab(controls: any): any {
  const { Card, CardHeader, VBox } = controls;
  const content = new VBox({ width: "100%" }).addStyleClass("sapmockPortal");

  function rerender() {
    content.removeAllItems();
    content.addItem(portalStatus(controls));
    content.addItem(
      new VBox({
        width: "100%",
        items: [purchaseOrderCard(controls, rerender), qualityCard(controls, rerender), deliveryCard(controls, rerender)],
      }).addStyleClass("sapmockPortalGrid"),
    );
    content.addItem(integrationTraceCard(controls));
  }

  rerender();

  void loadPortalData(rerender);

  return new Card({
    header: new CardHeader({
      title: "Supplier Portal Fiori Demo",
      subtitle: "PO confirmation, quality response, and inbound delivery tracking through REST contracts",
      iconSrc: "sap-icon://supplier",
    }),
    content,
  });
}

function portalStatus(controls: any): any {
  const { HBox, ObjectStatus, Text } = controls;
  return new HBox({
    width: "100%",
    alignItems: "Center",
    justifyContent: "SpaceBetween",
    items: [
      new Text({ text: "Supplier: ACME_COMPONENTS | Buyer: POWER_GRID_DE" }),
      new ObjectStatus({ text: state.message, state: state.message.includes("failed") ? "Error" : "Success" }),
    ],
  }).addStyleClass("sapmockPortalStatus");
}

function purchaseOrderCard(controls: any, rerender: () => void): any {
  const {
    Button,
    Card,
    CardHeader,
    Column,
    ColumnListItem,
    HBox,
    Input,
    Label,
    ObjectIdentifier,
    ObjectStatus,
    Table,
    Text,
    TextArea,
    VBox,
  } = controls;

  const itemInput = new Input({ value: "00010" });
  const quantityInput = new Input({ value: "120", type: "Number" });
  const dateInput = new Input({ value: "2026-06-20" });
  const commentInput = new TextArea({
    value: "Confirmed against supplier production plan",
    rows: 3,
    width: "100%",
  });

  const table = new Table({
    alternateRowColors: true,
    columns: [
      new Column({ header: new Text({ text: "Item" }), width: "5rem" }),
      new Column({ header: new Text({ text: "Material" }) }),
      new Column({ header: new Text({ text: "Open Qty" }), width: "8rem" }),
      new Column({ header: new Text({ text: "Requested" }), width: "8rem" }),
    ],
  });

  for (const item of state.po?.items ?? []) {
    table.addItem(
      new ColumnListItem({
        cells: [
          new Text({ text: item.item }),
          new ObjectIdentifier({ title: item.material, text: item.description }),
          new Text({ text: `${item.openQuantity} ${item.uom}` }),
          new Text({ text: item.requestedDate }),
        ],
      }),
    );
  }

  return new Card({
    header: new CardHeader({
      title: "Purchase Order Confirmation",
      subtitle: "Review open MM purchase order lines and submit supplier confirmation",
      iconSrc: "sap-icon://sales-order",
    }),
    content: new VBox({
      items: [
        new HBox({
          width: "100%",
          alignItems: "Center",
          justifyContent: "SpaceBetween",
          items: [
            new ObjectIdentifier({
              title: state.po?.poNumber ?? state.poNumber,
              text: state.po?.status ? `Status: ${state.po.status}` : "Not loaded",
            }),
            new Button({
              text: "Refresh PO",
              icon: "sap-icon://refresh",
              type: "Transparent",
              press: () => void loadPurchaseOrder(rerender),
            }),
          ],
        }).addStyleClass("sapUiSmallMarginBottom"),
        table,
        new HBox({
          width: "100%",
          items: [
            field(controls, "Item", itemInput),
            field(controls, "Confirmed Qty", quantityInput),
            field(controls, "Confirmed Date", dateInput),
          ],
        }).addStyleClass("sapmockPortalForm sapUiSmallMarginTop"),
        new Label({ text: "Supplier Comment" }).addStyleClass("sapUiSmallMarginTop sapUiTinyMarginBottom"),
        commentInput,
        new HBox({
          width: "100%",
          alignItems: "Center",
          justifyContent: "SpaceBetween",
          items: [
            confirmationStatus(controls, state.confirmation),
            new Button({
              text: "Submit Confirmation",
              icon: "sap-icon://accept",
              type: "Emphasized",
              press: () =>
                void submitPoConfirmation(
                  {
                    item: itemInput.getValue(),
                    confirmedQuantity: Number(quantityInput.getValue()),
                    confirmedDate: dateInput.getValue(),
                    supplierComment: commentInput.getValue(),
                  },
                  rerender,
                ),
            }),
          ],
        }).addStyleClass("sapmockPortalActions"),
      ],
    }).addStyleClass("sapUiContentPadding"),
  });
}

function qualityCard(controls: any, rerender: () => void): any {
  const { Button, Card, CardHeader, HBox, Input, Label, ObjectIdentifier, ObjectStatus, Text, TextArea, VBox } = controls;
  const rootCauseInput = new TextArea({
    value: "Packaging specification mismatch at outbound staging",
    rows: 3,
    width: "100%",
  });
  const correctiveActionInput = new TextArea({
    value: "Updated supplier pack instruction and added final photo inspection before dispatch",
    rows: 3,
    width: "100%",
  });
  const ownerInput = new Input({ value: "Kiran Pradhan" });

  return new Card({
    header: new CardHeader({
      title: "Quality Notification Response",
      subtitle: "Read QM notification and submit supplier root cause analysis",
      iconSrc: "sap-icon://quality-issue",
    }),
    content: new VBox({
      items: [
        new HBox({
          width: "100%",
          alignItems: "Center",
          justifyContent: "SpaceBetween",
          items: [
            new ObjectIdentifier({
              title: state.notification?.notificationId ?? state.notificationId,
              text: state.notification?.requiredAction ?? "Not loaded",
            }),
            new Button({
              text: "Refresh QM",
              icon: "sap-icon://refresh",
              type: "Transparent",
              press: () => void loadNotification(rerender),
            }),
          ],
        }).addStyleClass("sapUiSmallMarginBottom"),
        new HBox({
          width: "100%",
          items: [
            new ObjectStatus({ title: "Defect", text: state.notification?.defectCode ?? "-", state: "Warning" }),
            new ObjectStatus({ title: "Severity", text: state.notification?.severity ?? "-", state: "Error" }),
            new ObjectStatus({ title: "Status", text: state.notification?.status ?? "-", state: "Information" }),
          ],
        }).addStyleClass("sapmockStatusRow sapUiSmallMarginBottom"),
        new Label({ text: "Root Cause" }).addStyleClass("sapUiTinyMarginBottom"),
        rootCauseInput,
        new Label({ text: "Corrective Action" }).addStyleClass("sapUiSmallMarginTop sapUiTinyMarginBottom"),
        correctiveActionInput,
        field(controls, "Owner", ownerInput),
        new HBox({
          width: "100%",
          alignItems: "Center",
          justifyContent: "SpaceBetween",
          items: [
            confirmationStatus(controls, state.qualityResponse),
            new Button({
              text: "Submit 8D Response",
              icon: "sap-icon://paper-plane",
              type: "Emphasized",
              press: () =>
                void submitQualityResponse(
                  {
                    rootCause: rootCauseInput.getValue(),
                    correctiveAction: correctiveActionInput.getValue(),
                    owner: ownerInput.getValue(),
                  },
                  rerender,
                ),
            }),
          ],
        }).addStyleClass("sapmockPortalActions"),
        new Text({ text: "This flow uses the QM REST contract instead of an OData service." }).addStyleClass("sapUiTinyMarginTop"),
      ],
    }).addStyleClass("sapUiContentPadding"),
  });
}

function deliveryCard(controls: any, rerender: () => void): any {
  const { Button, Card, CardHeader, HBox, ObjectIdentifier, ObjectStatus, Text, VBox } = controls;
  const posted = Boolean(state.delivery?.goodsReceipt?.posted);

  return new Card({
    header: new CardHeader({
      title: "Inbound Delivery Monitor",
      subtitle: "Track EWM delivery status and goods receipt visibility",
      iconSrc: "sap-icon://shipping-status",
    }),
    content: new VBox({
      items: [
        new HBox({
          width: "100%",
          alignItems: "Center",
          justifyContent: "SpaceBetween",
          items: [
            new ObjectIdentifier({
              title: state.delivery?.deliveryNumber ?? state.deliveryNumber,
              text: state.delivery?.poNumber ? `PO ${state.delivery.poNumber}` : "Not loaded",
            }),
            new Button({
              text: "Refresh Delivery",
              icon: "sap-icon://refresh",
              type: "Transparent",
              press: () => void loadDelivery(rerender),
            }),
          ],
        }).addStyleClass("sapUiSmallMarginBottom"),
        new HBox({
          width: "100%",
          items: [
            new ObjectStatus({ title: "Delivery", text: state.delivery?.status ?? "-", state: "Information" }),
            new ObjectStatus({
              title: "Goods Receipt",
              text: posted ? "Posted" : "Pending",
              state: posted ? "Success" : "Warning",
            }),
            new ObjectStatus({
              title: "Material Doc",
              text: state.delivery?.goodsReceipt?.documentNumber || "Not posted",
              state: posted ? "Success" : "None",
            }),
          ],
        }).addStyleClass("sapmockStatusRow sapUiSmallMarginBottom"),
        new Text({
          text: "The same Fiori shell can consume MM, QM, and EWM JSON contracts behind one supplier workflow.",
        }),
      ],
    }).addStyleClass("sapUiContentPadding"),
  });
}

function integrationTraceCard(controls: any): any {
  const { Card, CardHeader, CodeEditor, ObjectStatus, VBox } = controls;
  const result = state.lastResult;

  return new Card({
    header: new CardHeader({
      title: "Live Integration Trace",
      subtitle: "Last REST response returned by SAPMock Relay",
      iconSrc: "sap-icon://connected",
    }),
    content: new VBox({
      items: [
        new ObjectStatus({
          title: "HTTP Status",
          text: result ? String(result.status) : "No call yet",
          state: result && result.status >= 400 ? "Error" : "Success",
        }).addStyleClass("sapUiSmallMarginBottom"),
        new CodeEditor({
          width: "100%",
          height: "260px",
          type: "json",
          editable: false,
          value: result ? JSON.stringify(result.body, null, 2) : "{}",
        }),
      ],
    }).addStyleClass("sapUiContentPadding"),
  }).addStyleClass("sapUiMediumMarginTop");
}

function field(controls: any, labelText: string, control: any): any {
  const { Label, VBox } = controls;
  return new VBox({
    width: "100%",
    items: [new Label({ text: labelText }), control],
  }).addStyleClass("sapmockField");
}

function confirmationStatus(controls: any, result?: ExecuteRequestResult): any {
  const { ObjectStatus } = controls;
  if (!result) return new ObjectStatus({ text: "Not submitted", state: "None" });
  return new ObjectStatus({
    text: result.status >= 400 ? "Rejected by contract" : "Accepted by relay",
    state: result.status >= 400 ? "Error" : "Success",
  });
}

async function loadPortalData(rerender: () => void): Promise<void> {
  await Promise.all([loadPurchaseOrder(rerender), loadNotification(rerender), loadDelivery(rerender)]);
}

async function loadPurchaseOrder(rerender: () => void): Promise<void> {
  await callRelay(`/mm/purchase-orders/${state.poNumber}`, "GET", undefined, (result) => {
    state.po = result.body;
    state.message = "PO loaded";
  });
  rerender();
}

async function loadNotification(rerender: () => void): Promise<void> {
  await callRelay(`/qm/notifications/${state.notificationId}`, "GET", undefined, (result) => {
    state.notification = result.body;
    state.message = "QM notification loaded";
  });
  rerender();
}

async function loadDelivery(rerender: () => void): Promise<void> {
  await callRelay(`/ewm/deliveries/${state.deliveryNumber}/status`, "GET", undefined, (result) => {
    state.delivery = result.body;
    state.message = "Delivery status loaded";
  });
  rerender();
}

async function submitPoConfirmation(body: Record<string, unknown>, rerender: () => void): Promise<void> {
  await callRelay(`/mm/purchase-orders/${state.poNumber}/confirmations`, "POST", body, (result) => {
    state.confirmation = result;
    state.message = result.status >= 400 ? "PO confirmation failed" : "PO confirmation submitted";
  });
  rerender();
}

async function submitQualityResponse(body: Record<string, unknown>, rerender: () => void): Promise<void> {
  await callRelay(`/qm/notifications/${state.notificationId}/responses`, "POST", body, (result) => {
    state.qualityResponse = result;
    state.message = result.status >= 400 ? "Quality response failed" : "Quality response submitted";
  });
  rerender();
}

async function callRelay(
  path: string,
  method: string,
  body: Record<string, unknown> | undefined,
  onSuccess: (result: ExecuteRequestResult) => void,
): Promise<void> {
  try {
    const result = await executeRelayRequest({
      method,
      path,
      body: body ? JSON.stringify(body, null, 2) : undefined,
    });
    state.lastResult = result;
    onSuccess(result);
  } catch (error) {
    state.message = `Request failed: ${(error as Error).message}`;
  }
}
