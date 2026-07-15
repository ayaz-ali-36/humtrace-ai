import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";
import { getSettings, setSettings } from "@/lib/settings";
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
    return NextResponse.json({ error: error.message || "Unable to update settings." }, { status: 400 });
  }
}
