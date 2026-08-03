import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";
import { getSettings, setSettings, SettingValidationError } from "@/lib/settings";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== ROLES.ADMIN) {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }
  return NextResponse.json({ settings: await getSettings() });
}

export async function PATCH(request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    }

    const body = await request.json();
    const updated = await setSettings(body.settings || {}, admin.id);
    const runtimeKeys = ["aiAssistanceEnabled", "faceSimilarityEnabled", "textSimilarityEnabled"];
    if (runtimeKeys.some((key) => Object.prototype.hasOwnProperty.call(body.settings || {}, key))) {
      const settings = await getSettings();
      const enabled = settings.aiAssistanceEnabled && (settings.faceSimilarityEnabled || settings.textSimilarityEnabled);
      await prisma.aIProcessingJob.updateMany({
        where: { status: enabled ? "WAITING_CONFIG" : { in: ["PENDING", "RETRYABLE", "RUNNING"] } },
        data: enabled
          ? { status: "PENDING", availableAt: new Date(), retryAt: null, safeErrorCode: null, leaseOwner: null, leaseExpiresAt: null }
          : { status: "WAITING_CONFIG", safeErrorCode: "AI_ASSISTANCE_DISABLED", leaseOwner: null, leaseExpiresAt: null }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: "System settings updated",
        resource: "settings:system",
        status: updated.map((setting) => `${setting.key}=${setting.value}`).join("; ")
      }
    });

    return NextResponse.json({ ok: true, settings: await getSettings() });
  } catch (error) {
    if (error instanceof SettingValidationError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("Settings update failed", error.message);
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}
