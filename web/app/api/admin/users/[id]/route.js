import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ROLES, USER_STATUS } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

const actions = {
  activate: USER_STATUS.ACTIVE,
  deactivate: USER_STATUS.DEACTIVATED
};

export async function PATCH(request, { params }) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    }

    const body = await request.json();
    const nextStatus = actions[body.action];
    if (!nextStatus) {
      return NextResponse.json({ error: "Invalid user action." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: params.id },
        select: { id: true, name: true, role: true, status: true }
      });
      if (!user) return { error: "User not found.", statusCode: 404 };

      if (user.role === ROLES.ADMIN && nextStatus === USER_STATUS.DEACTIVATED) {
        const activeAdmins = await tx.user.count({
          where: {
            role: ROLES.ADMIN,
            status: USER_STATUS.ACTIVE,
            id: { not: user.id }
          }
        });
        if (activeAdmins < 1) {
          return { error: "Cannot deactivate the last active admin.", statusCode: 400 };
        }
      }

      const updated = await tx.user.update({
        where: { id: user.id },
        data: { status: nextStatus },
        select: {
          id: true,
          name: true,
          role: true,
          region: true,
          createdAt: true,
          status: true,
          _count: {
            select: { reports: true }
          }
        }
      });

      if (nextStatus === USER_STATUS.DEACTIVATED) {
        await tx.session.deleteMany({ where: { userId: user.id } });
      }

      await tx.auditLog.create({
        data: {
          userId: admin.id,
          action: `User ${nextStatus.toLowerCase()}`,
          resource: `users:${user.id}`,
          status: `Admin changed ${user.name} from ${user.status} to ${nextStatus}`
        }
      });

      return { user: updated };
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        role: result.user.role,
        region: result.user.region || "Not specified",
        date: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(result.user.createdAt),
        reports: result.user._count.reports,
        status: result.user.status === USER_STATUS.ACTIVE ? "Active" : "Deactivated"
      }
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to update user." }, { status: 500 });
  }
}
