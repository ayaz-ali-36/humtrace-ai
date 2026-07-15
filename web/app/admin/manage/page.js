import { AdminManagePage } from "@/components/ui/kit";
import { requireAdmin } from "@/lib/auth";
import { getAdminManageData } from "@/lib/database-views";

export default async function AdminManageRoutePage() {
  await requireAdmin();
  const manageData = await getAdminManageData();
  return <AdminManagePage manageData={manageData} />;
}
