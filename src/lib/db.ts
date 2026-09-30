import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  })
}

// Always create a fresh client on first import; reuse from global only if it
// has the expected Phase 3 models (guards against stale cached singletons
// after a schema push without a dev-server restart).
let db: PrismaClient
const cached = globalForPrisma.prisma as (PrismaClient & { achievement?: unknown; sosAlert?: unknown }) | undefined
if (cached && cached.achievement !== undefined && cached.sosAlert !== undefined) {
  db = cached
} else {
  if (cached) {
    try { cached.$disconnect?.() } catch { /* ignore */ }
  }
  db = createClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
}

export { db }
