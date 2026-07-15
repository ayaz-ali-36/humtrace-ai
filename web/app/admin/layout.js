import { AdminSidebar } from "@/components/ui/kit";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-screen bg-background text-primary">
      <AdminSidebar name={admin.name} />
      {children}
    </div>
  );
}
