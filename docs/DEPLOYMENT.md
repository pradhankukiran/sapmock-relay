# Deployment

## Railway API

Railway uses `Dockerfile` and serves `@sapmock/api`.

Required env:

```text
SAPMOCK_PROJECT=examples/supplier-portal
PORT=4000
```

Health check:

```text
/health
```

## Vercel Console

Vercel builds `apps/web`.

Required env:

```text
VITE_API_BASE_URL=https://your-railway-api.example
```

The console is static. It reads relay state from the API.

## Local Production Check

```bash
pnpm install
pnpm verify
SAPMOCK_PROJECT=examples/supplier-portal pnpm api:start
```

