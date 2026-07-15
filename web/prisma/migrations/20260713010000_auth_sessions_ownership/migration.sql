-- Phase 2 completion auth/session/ownership migration.
-- Applied locally through scripts/apply-auth-migration.js because Prisma migrate/db push had
-- schema-engine issues in this Windows workspace during earlier Phase 2 work.

ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "preferredContactMethod" TEXT NOT NULL DEFAULT 'EMAIL';

CREATE TABLE "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" DATETIME NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

ALTER TABLE "ContactRequest" ADD COLUMN "activeKey" TEXT;
CREATE UNIQUE INDEX "ContactRequest_activeKey_key" ON "ContactRequest"("activeKey");
