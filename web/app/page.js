"use client";

import { Content, DashboardCard, HeroSection, PrivacyNoticeCard, PublicShell, SectionHeader } from "@/components/ui/kit";
import { FileText, Link2, Search, ShieldCheck } from "lucide-react";

export default function HomePage() {
  const steps = [
    ["Report Missing or Unidentified Person", "Submit a missing person or unidentified individual report with available details.", FileText],
    ["Securely Store the Report", "Case details are stored with privacy-first access controls for reporter review.", ShieldCheck],
    ["Deterministic Similarity Review", "Phase 4 compares available public report details to produce possible recommendations.", Search],
    ["Possible Recommendations Help Review", "Human review and consent guide every next step.", Link2]
  ];
  return (
    <PublicShell>
      <HeroSection />
      <Content>
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard title="Missing Cases" value="128" meta="Demo Data" />
          <DashboardCard title="Unidentified Persons" value="42" meta="Demo Data" />
          <DashboardCard title="Possible Recommendations" value="67" meta="Demo Data" />
          <DashboardCard title="Cases Closed" value="15" meta="Demo Data" />
        </section>
        <section>
          <SectionHeader title="How It Works" description="A simple consent-led workflow for reporter review." />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {steps.map(([title, text, Icon]) => <DashboardCard key={title} title={title} value="" meta={text} icon={Icon} />)}
          </div>
        </section>
        <section className="grid gap-5 lg:grid-cols-3">
          <DashboardCard title="Privacy-first message" value="Consent" meta="Contact information remains hidden unless a contact request is accepted." />
          <DashboardCard title="Platform value" value="Review" meta="AI suggestions support human judgment without confirming identity." />
          <DashboardCard title="Academic scope" value="Phase 4" meta="Local database, auth, private uploads, deterministic recommendations, admin moderation, and consent workflows." />
        </section>
        <PrivacyNoticeCard />
      </Content>
    </PublicShell>
  );
}
