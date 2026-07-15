import { ReporterDashboard } from "@/components/ui/kit";
import { requireReporter } from "@/lib/auth";
import { getReporterDashboardSummary } from "@/lib/database-views";

export default async function ReporterDashboardPage() {
  const user = await requireReporter();
  const summary = await getReporterDashboardSummary(user.id);
  return <ReporterDashboard user={user} summary={summary} />;
}
