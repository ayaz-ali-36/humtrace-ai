import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const extensionByMimeType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

export const maxUploadBytes = 5 * 1024 * 1024;

export function validateImageFile(file) {
  if (!file || typeof file.arrayBuffer !== "function") {
    return "A report photo file is required before submission.";
  }

  if (!allowedMimeTypes.has(file.type)) {
    return "Report photos must be JPG, PNG, or WEBP images.";
  }

  if (file.size > maxUploadBytes) {
    return "Report photos must be 5 MB or smaller.";
  }

  if (file.size < 1) {
    return "Report photo file is empty.";
  }

  return "";
}

function signatureMime(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "";
}

export function validateImageBytes({ bytes, mimeType }) {
  const actual = signatureMime(bytes.subarray(0, 16));
  if (!actual || actual !== mimeType) {
    return "Report photo content does not match an allowed JPG, PNG, or WEBP image signature.";
  }
  return "";
}

function sanitizeFileStem(name) {
  const parsed = path.parse(name || "report-photo");
  const stem = parsed.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return stem || "report-photo";
}

function privateStorageRoot() {
  return path.resolve(process.env.HUMTRACE_PRIVATE_STORAGE_ROOT || path.join(process.cwd(), "storage", "reports"));
}

export function resolvePrivateStoragePath(storagePath) {
  const normalized = String(storagePath || "").replace(/\\/g, "/");
  const prefix = "storage/reports/";
  if (!normalized.startsWith(prefix)) throw new Error("PRIVATE_PHOTO_PATH_INVALID");
  const root = privateStorageRoot();
  const absolute = path.resolve(root, normalized.slice(prefix.length));
  if (!absolute.startsWith(root + path.sep)) throw new Error("PRIVATE_PHOTO_PATH_INVALID");
  return absolute;
}

export async function saveReportPhotoFile({ file, publicId }) {
  const extension = extensionByMimeType[file.type];
  const fileName = `${Date.now()}-${sanitizeFileStem(file.name)}${extension}`;
  const absoluteDirectory = path.join(privateStorageRoot(), publicId);
  const absolutePath = path.join(absoluteDirectory, fileName);

  await mkdir(absoluteDirectory, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  const byteError = validateImageBytes({ bytes, mimeType: file.type });
  if (byteError) {
    throw new Error(byteError);
  }
  await writeFile(absolutePath, bytes);

  return {
    fileName,
    storagePath: path.posix.join("storage", "reports", publicId, fileName),
    fileSizeBytes: bytes.byteLength
  };
}

export async function deleteStoredReportPhoto(storagePath) {
  try {
    await unlink(resolvePrivateStoragePath(storagePath)).catch(() => {});
  } catch {
    // Invalid database paths must never be followed outside private storage.
  }
}
