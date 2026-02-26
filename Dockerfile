ARG DB_TYPE=sqlite

# ── Stage 1: Install dependencies with native compilation tools ──
FROM node:20-alpine AS deps
RUN apk update && apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Stage 2: Build the application ──
FROM node:20-alpine AS builder
WORKDIR /app
ARG DB_TYPE
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1

RUN case "$DB_TYPE" in \
      postgresql) sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma ;; \
      mariadb|mysql) sed -i 's/provider = "sqlite"/provider = "mysql"/' prisma/schema.prisma ;; \
    esac \
    && if [ "$DB_TYPE" = "mariadb" ] || [ "$DB_TYPE" = "mysql" ] || [ "$DB_TYPE" = "postgresql" ]; then \
      sed -i 's/value     String   @default("")/value     String   @default("") @db.Text/' prisma/schema.prisma; \
      sed -i 's/details     String?$/details     String?  @db.Text/' prisma/schema.prisma; \
      sed -i '/releaseNotes/s/String?   @map/String?  @db.Text @map/' prisma/schema.prisma; \
      sed -i '/rawMetadata/s/String?   @map/String?  @db.Text @map/' prisma/schema.prisma; \
      sed -i '/  description.*@map("description")/s/String?   @map/String?  @db.Text @map/' prisma/schema.prisma; \
      sed -i '/  cves.*@map("cves")/s/String?   @map/String?  @db.Text @map/' prisma/schema.prisma; \
      sed -i '/aiSummary/s/String?   @map/String?  @db.Text @map/' prisma/schema.prisma; \
    fi
RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev && npx prisma generate

# ── Stage 3: Production runtime ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk update \
    && apk add --no-cache \
       chromium nss freetype harfbuzz ca-certificates ttf-freefont \
       pango libxslt libwebp libxkbcommon zstd-libs mesa-gl at-spi2-core \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && npm install -g tsx \
    && mkdir -p /app/data && chown nextjs:nodejs /app/data
ENV NODE_PATH=/usr/local/lib/node_modules
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/generated ./generated
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

RUN sed -i 's/\r$//' /app/scripts/docker-entrypoint.sh && chmod +x /app/scripts/docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
