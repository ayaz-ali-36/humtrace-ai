import "server-only";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ROLES, SESSION_COOKIE, USER_STATUS } from "@/lib/auth-constants";

const sessionDays = 7;

function shouldUseSecureCookies() {
  if (process.env.HUMTRACE_SECURE_COOKIES === "true") return true;
  if (process.env.HUMTRACE_SECURE_COOKIES === "false") return false;
  return process.env.NODE_ENV === "production";
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    region: user.region,
    preferredContactMethod: user.preferredContactMethod
  };
}

export function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function safeReturnTo(value, fallback = "/reporter/dashboard") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("://") || value.includes("\\") || /[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

export async function createSession(userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt
    }
  });

  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: shouldUseSecureCookies(),
    expires: expiresAt
  });
}

export async function clearSession() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });

  if (!session || session.expiresAt <= new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (session.user.status !== USER_STATUS.ACTIVE) {
    await prisma.session.deleteMany({ where: { userId: session.userId } });
    return null;
  }

  return publicUser(session.user);
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent("/")}`);
  return user;
}

export async function requireReporter(returnTo = "/reporter/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  if (user.role !== ROLES.REPORTER) redirect("/");
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?returnTo=${encodeURIComponent("/admin/dashboard")}`);
  if (user.role !== ROLES.ADMIN) redirect("/");
  return user;
}
