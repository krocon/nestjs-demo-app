# --- Build stage: install all dependencies, compile TypeScript, drop dev dependencies ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# --- Run stage: only compiled code, production dependencies and static files ---
FROM node:24-alpine
ENV NODE_ENV=production \
    PORT=8080
WORKDIR /app
COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY public ./public
# The official image ships an unprivileged "node" user – no root at runtime.
USER node
EXPOSE 8080
# Exec form: node runs as PID 1 and receives SIGTERM directly (graceful shutdown).
CMD ["node", "dist/main.js"]
