# SAPMock Relay

Developer tool for SAP/Fiori teams building against ABAP backends when real OData services are missing, unstable, or spread across many SAP systems.

SAPMock Relay gives teams:

- local mock SAP systems for MM, QM, EWM, and custom ABAP APIs
- runtime contract validation for REST/JSON request and response payloads
- scenario replay for failures, latency, BAPI-style returns, and auth errors
- SQLite-backed request/response logs
- proxy record mode for saving real API responses as reusable scenarios
- OpenAPI 3.1 export
- ABAP Unit helper generation for API wrapper tests
- deployable API server for Railway and SAPUI5/OpenUI5 Fiori-style console for Vercel
- supplier-facing Fiori demo workflow for PO confirmation, QM supplier response, and EWM delivery tracking
- built-in interactive Fiori Horizon-themed integration utilities:
  - **JSON-to-ABAP Generator:** Auto-maps JSON payloads directly to recursive ABAP structure declarations (`TYPES: BEGIN OF...`) and `/UI2/CL_JSON=>deserialize` parsing blocks.
  - **SnapLogic Mapper:** Generates property mapping expression blocks linking REST fields to standard BAPI fields.
  - **Launchpad Tile Designer:** Target mapping configuration editor with a real-time responsive Fiori Dynamic/Static Tile previewer and configuration JSON exports.
  - **OpenAPI Schema Explorer:** Interactive schema inspection with a one-click route loader that loads configurations directly into the Request Runner.

## Quick Start

```bash
pnpm install
pnpm build
pnpm cli verify examples/supplier-portal
pnpm cli replay examples/supplier-portal GET /qm/notifications/10000042 -s happy-path
pnpm cli openapi examples/supplier-portal --out tmp/openapi.json
pnpm cli abap-tests examples/supplier-portal --out-dir tmp/abap-tests
pnpm api:dev
```

In another shell:

```bash
pnpm console:dev
```

Open:

- API: `http://localhost:4000/health`
- Relay sample: `http://localhost:4000/qm/notifications/10000042`
- Failure sample: `http://localhost:4000/qm/notifications/10000042?scenario=bapi-error`
- OpenAPI: `http://localhost:4000/api/openapi.json`
- Console: `http://localhost:5173`

Open the **Supplier Portal Demo** tab to try a Fiori-style supplier workflow backed by the mock REST contracts:

- review MM purchase order lines and submit supplier confirmations
- read QM notifications and submit root cause/corrective action responses
- track EWM inbound delivery and goods receipt status
- inspect the live relay response returned by the no-OData integration layer

## Shape

```text
Fiori/UI5 app -> SAPMock Relay -> scenario response
                         |
                         +-> contract verification
                         +-> SQLite request/response log
                         +-> proxy recorder
                         +-> OpenAPI export
                         +-> ABAP Unit helper/test generation
```

## Deploy

API deploy target: Railway.

```bash
railway up
```

Web console deploy target: Vercel.

```bash
vercel
```

Set `VITE_API_BASE_URL` in Vercel to the Railway API URL.

The web console is built with OpenUI5/SAPUI5 controls using the `sap_horizon` theme.

## CLI

```bash
pnpm build
pnpm cli init tmp/supplier-project
pnpm cli verify examples/supplier-portal
pnpm cli serve examples/supplier-portal --port 4000
pnpm cli serve examples/supplier-portal --port 4000 --record-target https://real-api.example
pnpm cli openapi examples/supplier-portal --out tmp/openapi.json
pnpm cli abap-testdouble --out tmp/zcl_sapmock_bapi_return.clas.abap
pnpm cli abap-tests examples/supplier-portal --out-dir tmp/abap-tests
```

Record a real API response as a scenario:

```bash
curl "http://localhost:4000/qm/notifications/10000042?record=workshop-qm-response"
```

SAPMock proxies the request to `SAPMOCK_RECORD_TARGET`, saves the response under `scenarios/recorded/`, reloads the project, and returns the real response to the caller.

## ABAP Helpers

`abap/` contains small helper classes/interfaces for ABAP Unit tests:

- `zif_sapmock_backend_port`: seam for ABAP wrappers calling external APIs
- `zcl_sapmock_http_client_double`: in-memory response double
- `zcl_sapmock_bapi_return`: BAPIRET-style success/error builder
- `zcl_sapmock_contract_assert`: JSON substring assertion helper

Generated ABAP test classes are contract-specific and use scenario payloads as test double responses.
