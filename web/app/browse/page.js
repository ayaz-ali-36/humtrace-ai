import { BrowsePage } from "@/components/ui/kit";
import { getPublicReports } from "@/lib/public-reports";

export const dynamic = "force-dynamic";

export default async function BrowseRoutePage() {
  const result = await getPublicReports();
  return <BrowsePage reportsData={result.reports} availability={result.availability} />;
}
