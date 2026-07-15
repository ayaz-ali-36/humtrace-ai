import { z } from "zod";
import { CONTACT_METHOD } from "@/lib/auth-constants";

const reportTypes = ["missing", "unidentified"];
const genders = ["Female", "Male", "Other", "Not specified", ""];
const relationships = ["Family Member", "Police/Authority", "Friend", "Community Member", "Organization", "Other"];
const text = (max) => z.string().trim().max(max).optional().or(z.literal(""));
const fieldLabels = {
  type: "Report type",
  name: "Full name",
  age: "Estimated age",
  heightFeet: "Height in feet",
  gender: "Gender",
  heightCm: "Height",
  weightKg: "Weight",
  region: "Broad region/city",
  locationDetail: "Location detail",
  date: "Date",
  description: "Physical description",
  clothing: "Clothing",
  identifyingFeatures: "Identifying features",
  medicalCondition: "Medical condition",
  reporterName: "Reporter name",
  reporterPhone: "Reporter phone",
  reporterEmail: "Reporter email",
  relationship: "Relationship",
  reporterContext: "Reporter context",
  relationshipContext: "Relationship context",
  preferredContactMethod: "Preferred contact method",
  publicVisible: "Public visibility request",
  aiProcessingConsent: "AI processing permission",
  photoConfirm: "Photo confirmation",
  consent: "Consent"
};

function normalizeGender(value) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "female") return "Female";
  if (normalized === "male") return "Male";
  if (normalized === "other") return "Other";
  if (normalized === "not specified") return "Not specified";
  return value;
}

function validPastOrTodayDate(value) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date <= new Date();
}

function numericValue(value) {
  const textValue = typeof value === "string" ? value.trim() : value;
  if (textValue === "" || textValue === null || textValue === undefined) return null;
  const number = Number(textValue);
  return Number.isFinite(number) ? number : null;
}

function friendlyIssue(issue) {
  const key = issue.path?.[0];
  const label = fieldLabels[key] || "This field";

  if (issue.code === "invalid_enum_value") {
    if (key === "gender") return "Choose Gender from the list: Female, Male, Other, or Not specified.";
    if (key === "relationship") return "Choose your Relationship from the list.";
    if (key === "preferredContactMethod") return "Choose a preferred contact method.";
    if (key === "publicVisible") return "Choose whether this report should be requested for public review.";
    if (key === "photoConfirm") return "Confirm the uploaded image shows a human face/person.";
    if (key === "consent") return "Consent is required before submitting a local report.";
    return `${label} has an unsupported value.`;
  }

  if (issue.code === "invalid_type") {
    return `${label} is required.`;
  }

  if (issue.message && issue.message !== "Invalid input") {
    return issue.message;
  }

  return `${label} is invalid. Please review this field.`;
}

const baseReportSchema = z.object({
  type: z.enum(reportTypes),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  age: z.string().trim().min(1, "Estimated age is required.").max(40),
  gender: z.enum(genders).optional().default(""),
  heightFeet: z.string().trim().max(10).optional().or(z.literal("")),
  heightCm: z.coerce.number().int().min(20).max(260).optional().or(z.literal("")),
  weightKg: z.string().trim().max(10).optional().or(z.literal("")),
  region: text(120),
  locationDetail: text(180),
  date: z.string().trim().optional().or(z.literal("")).refine(validPastOrTodayDate, "Use a valid date that is not in the future."),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(1200),
  clothing: text(500),
  identifyingFeatures: text(500),
  medicalCondition: text(300),
  reporterName: z.string().trim().min(2, "Reporter name is required.").max(120),
  reporterPhone: text(60),
  reporterEmail: z.string().trim().email("Enter a valid email address.").max(180),
  relationship: z.enum(relationships).optional().or(z.literal("")),
  reporterContext: text(500),
  relationshipContext: text(500),
  preferredContactMethod: z.enum([CONTACT_METHOD.EMAIL, CONTACT_METHOD.PHONE]).default(CONTACT_METHOD.EMAIL),
  publicVisible: z.enum(["true", "false"]).default("false"),
  aiProcessingConsent: z.enum(["true", "false"]).default("false"),
  photoConfirm: z.enum(["true"], { errorMap: () => ({ message: "Confirm the uploaded image shows a human face/person." }) }),
  consent: z.enum(["true"], { errorMap: () => ({ message: "Consent is required for local report submission." }) })
});

export function validateReportPayload(raw) {
  const parsed = baseReportSchema.safeParse({
    ...raw,
    gender: normalizeGender(raw.gender)
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: friendlyIssue(parsed.error.issues[0] || {})
    };
  }

  const data = parsed.data;
  if (data.type === "missing" && (!data.name || data.name.trim().length < 2)) {
    return { ok: false, error: "Missing person reports require a full name." };
  }

  const heightFeet = numericValue(data.heightFeet);
  const heightCm = heightFeet ? Math.round(heightFeet * 30.48) : numericValue(data.heightCm);
  if (!heightCm) {
    return { ok: false, error: "Height in feet is required." };
  }
  if (heightCm < 30 || heightCm > 260) {
    return { ok: false, error: "Height should be a realistic value in feet." };
  }

  const weightKg = numericValue(data.weightKg);
  if (!weightKg) {
    return { ok: false, error: "Weight is required." };
  }
  if (weightKg < 2 || weightKg > 300) {
    return { ok: false, error: "Weight should be a realistic value." };
  }

  return {
    ok: true,
    data: {
      ...data,
      heightCm,
      weightKg: Math.round(weightKg),
      publicVisible: data.publicVisible === "true",
      aiProcessingConsent: data.aiProcessingConsent === "true",
      region: data.region || null,
      locationDetail: data.locationDetail || null,
      date: data.date || null,
      clothing: data.clothing || null,
      identifyingFeatures: data.identifyingFeatures || null,
      medicalCondition: data.medicalCondition || null,
      relationship: data.relationship || null,
      reporterContext: data.reporterContext || null,
      relationshipContext: data.relationshipContext || null,
      reporterPhone: data.reporterPhone || null
    }
  };
}

export function normalizeTrackingCode(value) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!/^(MP|UI)-\d{4}-\d{4}$/.test(code)) return "";
  return code;
}
