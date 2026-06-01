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
pnpm --filter @sapmock/cli start init demo-project
pnpm --filter @sapmock/cli start verify examples/supplier-portal
pnpm --filter @sapmock/api dev
```

## Shape

```text
Fiori/UI5 app -> SAPMock Relay -> scenario response
                         |
                         +-> contract verification
                         +-> request log
                         +-> ABAP Unit helper templates
```

