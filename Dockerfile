# QueueExpress API - production image untuk Render (dan platform Docker lain).
#
# Kenapa Docker? Monorepo ini memakai Bun + workspace, dan image resmi
# `oven/bun` membuat build reprodusibel tanpa perlu meng-install Bun manual
# di platform hosting.

FROM oven/bun:1.4.0

WORKDIR /app

# ---------------------------------------------------------------------------
# 1) Dependency layer (di-cache selama package.json & bun.lock tidak berubah)
# ---------------------------------------------------------------------------
COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/

RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
# 2) Source + build
# ---------------------------------------------------------------------------
COPY . .

# `prisma generate` (dipanggil oleh build @queueexpress/db) membaca
# prisma.config.ts yang mewajibkan DATABASE_URL/DIRECT_URL. Nilai placeholder
# ini hanya untuk lolos validasi config saat build — tidak dipakai konek.
# Nilai asli di-inject oleh Render saat runtime.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build" \
    bun --filter @queueexpress/shared build \
 && DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build" \
    bun --filter @queueexpress/db build \
 && bun --filter @queueexpress/api build

ENV NODE_ENV=production

# Render menyuntik PORT sendiri; nilai ini hanya dokumentasi/default lokal.
EXPOSE 4000

# Migrasi dijalankan saat start (idempotent) lalu API dinyalakan.
# PORT dari Render otomatis dipakai lewat fallback di env.validation.ts.
CMD ["sh", "-c", "bun run db:deploy && bun --filter @queueexpress/api start"]
