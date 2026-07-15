"use client";

import { Content, DashboardCard, PageHeader, PrivacyNoticeCard, PublicShell } from "@/components/ui/kit";
import { Eye, HeartHandshake, Lock, Search, UserCheck } from "lucide-react";

export default function AboutPage() {
  const items = [
    ["AI-Assisted Similarity Analysis", "Possible recommendations compare reporter-submitted information while avoiding identity claims.", Search],
    ["Human Review", "Reporters review similarity details before taking any next step.", Eye],
    ["Consent-Based Connection", "Contact sharing depends on mutual acceptance and reporter privacy preferences.", HeartHandshake],
    ["Privacy-First Design", "Public pages show broad, limited report information only.", Lock],
    ["Academic Purpose", "This Final Year Project phase demonstrates UI scope without backend processing.", UserCheck]
  ];
  return (
    <PublicShell>
      <PageHeader title="About HumTrace AI" description="A privacy-preserving academic platform concept for possible report recommendations in Pakistan." />
      <Content>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map(([title, meta, icon]) => <DashboardCard key={title} title={title} value="" meta={meta} icon={icon} />)}
        </div>
        <PrivacyNoticeCard />
      </Content>
    </PublicShell>
  );
}
