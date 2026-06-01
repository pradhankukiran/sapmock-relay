# SAPMock Relay

Developer tool for SAP/Fiori teams building against ABAP backends when real OData services are missing, unstable, or spread across many SAP systems.

SAPMock Relay gives teams:

- local mock SAP systems for MM, QM, EWM, and custom ABAP APIs
- contract validation for REST/JSON payloads
- scenario replay for failures, latency, BAPI-style returns, and auth errors
- ABAP Unit helper generation for API wrapper tests
- deployable API server for Railway and web console for Vercel

## Quick Start

```bash
pnpm install
pnpm build
pnpm cli verify examples/supplier-portal
pnpm cli replay examples/supplier-portal GET /qm/notifications/10000042 -s happy-path
pnpm api:dev
```

In another shell:

```bash
pnpm console:dev
```

Open:

- API: `http://localhost:4000/health`
- Relay sample: `http://localhost:4000/qm/notifications/10000042`
- Failure sample: `http://localhost:4000/qm/notifications/10000042/responses?scenario=bapi-error`
- Console: `http://localhost:5173`

## Shape

```text
Fiori/UI5 app -> SAPMock Relay -> scenario response
                         |
                         +-> contract verification
                         +-> request log
                         +-> ABAP Unit helper templates
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

## CLI

```bash
pnpm build
pnpm cli init tmp/supplier-project
pnpm cli verify examples/supplier-portal
pnpm cli serve examples/supplier-portal --port 4000
pnpm cli abap-testdouble --out tmp/zcl_sapmock_bapi_return.clas.abap
```

## ABAP Helpers

`abap/` contains small helper classes/interfaces for ABAP Unit tests:

- `zif_sapmock_backend_port`: seam for ABAP wrappers calling external APIs
- `zcl_sapmock_http_client_double`: in-memory response double
- `zcl_sapmock_bapi_return`: BAPIRET-style success/error builder
- `zcl_sapmock_contract_assert`: JSON substring assertion helper

