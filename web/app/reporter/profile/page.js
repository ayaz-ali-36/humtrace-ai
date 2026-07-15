import { ProfilePage } from "@/components/ui/kit";
import { requireReporter } from "@/lib/auth";

export default async function ReporterProfilePage() {
  const user = await requireReporter();
  return <ProfilePage user={user} />;
}
