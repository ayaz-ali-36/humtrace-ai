import { ReportFormPage } from "@/components/ui/kit";
import { getCurrentUser } from "@/lib/auth";
import { ROLES } from "@/lib/auth-constants";

export default async function MissingReportPage() {
  const user = await getCurrentUser();
  const reporter = user?.role === ROLES.REPORTER ? user : null;
  return <ReportFormPage type="missing" reporter={reporter} />;
}
