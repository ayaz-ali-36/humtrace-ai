import Link from "next/link";
import { Content, PageHeader, PublicShell } from "@/components/ui/kit";

export default function AboutPage() {
  return (
    <PublicShell>
      <PageHeader
        title="About HumTrace"
        description="A final-year project that helps people submit reports and review possible connections between missing and unidentified person cases."
      />
      <Content narrow>
        <section className="stitch-panel rounded-sm p-6 sm:p-8">
          <h2 className="text-xl font-semibold text-primary">What it does</h2>
          <p className="mt-3 leading-7 text-muted">HumTrace compares photographs, descriptions and basic report details. When two reports look similar, the reporters can review the information and request contact.</p>
          <h2 className="mt-8 text-xl font-semibold text-primary">What it does not do</h2>
          <p className="mt-3 leading-7 text-muted">A match score does not establish someone&apos;s identity. Photographs and contact details stay private, and contact information is shared only after a request is accepted.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link className="inline-flex min-h-11 items-center justify-center rounded-sm bg-accent px-5 py-2.5 text-sm font-semibold text-white" href="/report/missing">Submit a report</Link>
            <Link className="inline-flex min-h-11 items-center justify-center rounded-sm border border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-primary" href="/browse">Browse reports</Link>
          </div>
        </section>
      </Content>
    </PublicShell>
  );
}
