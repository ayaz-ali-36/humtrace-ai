import { ClaimReportPage } from "@/components/ui/kit";
import { requireReporter } from "@/lib/auth";

export default async function ReporterClaimPage({ searchParams }) {
  await requireReporter("/reporter/claim-report");
  const initialCaseId = typeof searchParams?.caseId === "string" ? searchParams.caseId : "";
  return <ClaimReportPage initialCaseId={initialCaseId} />;
}
