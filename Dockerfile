# --- Build stage: install all workspaces, build data-objects -> nestjs -> frontend ---
FROM node:24-alpine AS build
WORKDIR /app
# Manifests and the shared contract first: npm ci builds data-objects (prepare script).
COPY package.json package-lock.json tsconfig.base.json ./
COPY libs/data-objects ./libs/data-objects
COPY apps/nestjs/package.json ./apps/nestjs/
COPY apps/frontend/package.json ./apps/frontend/
RUN npm ci
COPY apps ./apps
RUN npm run build
# Drop dev dependencies – and the Angular packages, which are already bundled:
# a fresh install of only the backend's production dependencies.
RUN rm -rf node_modules \
 && npm ci --omit=dev --ignore-scripts -w apps/nestjs -w libs/data-objects

# --- Run stage: compiled backend, the contract, production dependencies, Angular build ---
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/libs/data-objects/package.json ./libs/data-objects/
COPY --from=build /app/libs/data-objects/dist ./libs/data-objects/dist
COPY --from=build /app/apps/nestjs/package.json ./apps/nestjs/
COPY --from=build /app/apps/nestjs/dist ./apps/nestjs/dist
COPY --from=build /app/apps/frontend/dist/browser ./apps/frontend/dist/browser
# The official image ships an unprivileged "node" user – no root at runtime.
USER node
EXPOSE 8080
# Exec form: node runs as PID 1 and receives SIGTERM directly (graceful shutdown).
CMD ["node", "apps/nestjs/dist/main.js"]
