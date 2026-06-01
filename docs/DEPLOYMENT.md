# Deployment

## Railway API

Railway uses `Dockerfile` and serves `@sapmock/api`.

Required env:

```text
SAPMOCK_PROJECT=examples/supplier-portal
SAPMOCK_RECORD_TARGET=https://real-api-or-middleware.example
PORT=4000
```

Health check:

```text
/health
```

## Vercel Console

Vercel builds `apps/web`, an OpenUI5/SAPUI5 console using the `sap_horizon` theme.

Required env:

```text
VITE_API_BASE_URL=https://your-railway-api.example
```

The console is static. It reads relay state from the API.

OpenAPI export:

```text
/api/openapi.json
```

## Local Production Check

```bash
pnpm install
pnpm verify
SAPMOCK_PROJECT=examples/supplier-portal pnpm api:start
```

Record mode:

```bash
SAPMOCK_RECORD_TARGET=https://real-api.example pnpm api:start
curl "http://localhost:4000/qm/notifications/10000042?record=real-qm-10000042"
```
