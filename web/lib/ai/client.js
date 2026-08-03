import crypto from "crypto";
import { aiServiceConfig } from "@/lib/ai/config";

async function requestAI(endpoint, { body, contentType = "application/json", timeoutMs = 190000 } = {}) {
  const { url, token } = aiServiceConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url + endpoint, {
      method: endpoint === "/health" ? "GET" : "POST",
      headers: {
        "X-HumTrace-Internal-Token": token,
        "X-Request-ID": crypto.randomUUID(),
        ...(body === undefined ? {} : { "Content-Type": contentType })
      },
      body,
      signal: controller.signal,
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`AI_${response.status}_${String(data.detail || "UNAVAILABLE").toUpperCase()}`);
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("AI_SERVICE_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export const getAIHealth = () => requestAI("/health", { timeoutMs: 3000 });

function validVector(vector) {
  return Array.isArray(vector) && vector.length >= 2 && vector.length <= 4096 && vector.every(Number.isFinite);
}

export async function createFaceEmbedding(bytes, mimeType) {
  const data = await requestAI("/ai/face-embedding", { body: bytes, contentType: mimeType });
  if (data.outcome === "AVAILABLE" && (data.modelId !== "deepface-facenet" || !validVector(data.embedding) || data.embedding.length !== data.dimensions)) throw new Error("AI_FACE_RESPONSE_INVALID");
  if (!new Set(["AVAILABLE", "NO_FACE", "MULTIPLE_FACES", "QUALITY_LIMITED"]).has(data.outcome)) throw new Error("AI_FACE_RESPONSE_INVALID");
  return data;
}

export async function createTextEmbeddings(texts) {
  const data = await requestAI("/ai/text-embedding", { body: JSON.stringify({ texts }) });
  if (data.modelId !== "sentence-transformers-all-MiniLM-L6-v2" || !Array.isArray(data.vectors) || data.vectors.length !== texts.length || data.vectors.some((vector) => !validVector(vector) || vector.length !== data.dimensions)) throw new Error("AI_TEXT_RESPONSE_INVALID");
  return data;
}

export async function calculateCosineSimilarity(source, candidates) {
  const data = await requestAI("/ai/cosine-similarity", { body: JSON.stringify({ source, candidates }), timeoutMs: 10000 });
  const expected = new Set(candidates.map((item) => item.id));
  if (!Array.isArray(data.results) || data.results.length !== candidates.length || data.results.some((item) => !expected.has(item.id) || !Number.isFinite(item.similarity) || item.similarity < 0 || item.similarity > 100)) throw new Error("AI_COSINE_RESPONSE_INVALID");
  return data;
}

export async function calculateRecommendationScore(signals) {
  const data = await requestAI("/ai/recommendation-score", { body: JSON.stringify({ policyVersion: "phase5-additive-1", signals }), timeoutMs: 5000 });
  if (!Number.isFinite(data.score) || data.score < 0 || data.score > 100 || !Number.isFinite(data.availableWeight) || !Array.isArray(data.modalityMask) || data.humanReviewRequired !== true) throw new Error("AI_SCORE_RESPONSE_INVALID");
  return data;
}
