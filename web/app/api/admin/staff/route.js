import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getCurrentUser, normalizeEmail } from "@/lib/auth";
import { ROLES, USER_STATUS } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

export async function POST(request) {
  try {
    const admin = await getCurrentUser();
    if (!admin || admin.role !== ROLES.ADMIN) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
    const body = await request.json();
    const name = String(body.name || "").trim();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (name.length < 2 || !email.includes("@") || password.length < 10) {
      return NextResponse.json({ error: "Name, valid email, and a 10+ character password are required." }, { status: 400 });
    }
    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: { name, email, passwordHash: await bcrypt.hash(password, 10), role: ROLES.ADMIN, status: USER_STATUS.ACTIVE } });
      await tx.auditLog.create({ data: { userId: admin.id, action: "Admin staff created", resource: `users:${user.id}`, status: `Admin account created for ${email}` } });
      return user;
    });
    return NextResponse.json({ ok: true, staff: { id: created.id, name: created.name, email: created.email, status: created.status } }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to create Admin staff account." }, { status: 500 });
  }
}
