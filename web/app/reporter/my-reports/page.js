import { MyReportsPage } from "@/components/ui/kit";
import { requireReporter } from "@/lib/auth";
import { getReporterReports } from "@/lib/database-views";

export default async function ReporterMyReportsPage() {
  const user = await requireReporter();
  const reportsData = await getReporterReports(user.id);
  return <MyReportsPage reportsData={reportsData} />;
}
