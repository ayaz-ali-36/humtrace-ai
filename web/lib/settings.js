import { prisma } from "@/lib/prisma";

export const defaultSettings = {
  publicSearchEnabled: "true",
  reportSubmissionEnabled: "true",
  recommendationDisplayThreshold: "0",
  duplicateWarningThreshold: "85",
  englishTextEmbeddingEnabled: "false",
  englishTextEmbeddingThreshold: "35",
  maintenanceMode: "false"
};

const booleanKeys = new Set(["publicSearchEnabled", "reportSubmissionEnabled", "englishTextEmbeddingEnabled", "maintenanceMode"]);
const thresholdKeys = new Set(["recommendationDisplayThreshold", "duplicateWarningThreshold", "englishTextEmbeddingThreshold"]);

export function normalizeSettingValue(key, value) {
  const text = String(value ?? "").trim();
  if (booleanKeys.has(key)) {
    if (text === "true" || text === "false") return text;
    throw new Error(`${key} must be true or false.`);
  }
  if (thresholdKeys.has(key)) {
    const number = Number(text);
    if (!Number.isInteger(number) || number < 0 || number > 100) {
      throw new Error(`${key} must be an integer from 0 to 100.`);
    }
    return String(number);
  }
  throw new Error("Unknown setting.");
}

export async function getSettings() {
  const rows = await prisma.systemSetting.findMany();
  const settings = { ...defaultSettings };
  for (const row of rows) settings[row.key] = row.value;
  return {
    publicSearchEnabled: settings.publicSearchEnabled === "true",
    reportSubmissionEnabled: settings.reportSubmissionEnabled === "true",
    recommendationDisplayThreshold: Number(settings.recommendationDisplayThreshold),
    duplicateWarningThreshold: Number(settings.duplicateWarningThreshold),
    englishTextEmbeddingEnabled: settings.englishTextEmbeddingEnabled === "true",
    englishTextEmbeddingThreshold: Number(settings.englishTextEmbeddingThreshold),
    englishTextEmbeddingDevelopmentMode: process.env.HUMTRACE_AI_DEVELOPMENT_MODE === "true",
    maintenanceMode: settings.maintenanceMode === "true"
  };
}

export async function setSettings(values, adminId) {
  const entries = Object.entries(values).filter(([key]) => key in defaultSettings);
  const updated = [];
  for (const [key, value] of entries) {
    const normalized = normalizeSettingValue(key, value);
    updated.push(await prisma.systemSetting.upsert({
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
    }));
  }
  return updated;
}
