import "server-only";

import crypto from "crypto";

const CLAIM_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function normalizeClaimCode(value) {
  let normalized = typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
  if (normalized.startsWith("HTC")) normalized = normalized.slice(3);
  return /^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{16}$/.test(normalized) ? normalized : "";
}

export function hashClaimCode(value) {
  const normalized = normalizeClaimCode(value);
  return normalized ? crypto.createHash("sha256").update(normalized).digest("hex") : "";
}

export function createClaimCode() {
  const bytes = crypto.randomBytes(16);
  const raw = Array.from(bytes, (byte) => CLAIM_ALPHABET[byte & 31]).join("");
  return `HTC-${raw.match(/.{1,4}/g).join("-")}`;
}
