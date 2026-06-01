export function configTemplate(name: string): string {
  return JSON.stringify(
    {
      name,
      version: "1.0.0",
      defaultScenario: "happy-path",
      systems: [
        { id: "MM", label: "Materials Management", basePath: "/mm" },
        { id: "QM", label: "Quality Management", basePath: "/qm" },
        { id: "EWM", label: "Warehouse/Delivery", basePath: "/ewm" },
      ],
    },
    null,
    2,
  );
}

export const poContractTemplate = JSON.stringify(
  {
    id: "mm-po-read",
    system: "MM",
    method: "GET",
    path: "/mm/purchase-orders/:poNumber",
    summary: "Read purchase order header and lines",
    responseSchema: {
      type: "object",
      required: ["poNumber", "supplier", "status", "items"],
      properties: {
        poNumber: { type: "string" },
        supplier: { type: "string" },
        status: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            required: ["item", "material", "openQuantity"],
            properties: {
              item: { type: "string" },
              material: { type: "string" },
              openQuantity: { type: "number" },
            },
          },
        },
      },
    },
  },
  null,
  2,
);

export const qmContractTemplate = JSON.stringify(
  {
    id: "qm-notification-read",
    system: "QM",
    method: "GET",
    path: "/qm/notifications/:notificationId",
    summary: "Read supplier quality notification",
    responseSchema: {
      type: "object",
      required: ["notificationId", "supplier", "defectCode", "status"],
      properties: {
        notificationId: { type: "string" },
        supplier: { type: "string" },
        defectCode: { type: "string" },
        status: { type: "string" },
        bapiReturn: {
          type: "array",
          items: {
            type: "object",
            required: ["type", "message"],
            properties: {
              type: { type: "string" },
              id: { type: "string" },
              number: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
  null,
  2,
);

export const scenarioTemplate = JSON.stringify(
  [
    {
      id: "happy-path",
      contractId: "mm-po-read",
      name: "Open PO",
      status: 200,
      response: {
        poNumber: "4500001234",
        supplier: "ACME_COMPONENTS",
        status: "OPEN",
        items: [{ item: "00010", material: "TURBINE-BOLT-M16", openQuantity: 120 }],
      },
    },
    {
      id: "happy-path",
      contractId: "qm-notification-read",
      name: "Open quality notification",
      status: 200,
      response: {
        notificationId: "10000042",
        supplier: "ACME_COMPONENTS",
        defectCode: "PACKAGING_DAMAGED",
        status: "OPEN",
        bapiReturn: [{ type: "S", id: "QM", number: "000", message: "Notification loaded" }],
      },
    },
    {
      id: "bapi-error",
      contractId: "qm-notification-read",
      name: "BAPI-style backend failure",
      status: 422,
      response: {
        notificationId: "10000042",
        supplier: "ACME_COMPONENTS",
        defectCode: "PACKAGING_DAMAGED",
        status: "ERROR",
        bapiReturn: [{ type: "E", id: "QM", number: "311", message: "Notification locked by another user" }],
      },
    },
  ],
  null,
  2,
);

export function abapHelperTemplate(className: string): string {
  return `CLASS ${className} DEFINITION
  PUBLIC
  FINAL
  CREATE PUBLIC.

  PUBLIC SECTION.
    TYPES: BEGIN OF ty_bapiret,
             type    TYPE c LENGTH 1,
             id      TYPE c LENGTH 20,
             number  TYPE c LENGTH 3,
             message TYPE string,
           END OF ty_bapiret,
           tt_bapiret TYPE STANDARD TABLE OF ty_bapiret WITH EMPTY KEY.

    CLASS-METHODS success
      IMPORTING message TYPE string DEFAULT 'OK'
      RETURNING VALUE(result) TYPE tt_bapiret.

    CLASS-METHODS error
      IMPORTING id TYPE csequence DEFAULT 'ZSMOCK'
                number TYPE csequence DEFAULT '001'
                message TYPE string
      RETURNING VALUE(result) TYPE tt_bapiret.
ENDCLASS.

CLASS ${className} IMPLEMENTATION.
  METHOD success.
    result = VALUE #( ( type = 'S' id = 'ZSMOCK' number = '000' message = message ) ).
  ENDMETHOD.

  METHOD error.
    result = VALUE #( ( type = 'E' id = id number = number message = message ) ).
  ENDMETHOD.
ENDCLASS.
`;
}

