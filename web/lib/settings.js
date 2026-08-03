import { prisma } from "@/lib/prisma";

export const defaultSettings = {
  publicSearchEnabled: "true",
  reportSubmissionEnabled: "true",
  recommendationDisplayThreshold: "0",
  duplicateWarningThreshold: "85",
  aiAssistanceEnabled: "false",
  faceSimilarityEnabled: "false",
  textSimilarityEnabled: "false",
  englishTextEmbeddingEnabled: "false",
  englishTextEmbeddingThreshold: "35",
  maintenanceMode: "false"
};

const booleanKeys = new Set(["publicSearchEnabled", "reportSubmissionEnabled", "aiAssistanceEnabled", "faceSimilarityEnabled", "textSimilarityEnabled", "englishTextEmbeddingEnabled", "maintenanceMode"]);
const thresholdKeys = new Set(["recommendationDisplayThreshold", "duplicateWarningThreshold", "englishTextEmbeddingThreshold"]);

export class SettingValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SettingValidationError";
  }
}

export function normalizeSettingValue(key, value) {
  const text = String(value ?? "").trim();
  if (booleanKeys.has(key)) {
    if (text === "true" || text === "false") return text;
    throw new SettingValidationError(`${key} must be true or false.`);
  }
  if (thresholdKeys.has(key)) {
    const number = Number(text);
    if (!Number.isInteger(number) || number < 0 || number > 100) {
      throw new SettingValidationError(`${key} must be an integer from 0 to 100.`);
    }
    return String(number);
  }
  throw new SettingValidationError("Unknown setting.");
}

export async function getSettings(client = prisma) {
  const rows = await client.systemSetting.findMany();
  const settings = { ...defaultSettings };
  for (const row of rows) settings[row.key] = row.value;
  return {
    publicSearchEnabled: settings.publicSearchEnabled === "true",
    reportSubmissionEnabled: settings.reportSubmissionEnabled === "true",
    recommendationDisplayThreshold: Number(settings.recommendationDisplayThreshold),
    duplicateWarningThreshold: Number(settings.duplicateWarningThreshold),
    aiAssistanceEnabled: settings.aiAssistanceEnabled === "true",
    faceSimilarityEnabled: settings.faceSimilarityEnabled === "true",
    textSimilarityEnabled: settings.textSimilarityEnabled === "true" || settings.englishTextEmbeddingEnabled === "true",
    englishTextEmbeddingEnabled: settings.englishTextEmbeddingEnabled === "true",
    englishTextEmbeddingThreshold: Number(settings.englishTextEmbeddingThreshold),
    englishTextEmbeddingDevelopmentMode: process.env.HUMTRACE_AI_DEVELOPMENT_MODE === "true",
    maintenanceMode: settings.maintenanceMode === "true"
  };
}

export async function setSettings(values, adminId) {
  const entries = Object.entries(values).filter(([key]) => key in defaultSettings);
  const normalizedEntries = entries.map(([key, value]) => [key, normalizeSettingValue(key, value)]);
  return prisma.$transaction(normalizedEntries.map(([key, normalized]) => prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: normalized,
        updatedById: adminId
      },
      create: {
        key,
        value: normalized,
        updatedById: adminId
      }
    })));
}
