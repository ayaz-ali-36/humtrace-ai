import { aiServiceConfig, ENGLISH_TEXT_DIMENSIONS, ENGLISH_TEXT_MODEL_ID } from "@/lib/ai/config";

export async function embedEnglishTexts(texts) {
  if (!Array.isArray(texts) || !texts.length || texts.length > 128) throw new Error("AI_TEXT_BATCH_INVALID");
  const { url, token } = aiServiceConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url + "/embed/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-HumTrace-Internal-Token": token
      },
      body: JSON.stringify({ texts }),
      signal: controller.signal,
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.modelId !== ENGLISH_TEXT_MODEL_ID || data.dimensions !== ENGLISH_TEXT_DIMENSIONS) {
      throw new Error("AI_TEXT_SERVICE_UNAVAILABLE");
    }
    if (!Array.isArray(data.vectors) || data.vectors.length !== texts.length) {
      throw new Error("AI_TEXT_RESPONSE_INVALID");
    }
    for (const vector of data.vectors) {
      if (!Array.isArray(vector) || vector.length !== ENGLISH_TEXT_DIMENSIONS || vector.some((value) => !Number.isFinite(value))) {
        throw new Error("AI_TEXT_VECTOR_INVALID");
      }
    }
    return data.vectors;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("AI_TEXT_SERVICE_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
