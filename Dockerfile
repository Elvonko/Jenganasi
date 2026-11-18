FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG BETTER_AUTH_SECRET=build-only-secret-value-at-least-32-characters
ARG BETTER_AUTH_URL=http://localhost:3000
ENV DATABASE_URL=${DATABASE_URL} \
    BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET} \
    BETTER_AUTH_URL=${BETTER_AUTH_URL} \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM deps AS migrator
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
CMD ["npm", "run", "db:migrate"]

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/src/db/migrations ./src/db/migrations
EXPOSE 3000
CMD ["node", "server.js"]
