import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";
import { resolvePrivateStoragePath } from "@/lib/upload-storage";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const showDemoPhotos = process.env.HUMTRACE_DEMO_PUBLIC_REPORT_PHOTOS === "true";
    const user = await getCurrentUser();

    const report = await prisma.report.findUnique({
      where: { publicId: params.publicId },
      select: {
        reporterId: true,
        status: true,
        visibility: true,
        publicVisible: true,
        lifecycleStatus: true,
        photos: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { storagePath: true, mimeType: true, reviewStatus: true }
        }
      }
    });
    if (!report) return NextResponse.json({ error: "Report not found." }, { status: 404 });
    const photo = report.photos[0];
    const locallyPublic = showDemoPhotos
      && report.lifecycleStatus === "ACTIVE"
      && report.visibility === "PUBLIC"
      && report.publicVisible
      && !["HIDDEN", "ARCHIVED", "CLOSED_BY_REPORTER"].includes(report.status)
      && ["SELF_CONFIRMED", "ACCEPTED"].includes(photo?.reviewStatus);
    const privatelyAuthorized = user && (user.role === ROLES.ADMIN || report.reporterId === user.id);
    if (!locallyPublic && !privatelyAuthorized) {
      if (!user) return NextResponse.json({ error: "Sign in is required." }, { status: 401 });
      return NextResponse.json({ error: "You cannot view this private report photo." }, { status: 403 });
    }
    if (!photo) return NextResponse.json({ error: "No active report photo is available." }, { status: 404 });

    const absolutePath = resolvePrivateStoragePath(photo.storagePath);
    const bytes = await readFile(absolutePath);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": photo.mimeType,
        "Cache-Control": "no-store, max-age=0",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error?.code === "ENOENT") return NextResponse.json({ error: "The private report photo is unavailable." }, { status: 404 });
    console.error("Private report photo read failed", error.message);
    return NextResponse.json({ error: "Unable to load the private report photo." }, { status: 500 });
  }
}
