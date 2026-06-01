FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/cli/package.json packages/cli/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @sapmock/core build
RUN pnpm --filter @sapmock/api build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV SAPMOCK_PROJECT=examples/supplier-portal
ENV PORT=4000
RUN corepack enable
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/.npmrc ./
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/packages/core/package.json packages/core/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/examples examples
RUN pnpm install --prod --frozen-lockfile
EXPOSE 4000
CMD ["pnpm", "--filter", "@sapmock/api", "start"]

