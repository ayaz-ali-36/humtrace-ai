import Link from "next/link";
import {
  Content,
  DashboardCard,
  HeroSection,
  PublicShell,
  ReportCard,
  SectionHeader
} from "@/components/ui/kit";
import { getPublicReports } from "@/lib/public-reports";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getPublicReports();
  const recentReports = result.reports.slice(0, 3);
  const steps = [
    ["Submit a report", "Share the details you know and add a clear photograph."],
    ["Review possible matches", "HumTrace compares reports and shows similarities worth checking."],
    ["Request contact", "If something looks relevant, ask the other reporter to connect."]
  ];

  return (
    <PublicShell>
      <HeroSection />
      <Content>
        <section>
          <SectionHeader title="How it works" />
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map(([title, text]) => (
              <DashboardCard key={title} title={title} value="" meta={text} />
            ))}
          </div>
        </section>

        {recentReports.length ? (
          <section>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeader title="Recent public reports" description="Only limited public information is shown." />
              <Link className="text-sm font-semibold text-accent" href="/browse">Browse all reports</Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {recentReports.map((report) => <ReportCard key={report.id} report={report} />)}
            </div>
          </section>
        ) : null}
      </Content>
    </PublicShell>
  );
}
