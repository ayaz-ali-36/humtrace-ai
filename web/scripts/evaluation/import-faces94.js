const fs = require("fs/promises");
const path = require("path");
const {
  DATASET_VERSION,
  SCORING_VERSION,
  validateFaces94Dataset
} = require("../../lib/evaluation/faces94-evaluation");
const {
  ensureEvaluationSchema,
  evaluationPrisma,
  loadLocalEnv,
  parseArgs,
  resolveEvaluationDatabaseUrl,
  resolveWorkspace,
  writeJson
} = require("./faces94-common");

const FACE_MODEL_ID = "deepface-facenet";
const FACE_MODEL_VERSION = "deepface-0.0.100-facenet";
const FACE_ARTIFACT_HASH = "90659cc97bfda5999120f95d8e122f4d262cca11715a21e59ba024bcce816d5c";

function dateAtUtc(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function manifestRecord(row) {
  return {
    recordId: row.record_id,
    identityCode: row.identity_code,
    reportType: row.report_type,
    split: row.split,
    expectedMatchRecordId: row.expected_match_record_id,
    matchGroupId: row.match_group_id,
    databaseReportId: row.database_report_id,
    databasePhotoId: row.database_photo_id,
    publicId: row.public_id,
    imagePath: row.image_absolute_path,
    imageSha256: row.image_sha256,
    imageSizeBytes: row.image_size_bytes,
    syntheticMetadata: true,
    visibility: "EVALUATION_ONLY"
  };
}

async function main() {
  loadLocalEnv();
  const options = parseArgs(process.argv.slice(2));
  if (!options.dataset) throw new Error("Usage: node scripts/evaluation/import-faces94.js --dataset <folder> [--workspace <folder>]");
  const workspace = resolveWorkspace(options);
  const validated = await validateFaces94Dataset(options.dataset);
  await fs.mkdir(workspace, { recursive: true });
  const databaseUrl = resolveEvaluationDatabaseUrl(options, workspace);

  if (options["validate-only"]) {
    console.log(JSON.stringify({
      ok: true,
      mode: "validate-only",
      datasetVersion: DATASET_VERSION,
      datasetRoot: validated.datasetRoot,
      ...validated.summary
    }, null, 2));
    return;
  }

  const schemaOutput = ensureEvaluationSchema(databaseUrl);
  const prisma = evaluationPrisma(databaseUrl);
  try {
    const existing = await prisma.report.findMany({ where: { publicId: { startsWith: "EVAL-F94-" } }, select: { id: true } });
    const existingIds = existing.map((item) => item.id);
    await prisma.$transaction(async (tx) => {
      if (existingIds.length) {
        await tx.recommendation.deleteMany({ where: { OR: [{ sourceReportId: { in: existingIds } }, { targetReportId: { in: existingIds } }] } });
        await tx.report.deleteMany({ where: { id: { in: existingIds } } });
      }
      await tx.evaluationRun.deleteMany({ where: { datasetVersion: DATASET_VERSION } });
      await tx.aIModel.upsert({
        where: { id: FACE_MODEL_ID },
        update: {
          capability: "FACE_EMBEDDING",
          name: "DeepFace FaceNet",
          version: FACE_MODEL_VERSION,
          artifactHash: FACE_ARTIFACT_HASH,
          license: "DeepFace wrapper MIT; wrapped FaceNet weight provenance requires review",
          language: "N/A",
          dimensions: 128,
          status: "DEVELOPMENT_ONLY",
          preprocessingVersion: "opencv-align-l2-1",
          purpose: "Evaluation-only possible-similarity retrieval",
          evaluationStatus: "PENDING"
        },
        create: {
          id: FACE_MODEL_ID,
          capability: "FACE_EMBEDDING",
          name: "DeepFace FaceNet",
          version: FACE_MODEL_VERSION,
          artifactHash: FACE_ARTIFACT_HASH,
          license: "DeepFace wrapper MIT; wrapped FaceNet weight provenance requires review",
          language: "N/A",
          dimensions: 128,
          status: "DEVELOPMENT_ONLY",
          preprocessingVersion: "opencv-align-l2-1",
          purpose: "Evaluation-only possible-similarity retrieval",
          evaluationStatus: "PENDING"
        }
      });

      for (const row of validated.rows) {
        await tx.report.create({
          data: {
            id: row.database_report_id,
            publicId: row.public_id,
            type: row.type,
            fullName: row.report_type === "missing" ? row.person_alias : null,
            nameUnknown: row.report_type === "unidentified",
            approximateAge: String(row.age_years),
            gender: null,
            broadRegion: `${row.last_seen_city}, ${row.last_seen_country}`,
            specificLocation: row.last_seen_city,
            lastSeenLocation: row.report_type === "missing" ? row.last_seen_city : null,
            foundLocation: row.report_type === "unidentified" ? row.last_seen_city : null,
            eventDate: dateAtUtc(row.last_seen_date),
            description: "Evaluation-only record using a real research-dataset photograph and wholly synthetic HumTrace metadata.",
            reporterContext: `EVALUATION_ONLY|${row.identity_code}|${row.split}`,
            preferredContactMethod: "EMAIL",
            publicVisible: false,
            lifecycleStatus: "ACTIVE",
            status: "EVALUATION_ONLY",
            visibility: "EVALUATION_ONLY",
            consentToContact: false,
            aiProcessingAllowed: true,
            aiProcessingPolicyVersion: "phase5-local-1",
            aiProcessingAllowedAt: new Date(),
            contentVersion: 1,
            aiProcessingStatus: "PENDING",
            photoRequirementNote: "Evaluation-only research image. Never expose through public application routes.",
            photos: {
              create: {
                id: row.database_photo_id,
                kind: "PRIMARY",
                fileName: path.basename(row.image_absolute_path),
                storagePath: `evaluation-only/${row.record_id}.jpg`,
                mimeType: "image/jpeg",
                fileSizeBytes: row.image_size_bytes,
                reviewStatus: "EVALUATION_ONLY",
                faceCheckStatus: "NOT_RUN",
                contentHash: row.image_sha256
              }
            },
            aiProcessingJobs: {
              create: {
                modelId: FACE_MODEL_ID,
                jobType: "EVALUATION_FACE_EMBEDDING",
                status: "PENDING",
                idempotencyKey: `EVALUATION_FACE:${row.database_report_id}:1`,
                maxAttempts: 1,
                availableAt: new Date()
              }
            }
          }
        });
      }
    }, { timeout: 120000 });

    const state = {
      safety: {
        evaluationOnly: true,
        realPeople: true,
        syntheticCaseMetadata: true,
        publicDeploymentAllowed: false,
        releaseApprovalAllowed: false
      },
      datasetVersion: DATASET_VERSION,
      scoringVersion: SCORING_VERSION,
      datasetRoot: validated.datasetRoot,
      databaseUrl,
      importedAt: new Date().toISOString(),
      model: { id: FACE_MODEL_ID, version: FACE_MODEL_VERSION, dimensions: 128 },
      summary: validated.summary,
      records: validated.rows.map(manifestRecord)
    };
    await writeJson(path.join(workspace, "import-state.json"), state);
    await writeJson(path.join(workspace, "import-summary.json"), {
      ok: true,
      datasetVersion: DATASET_VERSION,
      workspace,
      databaseUrl,
      schema: schemaOutput.split(/\r?\n/).filter(Boolean).slice(-3),
      ...validated.summary,
      safety: state.safety
    });
    console.log(JSON.stringify({ ok: true, workspace, databaseUrl, ...validated.summary, safety: state.safety }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
