import { RecommendationsPage } from "@/components/ui/kit";
import { requireReporter } from "@/lib/auth";
import { getReporterRecommendations } from "@/lib/recommendations";

export default async function ReporterRecommendationsPage() {
  const user = await requireReporter();
  const recommendationsData = await getReporterRecommendations(user.id);
  return <RecommendationsPage recommendationsData={recommendationsData} />;
}
