import { AdminDashboardPage } from "@/components/ui/kit";
import { requireAdmin } from "@/lib/auth";
import { getAdminDashboardData } from "@/lib/database-views";

export default async function AdminDashboardRoutePage() {
  await requireAdmin();
  const dashboardData = await getAdminDashboardData();
  return <AdminDashboardPage dashboardData={dashboardData} />;
}
