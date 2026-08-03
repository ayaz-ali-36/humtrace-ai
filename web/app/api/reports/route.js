import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
import { enqueueReportAI } from "@/lib/ai/jobs";
import { createClaimCode, hashClaimCode } from "@/lib/report-claims";
import { validateReportPayload } from "@/lib/report-validation";
import { getSettings } from "@/lib/settings";
import { generateRecommendationsForReport } from "@/lib/recommendations";
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

    const currentUser = await getCurrentUser();
    const currentReporter = currentUser?.role === ROLES.REPORTER ? currentUser : null;

    const formData = await request.formData();
    const photoFile = formData.get("photo");
    const body = Object.fromEntries(formData.entries());
    const config = typeConfig[clean(body.type)];
    if (!config) {
      return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
    }

    const validated = validateReportPayload({
      ...body,
      type: clean(body.type),
      reporterName: currentReporter?.name || body.reporterName,
      reporterEmail: currentReporter?.email || body.reporterEmail,
      reporterPhone: currentReporter?.phone || body.reporterPhone || "",
      preferredContactMethod: currentReporter?.preferredContactMethod || body.preferredContactMethod
    });
    const photoError = validateImageFile(photoFile);

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    if (photoError) {
      return NextResponse.json({ error: photoError }, { status: 400 });
    }

    const values = validated.data;
    const publicId = await nextPublicId(config.prefix);
    const claimCode = currentReporter ? null : createClaimCode();
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
      const reporter = currentReporter
        ? await tx.user.findUnique({ where: { id: currentReporter.id } })
        : null;
      if (currentReporter && !reporter) throw new Error("AUTHENTICATED_REPORTER_NOT_FOUND");

      const initialVisibility = values.publicVisible ? "PUBLIC" : "LIMITED";
      const initialStatus = values.publicVisible ? "PUBLIC" : "SUBMITTED";
      const initialAIStatus = values.aiProcessingConsent
        ? values.publicVisible ? "PENDING" : "WAITING_VISIBILITY"
        : "DISABLED";
      const report = await tx.report.create({
        data: {
          publicId,
          type: config.dbType,
          reporterId: reporter?.id || null,
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
          status: initialStatus,
          visibility: initialVisibility,
          consentToContact: values.consent === "true",
          aiProcessingAllowed: values.aiProcessingConsent,
          aiProcessingPolicyVersion: values.aiProcessingConsent ? "phase5-local-1" : null,
          aiProcessingAllowedAt: values.aiProcessingConsent ? new Date() : null,
          aiProcessingStatus: initialAIStatus,
          photoRequirementNote: "Reporter confirmed the image is relevant. It remains private while consented recommendation processing and later administrative moderation stay separately controlled."
        }
      });

      await tx.reportPhoto.create({
        data: {
          reportId: report.id,
          fileName: storedPhoto.fileName,
          storagePath: storedPhoto.storagePath,
          mimeType: clean(photoFile.type),
          fileSizeBytes: storedPhoto.fileSizeBytes,
          reviewStatus: "SELF_CONFIRMED",
          faceCheckStatus: "NOT_RUN"
        }
      });

      await tx.timelineEvent.create({
        data: {
          reportId: report.id,
          title: "Report submitted",
          description: values.publicVisible
            ? "Report details were saved and entered the public recommendation workflow."
            : "Report details were saved with limited visibility."
        }
      });

      if (!reporter) {
        await tx.reportClaim.create({
          data: {
            reportId: report.id,
            tokenHash: hashClaimCode(claimCode),
            submitterName: values.reporterName,
            submitterEmail: values.reporterEmail.toLowerCase(),
            submitterPhone: values.reporterPhone,
            preferredContactMethod: values.preferredContactMethod
          }
        });
      } else {
        await tx.notification.create({
          data: {
            userId: reporter.id,
            reportId: report.id,
            title: "Report submitted",
            message: values.publicVisible
              ? `Case ${publicId} was saved and entered the recommendation workflow.`
              : `Case ${publicId} was saved with limited visibility.`
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: reporter?.id || null,
          reportId: report.id,
          action: "Report created",
          resource: publicId,
          status: reporter ? "Submitted by authenticated reporter" : "Public submission awaiting secure account claim"
        }
      });

      if (report.aiProcessingAllowed) {
        await enqueueReportAI(tx, report, values.publicVisible ? "PENDING" : "WAITING_VISIBILITY");
      }

      const recommendations = await generateRecommendationsForReport(report.id, tx);
      return { report, recommendations: recommendations.slice(0, 5) };
      });
    } catch (error) {
      await deleteStoredReportPhoto(storedPhoto.storagePath);
      throw error;
    }

    return NextResponse.json({
      ok: true,
      caseId: result.report.publicId,
      status: result.report.status,
      claimCode,
      ownership: currentReporter ? "ACCOUNT_OWNED" : "AWAITING_CLAIM",
      recommendations: result.recommendations,
      aiProcessingStatus: result.report.aiProcessingStatus,
      recommendationNotice: result.recommendations.length
        ? `Possible matches are shown below.${claimCode ? " Sign in with the submitted email and claim this report to manage them." : ""}`
        : result.report.aiProcessingStatus === "PENDING"
          ? `We are checking for possible matches.${claimCode ? " Sign in and claim this report to review them later." : " They will appear in your account."}`
          : "No possible matches are available yet. Your report was saved.",
      message: claimCode
        ? "Report and photograph saved. Keep the one-time claim code to manage the report after signing in."
        : "Report and photograph saved."
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to submit report." }, { status: 500 });
  }
}
