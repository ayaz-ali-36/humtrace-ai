import { NextResponse } from "next/server";
import { getCurrentUser, normalizeEmail } from "@/lib/auth";
import { CONTACT_METHOD, ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
import { generateRecommendationsForReport } from "@/lib/recommendations";
import { validateReportPayload } from "@/lib/report-validation";
import { getSettings } from "@/lib/settings";
import { deleteStoredReportPhoto, saveReportPhotoFile, validateImageFile } from "@/lib/upload-storage";

export const runtime = "nodejs";

const typeConfig = {
  missing: {
    prefix: "MP",
    dbType: "MISSING"
  },
  unidentified: {
    prefix: "UI",
    dbType: "UNIDENTIFIED"
  }
};

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function nextPublicId(prefix) {
  const year = new Date().getUTCFullYear();
  const existingReports = await prisma.report.findMany({
    where: {
      publicId: {
        startsWith: `${prefix}-${year}-`
      }
    },
    select: {
      publicId: true
    }
  });

  const maxSequence = existingReports.reduce((max, report) => {
    const sequence = Number(report.publicId.split("-").at(-1));
    return Number.isFinite(sequence) ? Math.max(max, sequence) : max;
  }, 0);

  for (let offset = 1; offset < 1000; offset += 1) {
    const sequence = String(maxSequence + offset).padStart(4, "0");
    const publicId = `${prefix}-${year}-${sequence}`;
    const existing = await prisma.report.findUnique({ where: { publicId } });
    if (!existing) return publicId;
  }

  throw new Error("Unable to generate a unique report ID.");
}

export async function POST(request) {
  try {
    const settings = await getSettings();
    if (settings.maintenanceMode || !settings.reportSubmissionEnabled) {
      return NextResponse.json({ error: "Report submission is temporarily unavailable." }, { status: 503 });
    }

    const formData = await request.formData();
    const photoFile = formData.get("photo");
    const body = Object.fromEntries(formData.entries());
    const config = typeConfig[clean(body.type)];
    if (!config) {
      return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
    }

    const validated = validateReportPayload({ ...body, type: clean(body.type) });
    const photoError = validateImageFile(photoFile);
    const currentUser = await getCurrentUser();

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    if (photoError) {
      return NextResponse.json({ error: photoError }, { status: 400 });
    }

    const values = validated.data;
    const reporterEmail = normalizeEmail(values.reporterEmail);
    const publicId = await nextPublicId(config.prefix);
    let storedPhoto;
    try {
      storedPhoto = await saveReportPhotoFile({ file: photoFile, publicId });
    } catch (error) {
      if (error.message.includes("image signature")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
      const reporter = currentUser?.role === ROLES.REPORTER
        ? await tx.user.findUnique({ where: { id: currentUser.id } })
        : await tx.user.create({
            data: {
              name: values.reporterName || "Demo Reporter",
              email: `anonymous-${publicId.toLowerCase()}@humtrace.local`,
              phone: values.reporterPhone,
              role: ROLES.REPORTER,
              region: values.region || null,
              preferredContactMethod: values.preferredContactMethod || CONTACT_METHOD.EMAIL
            }
          });

      const report = await tx.report.create({
        data: {
          publicId,
          type: config.dbType,
          reporterId: reporter.id,
          fullName: config.dbType === "MISSING" ? values.name : values.name || null,
          nameUnknown: config.dbType === "UNIDENTIFIED" && !values.name,
          approximateAge: values.age,
          gender: values.gender || null,
          heightCm: values.heightCm,
          weightKg: values.weightKg,
          broadRegion: values.region || "Not specified",
          specificLocation: values.locationDetail || null,
          lastSeenLocation: config.dbType === "MISSING" ? values.locationDetail : null,
          foundLocation: config.dbType === "UNIDENTIFIED" ? values.locationDetail : null,
          eventDate: values.date ? new Date(`${values.date}T00:00:00.000Z`) : null,
          description: values.description,
          clothing: values.clothing,
          identifyingFeatures: values.identifyingFeatures,
          medicalCondition: values.medicalCondition,
          reporterRelationship: values.relationship,
          reporterContext: values.reporterContext,
          relationshipContext: values.relationshipContext,
          preferredContactMethod: values.preferredContactMethod,
          publicVisible: values.publicVisible,
          lifecycleStatus: "ACTIVE",
          status: "SUBMITTED",
          visibility: "LIMITED",
          consentToContact: values.consent === "true",
          aiProcessingAllowed: values.aiProcessingConsent,
          aiProcessingPolicyVersion: values.aiProcessingConsent ? "phase5-development-1" : null,
          aiProcessingAllowedAt: values.aiProcessingConsent ? new Date() : null,
          photoRequirementNote: "Reporter confirmed the image is a human face/person image. Automated computer-vision validation is not implemented yet."
        }
      });

      await tx.reportPhoto.create({
        data: {
          reportId: report.id,
          fileName: storedPhoto.fileName,
          storagePath: storedPhoto.storagePath,
          mimeType: clean(photoFile.type),
          fileSizeBytes: storedPhoto.fileSizeBytes,
          reviewStatus: "PENDING",
          faceCheckStatus: "NOT_RUN"
        }
      });

      await tx.timelineEvent.create({
        data: {
          reportId: report.id,
          title: "Report submitted",
          description: "Report details and the local image file were saved for human review."
        }
      });

      await tx.notification.create({
        data: {
          userId: reporter.id,
          reportId: report.id,
          title: "Report submitted",
          message: `Case ${publicId} was saved for human review.`
        }
      });

      await tx.auditLog.create({
        data: {
          userId: reporter.id,
          reportId: report.id,
          action: "Report created",
          resource: publicId,
          status: currentUser ? "Submitted by authenticated reporter" : `Submitted anonymously; typed email not used for ownership${reporterEmail ? ` (${reporterEmail})` : ""}`
        }
      });

      return report;
      });
    } catch (error) {
      await deleteStoredReportPhoto(storedPhoto.storagePath);
      throw error;
    }

    let recommendations = [];
    try {
      recommendations = await generateRecommendationsForReport(result.id);
    } catch (error) {
      console.error("Recommendation generation failed", error);
    }

    return NextResponse.json({
      ok: true,
      caseId: result.publicId,
      status: result.status,
      recommendations,
      recommendationNotice: recommendations.length ? "Possible recommendations generated for human review." : "No public-safe possible recommendations are available yet. You can explore public cases while review continues.",
      message: "Report and local photo file saved for human review."
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to submit report." }, { status: 500 });
  }
}
