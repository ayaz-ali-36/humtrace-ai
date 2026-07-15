import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, normalizeEmail, safeReturnTo } from "@/lib/auth";
import { ROLES, USER_STATUS } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const returnTo = safeReturnTo(body.returnTo, "");
    const adminOnly = body.adminOnly === true;

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!valid || user.status !== USER_STATUS.ACTIVE) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (adminOnly && user.role !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Admin credentials are required for this portal." }, { status: 403 });
    }

    await prisma.session.deleteMany({ where: { userId: user.id } });
    await createSession(user.id);

    const roleHome = user.role === ROLES.ADMIN ? "/admin/dashboard" : "/reporter/dashboard";
    return NextResponse.json({ ok: true, redirectTo: returnTo || roleHome });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
