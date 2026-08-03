export const ENGLISH_TEXT_MODEL_ID = "sentence-transformers-all-MiniLM-L6-v2";
export const ENGLISH_TEXT_MODEL_VERSION = "development-1";
export const ENGLISH_TEXT_DIMENSIONS = 384;
export const ENGLISH_TEXT_SCORING_VERSION = "phase5-english-text-development-1";

export function aiDevelopmentMode() {
  return process.env.HUMTRACE_AI_DEVELOPMENT_MODE === "true";
}

export function englishTextEmbeddingActive(settings) {
  return aiDevelopmentMode() && settings?.englishTextEmbeddingEnabled === true;
}

export function aiServiceConfig() {
  const rawUrl = process.env.HUMTRACE_AI_SERVICE_URL || "http://127.0.0.1:5055";
  const token = process.env.HUMTRACE_AI_INTERNAL_TOKEN || "";
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("AI_SERVICE_NOT_LOOPBACK");
  }
  if (parsed.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(parsed.hostname) || !parsed.port || parsed.username || parsed.password || !["", "/"].includes(parsed.pathname) || parsed.search || parsed.hash) throw new Error("AI_SERVICE_NOT_LOOPBACK");
  if (token.length < 32) throw new Error("AI_SERVICE_TOKEN_MISSING");
  return { url: parsed.origin, token };
}
