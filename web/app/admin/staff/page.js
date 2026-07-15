import { AdminStaffPage } from "@/components/ui/kit";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StaffPage() {
  await requireAdmin();
  const staff = await prisma.user.findMany({ where: { role: "ADMIN" }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, status: true, createdAt: true } });
  return <AdminStaffPage initialStaff={staff.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />;
}
