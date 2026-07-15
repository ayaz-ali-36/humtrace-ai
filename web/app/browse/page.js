import { BrowsePage } from "@/components/ui/kit";
import { getPublicReports } from "@/lib/public-reports";

export default async function BrowseRoutePage() {
  const publicReports = await getPublicReports();
  return <BrowsePage reportsData={publicReports} />;
}
