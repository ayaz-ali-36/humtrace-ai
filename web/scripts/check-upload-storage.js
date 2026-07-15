const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const pendingPrefix = "pending-local-metadata/";
const root = path.join(__dirname, "..");

async function main() {
  const apiSource = fs.readFileSync(path.join(root, "app", "api", "reports", "route.js"), "utf8");
  if (apiSource.includes(pendingPrefix)) {
    throw new Error("Report API still writes pending-local-metadata paths instead of local upload storage paths.");
  }
  if (apiSource.includes("publicRelativePath") || apiSource.includes('"/uploads/reports')) {
    throw new Error("Report API appears to expose upload paths publicly.");
  }

  const photos = await prisma.reportPhoto.findMany({
    select: {
      id: true,
      fileName: true,
      storagePath: true,
      mimeType: true
    }
  });

  const invalidMetadata = photos.filter((photo) => {
    if (!photo.fileName || !photo.storagePath || !photo.mimeType) return true;
    if (!["image/jpeg", "image/png", "image/webp"].includes(photo.mimeType)) return true;
    return false;
  });

  if (invalidMetadata.length) {
    throw new Error(`Upload metadata check failed for photo records: ${invalidMetadata.map((photo) => photo.id).join(", ")}`);
  }

  const publicUploads = photos.filter((photo) => photo.storagePath.startsWith("/uploads/") || photo.storagePath.startsWith("uploads/"));
  if (publicUploads.length) {
    throw new Error(`Photo records expose public upload paths: ${publicUploads.map((photo) => photo.id).join(", ")}`);
  }

  const storedUploads = photos.filter((photo) => photo.storagePath.startsWith("storage/reports/"));
  const missingFiles = storedUploads.filter((photo) => {
    const normalized = photo.storagePath.split("/").join(path.sep);
    return !fs.existsSync(path.join(root, normalized));
  });

  if (missingFiles.length) {
    throw new Error(`Stored upload files are missing: ${missingFiles.map((photo) => photo.id).join(", ")}`);
  }

  const legacyMetadataOnly = photos.filter((photo) => photo.storagePath.startsWith(pendingPrefix)).length;
  const publicUploadRoot = path.join(root, "public", "uploads", "reports");
  if (fs.existsSync(publicUploadRoot)) {
    const publicFiles = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        if (entry.isFile()) publicFiles.push(full);
      }
    };
    walk(publicUploadRoot);
    if (publicFiles.length) {
      throw new Error("Private report images are still present under public/uploads/reports.");
    }
  }

  const uploadRoot = path.join(root, "storage", "reports");
  const uploadRootExists = fs.existsSync(uploadRoot);
  console.log(`Upload storage check passed: ${photos.length} photo records checked, ${storedUploads.length} stored files verified, ${legacyMetadataOnly} legacy metadata-only records. Upload root exists: ${uploadRootExists}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
