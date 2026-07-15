import { ReporterSidebar } from "@/components/ui/kit";
import { requireReporter } from "@/lib/auth";

export default async function ReporterLayout({ children }) {
  const reporter = await requireReporter();
  return (
    <div className="flex min-h-screen bg-background text-primary">
      <ReporterSidebar name={reporter.name} />
      {children}
    </div>
  );
}
