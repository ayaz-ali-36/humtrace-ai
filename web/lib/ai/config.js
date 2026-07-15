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
  const url = process.env.HUMTRACE_AI_SERVICE_URL || "http://127.0.0.1:5055";
  const token = process.env.HUMTRACE_AI_INTERNAL_TOKEN || "";
  if (!url.startsWith("http://127.0.0.1:") && !url.startsWith("http://localhost:")) {
    throw new Error("AI_SERVICE_NOT_LOOPBACK");
  }
  if (token.length < 32) throw new Error("AI_SERVICE_TOKEN_MISSING");
  return { url: url.replace(/\/+$/, ""), token };
}
