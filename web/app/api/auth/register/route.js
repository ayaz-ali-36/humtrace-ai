import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { normalizeEmail } from "@/lib/auth";
import { CONTACT_METHOD, ROLES, USER_STATUS } from "@/lib/auth-constants";
import { prisma } from "@/lib/prisma";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = clean(body.name);
    const email = normalizeEmail(body.email);
    const phone = clean(body.phone) || null;
    const password = typeof body.password === "string" ? body.password : "";

    if (name.length < 2 || !email.includes("@") || password.length < 8) {
      return NextResponse.json({ error: "Name, valid email, and an 8+ character password are required." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "An account with this email cannot be registered." }, { status: 409 });
    }

    await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role: ROLES.REPORTER,
        status: USER_STATUS.ACTIVE,
        preferredContactMethod: CONTACT_METHOD.EMAIL,
        passwordHash: await bcrypt.hash(password, 10)
      }
    });

    return NextResponse.json({ ok: true, redirectTo: "/login", message: "Account created. Please sign in with your email and password." });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Unable to register account." }, { status: 500 });
  }
}
