import { ConnectionRequestsPage } from "@/components/ui/kit";
import { requireReporter } from "@/lib/auth";
import { getReporterConnectionRequests } from "@/lib/database-views";

export default async function ReporterConnectionRequestsPage() {
  const user = await requireReporter();
  const requestsData = await getReporterConnectionRequests(user.id);
  return <ConnectionRequestsPage requestsData={requestsData} />;
}
