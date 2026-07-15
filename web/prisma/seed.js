const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.contactRequest.deleteMany();
  await prisma.recommendation.deleteMany();
  await prisma.reportPhoto.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();

  const demoReporter = await prisma.user.create({
    data: {
      id: "user_demo_reporter",
      name: "Demo Reporter",
      email: "reporter@humtrace.demo",
      phone: "+92-300-0000000",
      role: "REPORTER",
      region: "Punjab"
    }
  });

  const secondReporter = await prisma.user.create({
    data: {
      id: "user_second_reporter",
      name: "Second Reporter",
      email: "second.reporter@humtrace.demo",
      role: "REPORTER",
      region: "Sindh"
    }
  });

  const admin = await prisma.user.create({
    data: {
      id: "user_demo_admin",
      name: "Demo Admin",
      email: "admin@humtrace.demo",
      role: "ADMIN",
      region: "Islamabad Capital Territory"
    }
  });

  const missingReport = await prisma.report.create({
    data: {
      id: "report_missing_0047",
      publicId: "MP-2026-0047",
      type: "MISSING",
      reporterId: demoReporter.id,
      fullName: "Ali Khan",
      approximateAge: "25",
      gender: "Female",
      broadRegion: "Skardu, GB",
      specificLocation: "Skardu city area",
      eventDate: new Date("2026-06-15T00:00:00.000Z"),
      description: "Medium height, dark hair, blue scarf, limited public details.",
      status: "UNDER_REVIEW",
      visibility: "PUBLIC",
      consentToContact: true,
      aiProcessingAllowed: true,
      aiProcessingPolicyVersion: "phase5-development-1",
      aiProcessingAllowedAt: new Date(),
      photoRequirementNote: "Primary person image required before matching workflow."
    }
  });

  const unidentifiedReport = await prisma.report.create({
    data: {
      id: "report_unidentified_0001",
      publicId: "UI-2026-0001",
      type: "UNIDENTIFIED",
      reporterId: secondReporter.id,
      nameUnknown: true,
      approximateAge: "25",
      gender: "Male",
      broadRegion: "Karachi, Sindh",
      specificLocation: "Karachi public assistance center",
      eventDate: new Date("2026-05-20T00:00:00.000Z"),
      description: "Average build, brown jacket, respectful limited public summary.",
      status: "PUBLIC",
      visibility: "PUBLIC",
      consentToContact: true,
      aiProcessingAllowed: true,
      aiProcessingPolicyVersion: "phase5-development-1",
      aiProcessingAllowedAt: new Date(),
      photoRequirementNote: "Name may be unknown, but a human face/person image is still required."
    }
  });

  await prisma.reportPhoto.createMany({
    data: [
      {
        id: "photo_missing_0047_primary",
        reportId: missingReport.id,
        fileName: "mp-2026-0047-primary.jpg",
        storagePath: "demo/photos/mp-2026-0047-primary.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: 245760,
        reviewStatus: "ACCEPTED",
        faceCheckStatus: "NOT_RUN"
      },
      {
        id: "photo_unidentified_0001_primary",
        reportId: unidentifiedReport.id,
        fileName: "ui-2026-0001-primary.jpg",
        storagePath: "demo/photos/ui-2026-0001-primary.jpg",
        mimeType: "image/jpeg",
        fileSizeBytes: 198144,
        reviewStatus: "ACCEPTED",
        faceCheckStatus: "NOT_RUN"
      }
    ]
  });

  await prisma.recommendation.create({
    data: {
      id: "rec_demo_204",
      sourceReportId: missingReport.id,
      targetReportId: unidentifiedReport.id,
      score: 18,
      qualityLabel: "Low possible similarity",
      sharedAttributes: JSON.stringify(["Age range", "Description"]),
      breakdownSummary: JSON.stringify([
        { label: "Face similarity", value: 0 },
        { label: "Age similarity", value: 100 },
        { label: "Gender similarity", value: 0 },
        { label: "Height similarity", value: 0 },
        { label: "Weight similarity", value: 0 },
        { label: "Location similarity", value: 0 },
        { label: "Description similarity", value: 25 }
      ]),
      status: "NEW"
    }
  });

  await prisma.contactRequest.create({
    data: {
      id: "contact_request_demo_102",
      requesterId: demoReporter.id,
      recipientId: secondReporter.id,
      requesterReportId: missingReport.id,
      targetReportId: unidentifiedReport.id,
      message: "I believe this may be related to a missing family member. Please review the limited details.",
      status: "PENDING"
    }
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        id: "timeline_missing_submitted",
        reportId: missingReport.id,
        title: "Report submitted",
        description: "Missing person report entered into the database foundation."
      },
      {
        id: "timeline_unidentified_public",
        reportId: unidentifiedReport.id,
        title: "Public details available",
        description: "Limited unidentified person details are available for public browsing."
      }
    ]
  });

  await prisma.notification.createMany({
    data: [
      {
        id: "notification_contact_request",
        userId: secondReporter.id,
        reportId: unidentifiedReport.id,
        title: "Contact request received",
        message: "A reporter requested consent-based contact for a possible related case."
      },
      {
        id: "notification_recommendation",
        userId: demoReporter.id,
        reportId: missingReport.id,
        title: "Potential match ready",
        message: "A Phase 4 deterministic possible recommendation is available for review."
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        id: "audit_seed_database",
        userId: admin.id,
        action: "Database seeded",
        resource: "Phase 4 local demo",
        status: "Completed"
      },
      {
        id: "audit_contact_request_created",
        userId: demoReporter.id,
        reportId: missingReport.id,
        action: "Contact request created",
        resource: "contact_request_demo_102",
        status: "Pending"
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Database seed completed.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
