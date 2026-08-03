const crypto = require("crypto");
const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { PrismaClient } = require("@prisma/client");

const WEB_ROOT = path.resolve(__dirname, "../..");
const REPO_ROOT = path.resolve(WEB_ROOT, "..");
const DEFAULT_WORKSPACE = path.join(REPO_ROOT, "evaluation", "runtime", "faces94-100");

function loadLocalEnv() {
  const envPath = path.join(WEB_ROOT, ".env");
  try {
    const text = require("fs").readFileSync(envPath, "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const separator = line.indexOf("=");
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith("--")) throw new Error(`EVALUATION_ARGUMENT_INVALID_${item}`);
    const key = item.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) options[key] = true;
    else {
      options[key] = value;
      index += 1;
    }
  }
  return options;
}

function resolveWorkspace(options) {
  return path.resolve(options.workspace || process.env.HUMTRACE_EVALUATION_WORKSPACE || DEFAULT_WORKSPACE);
}

function sqliteUrlForPath(filePath) {
  return `file:${path.resolve(filePath).replaceAll("\\", "/")}`;
}

function resolveEvaluationDatabaseUrl(options, workspace) {
  const url = options["database-url"] || process.env.HUMTRACE_EVALUATION_DATABASE_URL || sqliteUrlForPath(path.join(workspace, "humantrace-evaluation.db"));
  if (!url.startsWith("file:")) throw new Error("EVALUATION_DATABASE_MUST_BE_SQLITE_FILE");
  if (!/evaluation/i.test(url)) throw new Error("EVALUATION_DATABASE_NAME_MUST_CONTAIN_EVALUATION");
  const normalDatabaseUrl = process.env.DATABASE_URL || "";
  if (normalDatabaseUrl && normalDatabaseUrl === url) throw new Error("EVALUATION_DATABASE_MUST_NOT_EQUAL_APPLICATION_DATABASE");
  return url;
}

function ensureEvaluationSchema(databaseUrl) {
  const databasePath = path.resolve(databaseUrl.slice("file:".length));
  const markerPath = `${databasePath}.schema-ready`;
  if (fsSync.existsSync(markerPath) && fsSync.existsSync(databasePath)) return "Evaluation schema marker already present.";
  const prismaCli = require.resolve("prisma/build/index.js");
  const runPrisma = (args, timeout = 120000) => spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: WEB_ROOT,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
    timeout,
    windowsHide: true
  });
  const result = process.platform === "win32"
    ? { status: 1, stdout: "", stderr: "Windows workspace uses committed SQL fallback." }
    : runPrisma(["db", "push", "--skip-generate"]);
  if (result.status === 0) {
    fsSync.writeFileSync(markerPath, "prisma-db-push\n", "utf8");
    return String(result.stdout || "").trim();
  }

  // Prisma's Windows schema engine is unreliable in this workspace. A fresh,
  // evaluation-named SQLite file may be initialized from the committed chain.
  if (!/evaluation/i.test(databasePath)) throw new Error("EVALUATION_SCHEMA_FALLBACK_PATH_INVALID");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    try { fsSync.unlinkSync(databasePath + suffix); } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  const migrationsRoot = path.join(WEB_ROOT, "prisma", "migrations");
  const migrationFiles = fsSync.readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsRoot, entry.name, "migration.sql"))
    .filter((filePath) => fsSync.existsSync(filePath))
    .sort();
  if (!migrationFiles.length) throw new Error("EVALUATION_MIGRATIONS_MISSING");
  const combinedMigrationPath = `${databasePath}.combined-migrations.sql`;
  const combinedSql = migrationFiles.map((migrationFile) => `-- ${path.basename(path.dirname(migrationFile))}\n${fsSync.readFileSync(migrationFile, "utf8")}`).join("\n\n");
  fsSync.writeFileSync(combinedMigrationPath, combinedSql, "utf8");
  const migration = runPrisma(["db", "execute", "--file", combinedMigrationPath, "--schema", path.join(WEB_ROOT, "prisma", "schema.prisma")]);
  if (migration.status !== 0) {
    const detail = String(migration.stderr || migration.stdout || "migration failed").trim().slice(-2000);
    throw new Error(`EVALUATION_MIGRATION_CHAIN_FAILED\n${detail}`);
  }
  fsSync.writeFileSync(markerPath, `committed-sql-chain:${migrationFiles.length}\n`, "utf8");
  return `Initialized from ${migrationFiles.length} committed SQL migrations.`;
}

function evaluationPrisma(databaseUrl) {
  return new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: ["error"] });
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(value, null, 2) + "\n", "utf8");
  await fs.rename(temporary, filePath);
}

function configuredKeyId() {
  return process.env.HUMTRACE_EMBEDDING_KEY_ID || "local-v1";
}

function encryptionKey() {
  const value = process.env.HUMTRACE_EMBEDDING_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error("EVALUATION_EMBEDDING_KEY_INVALID");
  return Buffer.from(value, "hex");
}

function vectorBuffer(vector) {
  const buffer = Buffer.alloc(vector.length * 4);
  vector.forEach((value, index) => buffer.writeFloatLE(Number(value), index * 4));
  return buffer;
}

function encryptVector(vector, aad) {
  const iv = crypto.randomBytes(12);
  const keyId = configuredKeyId();
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  cipher.setAAD(Buffer.from(aad));
  const ciphertext = Buffer.concat([cipher.update(vectorBuffer(vector)), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag(), keyId };
}

function decryptVector(record, aad) {
  if ((record.keyId || "local-v1") !== configuredKeyId()) throw new Error("EVALUATION_EMBEDDING_KEY_ID_UNKNOWN");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(record.iv));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(record.authTag));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(record.ciphertext)), decipher.final()]);
  if (plaintext.length !== record.dimensions * 4) throw new Error("EVALUATION_EMBEDDING_DIMENSION_MISMATCH");
  const vector = [];
  for (let offset = 0; offset < plaintext.length; offset += 4) vector.push(plaintext.readFloatLE(offset));
  return vector;
}

function aiConfig() {
  const rawUrl = process.env.HUMTRACE_AI_SERVICE_URL || "http://127.0.0.1:5055";
  const token = process.env.HUMTRACE_AI_INTERNAL_TOKEN || "";
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || !url.port || url.username || url.password || !["", "/"].includes(url.pathname) || url.search || url.hash) throw new Error("EVALUATION_AI_SERVICE_NOT_LOOPBACK");
  if (token.length < 32) throw new Error("EVALUATION_AI_SERVICE_TOKEN_MISSING");
  return { url: url.origin, token };
}

async function aiRequest(endpoint, { bytes, contentType = "application/json", json, timeoutMs = 190000 } = {}) {
  const config = aiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(config.url + endpoint, {
      method: endpoint === "/health" ? "GET" : "POST",
      headers: {
        "X-HumTrace-Internal-Token": config.token,
        "X-Request-ID": crypto.randomUUID(),
        ...((bytes || json !== undefined) ? { "Content-Type": contentType } : {})
      },
      body: bytes || (json === undefined ? undefined : JSON.stringify(json)),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`EVALUATION_AI_${response.status}_${String(data.detail || "UNAVAILABLE").toUpperCase()}`);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("EVALUATION_AI_SERVICE_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  REPO_ROOT,
  WEB_ROOT,
  aiRequest,
  decryptVector,
  encryptVector,
  ensureEvaluationSchema,
  evaluationPrisma,
  loadLocalEnv,
  parseArgs,
  resolveEvaluationDatabaseUrl,
  resolveWorkspace,
  writeJson
};
