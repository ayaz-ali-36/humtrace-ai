"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  Archive,
  Bell,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Home,
  Lock,
  LogOut,
  Menu,
  Search,
  Send,
  Shield,
  SlidersHorizontal,
  Upload,
  User,
  X
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { adminRoutes, publicRoutes, reporterRoutes } from "@/lib/routes";
import { privacyNotice, regions } from "@/lib/constants";
import {
  auditLogs,
  chartReportsByCity,
  chartReportsByMonth,
  connectionRequests,
  notifications,
  reports,
  users
} from "@/data/mock-data";
import { clampScore, cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-sm border border-[var(--border)] bg-deep px-4 py-4 text-sm text-primary placeholder:text-muted focus:border-accent";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] transition focus-visible:ring-2 focus-visible:ring-accent";

function LogoText({ className = "text-xl" }) {
  return (
    <span className={`block font-display ${className} font-extrabold uppercase tracking-normal text-white`}>
      HumTrace <span className="text-accent">AI</span>
    </span>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-deep/98 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-0 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-sm bg-[var(--accent-soft)] text-accent">
            <Shield size={22} aria-hidden="true" />
          </span>
          <span>
            <LogoText />
            <span className="hidden font-mono text-[0.62rem] uppercase tracking-[0.16em] text-accent sm:block">Privacy-first reporting</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Public navigation">
          {publicRoutes.map((route) => (
            <Link key={route.href} href={route.href} className="border-b-2 border-transparent px-4 py-5 text-sm text-muted hover:border-accent hover:text-white">
              {route.label}
            </Link>
          ))}
          <Link href="/login" className={`${buttonClass} border border-[var(--border)] text-primary`}>
            Sign In
          </Link>
          <Link href="/register" className={`${buttonClass} bg-accent text-deep`}>
            Register
          </Link>
        </nav>
        <button className="my-2 grid h-11 w-11 place-items-center rounded-sm border border-[var(--border)] lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu size={22} />
        </button>
      </div>
      {open ? <MobileDrawer title="HumTrace AI" onClose={() => setOpen(false)} routes={[...publicRoutes, { href: "/login", label: "Login" }, { href: "/register", label: "Register" }]} /> : null}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-deep">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-12 text-sm text-muted sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-extrabold uppercase text-white">HumTrace <span className="text-accent">AI</span></p>
          <p className="mt-2 max-w-xl">Phase 4 local demo for privacy-preserving reporting, deterministic possible recommendations, and consent-based contact review in Pakistan.</p>
          <p className="mt-3 max-w-xl text-xs">AI recommendations assist human decision-making and do not constitute identity confirmation.</p>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.14em] text-primary">Rescue: 1122 • Police: 15 • Edhi Foundation: 115 • Chhipa Welfare: 1020</p>
        </div>
        <div>
          <p className="font-semibold text-primary">Portals</p>
          <Link className="mt-2 block min-h-10 py-2 hover:text-white" href="/reporter/dashboard">Reporter Account</Link>
          <Link className="mt-1 block min-h-10 py-2 hover:text-white" href="/admin/login">Admin Portal</Link>
        </div>
        <div>
          <p className="font-semibold text-primary">Safety</p>
          <p className="mt-2">AI Does Not Confirm Identity. Human Review Required.</p>
        </div>
      </div>
    </footer>
  );
}

export function PublicShell({ children }) {
  return (
    <div className="min-h-screen bg-background text-primary">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="noise border-b border-[var(--border)]">
      <div className="mx-auto grid min-h-[720px] max-w-[1500px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
        <div className="self-center text-center lg:text-left">
          <DemoDataNotice />
          <h1 className="stitch-title mx-auto mt-7 max-w-4xl font-display text-4xl uppercase tracking-normal sm:text-6xl lg:mx-0 lg:text-7xl">
            Finding the Missing.<br />Identifying the Unknown.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted lg:mx-0">
            Privacy-preserving reporting and deterministic similarity suggestions connecting missing-person reports with public unidentified-person records across Pakistan.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
            <Link href="/search" className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`}><Search size={16} /> Smart Search</Link>
            <Link href="/report/missing" className={`${buttonClass} border border-[var(--border)] text-primary`}>Report Missing Person</Link>
            <Link href="/report/unidentified" className={`${buttonClass} border border-[var(--border)] text-primary`}>Report Unidentified Person</Link>
          </div>
          <Link href="/browse" className="mt-5 inline-flex min-h-10 items-center gap-2 py-2 text-sm font-semibold text-accent">
            Search public cases <ChevronRight size={16} />
          </Link>
        </div>
        <div className="stitch-panel self-center rounded-sm p-5 shadow-soft">
          <div className="rounded-sm bg-deep p-6">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
              <div>
                <p className="text-sm text-muted">Deterministic Similarity Scoring</p>
                <p className="font-mono text-2xl text-white">Phase 4 Preview</p>
              </div>
              <StatusBadge status="Human Review Required" />
            </div>
            <div className="mt-5 grid gap-3">
              {[
                { label: "Face similarity unavailable", value: 0 },
                { label: "Age similarity", value: 80 },
                { label: "Gender similarity", value: 100 },
                { label: "Location similarity", value: 0 },
                { label: "Description similarity", value: 20 },
                { label: "Illustrative overall score", value: 22 }
              ].map((item) => (
                <ScoreBar key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
            <PrivacyNoticeCard className="mt-5" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageHeader({ eyebrow = "HumTrace AI", title, description, action }) {
  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-8 pt-10 sm:px-8 lg:pt-12">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="stitch-label">{eyebrow}</p>
          <h1 className="stitch-title mt-3 font-display text-3xl uppercase sm:text-5xl lg:text-6xl">{title}</h1>
          {description ? <p className="mt-4 max-w-4xl text-lg leading-8 text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
    </div>
  );
}

export function SectionHeader({ title, description }) {
  return (
    <div className="mb-5">
      <h2 className="font-mono text-xl font-bold uppercase tracking-[0.16em] text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
    </div>
  );
}

export function DashboardCard({ title, value, icon: Icon = FileText, meta }) {
  return (
    <article className="stitch-panel rounded-sm p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-muted">{title}</p>
          {value !== "" ? <p className="mt-4 font-display text-4xl font-extrabold text-white">{value}</p> : null}
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-sm bg-[var(--accent-soft)] text-accent">
          <Icon size={22} />
        </span>
      </div>
      {meta ? <p className="mt-4 text-sm leading-6 text-muted">{meta}</p> : null}
    </article>
  );
}

export function StatCard(props) {
  return <DashboardCard {...props} />;
}

export function ReportCard({ report, onViewDetails }) {
  return (
    <article className="stitch-panel overflow-hidden rounded-sm">
      <div className="flex aspect-[16/8] items-center justify-center border-b border-[var(--border)] bg-[var(--accent-soft)]">
        <User className="text-accent" size={40} aria-hidden="true" />
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-accent">{report.id}</span>
          <StatusBadge status={report.status} />
        </div>
        <h3 className="mt-4 font-display text-2xl font-extrabold uppercase text-white">{report.name || (report.type === "Missing Person" ? "Ali Khan" : "Unknown Person")}</h3>
        <p className="mt-2 text-sm text-muted">{report.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Info label="Case ID" value={report.id.replace("HT-M", "MP").replace("HT-U", "UI")} />
          <Info label="Age / Gender" value={`${report.age} • ${report.gender || "Not specified"}`} />
          <Info label="Location" value={report.region} />
          <Info label="Case type" value={report.type === "Missing Person" ? "Missing" : "Unidentified"} />
        </dl>
        {onViewDetails ? <button className={`${buttonClass} mt-5 w-full border border-[var(--border)] text-primary`} onClick={() => onViewDetails(report)}>View Details</button> : null}
      </div>
    </article>
  );
}

function ReportDetailsModal({ report, onClose }) {
  const [requestSent, setRequestSent] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [authState, setAuthState] = useState({ checked: false, user: null });

  useEffect(() => {
    let active = true;
    setRequestSent(false);
    setRequestOpen(false);
    setRequestMessage("");
    setRequestError("");
    setAuthState({ checked: false, user: null });
    if (!report) return () => { active = false; };

    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((result) => {
        if (active) setAuthState({ checked: true, user: result.user || null });
      })
      .catch(() => {
        if (active) setAuthState({ checked: true, user: null });
      });

    return () => { active = false; };
  }, [report]);

  if (!report) return null;
  const publicCaseId = report.id.replace("HT-M", "MP").replace("HT-U", "UI");
  const canRequestContact = authState.user?.role === "REPORTER";
  const submitRequest = async (event) => {
    event.preventDefault();
    setRequestError("");
    const response = await fetch("/api/contact-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reportId: publicCaseId,
        message: requestMessage
      })
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      setRequestSent(true);
      setRequestOpen(false);
      return;
    }
    setRequestError(result.error || "Unable to send the contact request.");
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-sm border border-[var(--border)] bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div>
            <p className="stitch-label">{publicCaseId}</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold uppercase text-white">{report.name || "Unknown Person"}</h2>
            <p className="mt-2 text-sm text-muted">Limited public details only. Private notes and contact information are hidden.</p>
          </div>
          <button className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-[var(--border)] text-primary hover:bg-surface" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-sm border border-[var(--border)] bg-deep p-5">
            <div className="flex aspect-[16/11] items-center justify-center rounded-sm bg-[var(--accent-soft)]">
              <User className="text-accent" size={56} aria-hidden="true" />
            </div>
            <p className="mt-4 text-xs leading-6 text-muted">Public photo placeholder. Stored report images are private local files and face/person validation belongs to a later computer-vision phase.</p>
          </div>
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={report.status} />
            </div>
            <p className="text-sm leading-7 text-primary">{report.description}</p>
            <dl className="grid gap-3 sm:grid-cols-2">
              <Info label="Case type" value={report.type} />
              <Info label="Age / Gender" value={`${report.age} - ${report.gender || "Not specified"}`} />
              <Info label="Broad location" value={report.region} />
              <Info label="Approximate date" value={report.date} />
              <Info label="Visibility" value={report.visibility} />
            </dl>
            <div className="rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted">
              This public detail view is for database browsing only. Human review and mutual consent are required before contact details can be shared.
            </div>
            {requestSent ? (
              <div className="rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary">
                <strong className="text-white">Contact request sent.</strong> The reporter will see this request in their dashboard. Contact details remain hidden until accepted.
              </div>
            ) : null}
            {requestError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary">{requestError}</div> : null}
            <div className="flex flex-col gap-3 sm:flex-row">
              {!authState.checked ? <button className={`${buttonClass} bg-accent text-white opacity-70`} disabled>Checking Sign-In</button> : canRequestContact ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => setRequestOpen(true)}>Request Contact</button> : <Link className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} href="/login?returnTo=/browse">Sign In to Request Contact</Link>}
              <Link href="/track" className={`${buttonClass} border border-[var(--border)] text-primary`}>Track This Case</Link>
              <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={onClose}>Back to Results</button>
            </div>
          </div>
        </div>
        {requestOpen ? (
          <div className="border-t border-[var(--border)] bg-deep p-5">
            <form className="grid gap-4" onSubmit={submitRequest}>
              <div>
                <p className="font-display text-xl font-extrabold uppercase text-white">Request reporter contact</p>
                <p className="mt-2 text-sm leading-6 text-muted">Write a short reason. The request is saved for reporter review, and contact remains hidden until acceptance.</p>
              </div>
              <label>
                <span className="mb-2 block text-sm font-semibold text-primary">Reason for contact</span>
                <textarea className={`${inputClass} min-h-28`} value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} required placeholder="Example: I think this may be my missing brother because..." />
              </label>
              <div className="rounded-sm border border-[var(--border)] bg-background p-4 text-sm text-muted">
                This does not reveal your phone/email and does not reveal the reporter contact. Contact sharing happens only after approval.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit">Send Request</button>
                <button className={`${buttonClass} border border-[var(--border)] text-primary`} type="button" onClick={() => setRequestOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ConfidenceBadge({ score }) {
  const value = Number(score) || 0;
  const tone = value >= 85 ? "bg-[var(--success)] text-white" : value >= 70 ? "bg-[var(--warning)] text-deep" : "bg-[var(--danger)] text-white";
  const label = value >= 85 ? "High Confidence" : value >= 70 ? "Possible Match" : "Low Confidence";
  return <span className={`inline-flex rounded-full px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.12em] ${tone}`}>{value}% {label}</span>;
}

export function RecommendationCard({ item }) {
  const [hidden, setHidden] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  if (hidden) {
    return <EmptyState title="Potential match hidden" description="This UI-only action does not save changes." />;
  }
  const submitRequest = async (event) => {
    event.preventDefault();
    const response = await fetch("/api/contact-requests", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        reportId: item.similarReportId,
        message: requestMessage
      })
    });
    if (response.ok) {
      setRequestSent(true);
      setRequestOpen(false);
    }
  };
  return (
    <article className="stitch-panel rounded-sm p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="stitch-label">{item.reportId} • Related Case {item.similarReportId}</p>
          <h3 className="mt-3 font-display text-3xl font-extrabold uppercase text-white">Possible Recommendation</h3>
          <p className="mt-2 text-sm text-muted">AI suggestion only — human verification required. A score is not proof of identity.</p>
        </div>
        <ScorePill score={item.score} label={item.textEmbeddingUsed ? "Development Score" : "Overall Score"} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <ScoreBreakdown items={item.breakdown} />
        <div className="rounded-sm border border-[var(--border)] bg-deep p-5">
          <p className="font-semibold text-white">Shared Attributes</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {item.attributes.map((attribute) => (
              <span key={attribute} className="rounded-sm bg-[var(--accent-soft)] px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-accent">{attribute}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">Broad region similarity: {item.region}</p>
        </div>
      </div>
      {requestSent ? (
        <div className="mt-5 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary">
          <strong className="text-white">Contact request sent.</strong> The request was saved for reporter dashboard review.
        </div>
      ) : null}
      {requestOpen ? (
        <form className="mt-5 grid gap-4 rounded-sm border border-[var(--border)] bg-deep p-5" onSubmit={submitRequest}>
          <div>
            <p className="font-semibold text-white">Request contact for this potential match</p>
            <p className="mt-2 text-sm text-muted">Explain why you believe this match should be reviewed. Contact details remain hidden until approval.</p>
          </div>
          <label>
            <span className="mb-2 block text-sm font-semibold text-primary">Reason for contact</span>
            <textarea className={`${inputClass} min-h-24`} value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} required />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit">Send Request</button>
            <button className={`${buttonClass} border border-[var(--border)] text-primary`} type="button" onClick={() => setRequestOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => setRequestOpen(true)}>Request Contact</button>
        <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => setHidden(true)}>Hide Recommendation</button>
        <button className={`${buttonClass} border border-[var(--border)] text-primary`}>Not Relevant to My Case</button>
      </div>
    </article>
  );
}

export function ScoreBreakdown({ items }) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-deep p-5">
      <p className="font-semibold text-white">Score Breakdown</p>
      <div className="mt-4 grid gap-3">
        {items.map((item) => <ScoreBar key={item.label} label={item.label} value={item.value} />)}
      </div>
    </div>
  );
}

function Phase4RecommendationCard({ item, canManage = false }) {
  const [hidden, setHidden] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [status, setStatus] = useState(item.status || "New");
  const [error, setError] = useState("");

  if (hidden) {
    return <EmptyState title="Recommendation hidden" description="This possible recommendation was dismissed from your current view." />;
  }

  const updateRecommendation = async (action, body = {}) => {
    setError("");
    if (!canManage || !item.id) {
      setError("Please sign in to manage recommendations or request contact.");
      return null;
    }
    const response = await fetch(`/api/recommendations/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Unable to update recommendation.");
      return null;
    }
    setStatus(result.status === "CONTACT_REQUESTED" ? "Contact Requested" : result.status === "DISMISSED" ? "Dismissed" : result.status === "VIEWED" ? "Viewed" : status);
    return result;
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    const result = await updateRecommendation("request_contact", { message: requestMessage });
    if (result) {
      setRequestSent(true);
      setRequestOpen(false);
    }
  };

  const dismiss = async () => {
    const result = canManage ? await updateRecommendation("dismiss") : {};
    if (result || !canManage) setHidden(true);
  };

  return (
    <article className="stitch-panel rounded-sm p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="stitch-label">{item.reportId} / Related Case {item.similarReportId}</p>
          <h3 className="mt-3 font-display text-3xl font-extrabold uppercase text-white">Possible Recommendation</h3>
          <p className="mt-2 text-sm text-muted">AI-assisted suggestion only. Human review required. This does not confirm identity.</p>
        </div>
        <ScorePill score={item.score} label="Overall Score" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
        <ScoreBreakdown items={item.breakdown || []} />
        <div className="rounded-sm border border-[var(--border)] bg-deep p-5">
          <p className="font-semibold text-white">Recommendation Details</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(item.attributes || []).map((attribute) => (
              <span key={attribute} className="rounded-sm bg-[var(--accent-soft)] px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-accent">{attribute}</span>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-muted">{item.explanation || "Score uses available report details. Face similarity is not available in this phase."}</p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Info label="Status" value={status} />
            <Info label="Related case type" value={item.targetReport?.type || "Public case"} />
            <Info label="Age" value={item.targetReport?.age || "Not specified"} />
            <Info label="Region" value={item.targetReport?.region || "Not specified"} />
          </dl>
        </div>
      </div>
      {error ? <div className="mt-5 rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary">{error}</div> : null}
      {requestSent ? <div className="mt-5 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary"><strong className="text-white">Contact request sent.</strong> Contact details remain hidden until the recipient accepts.</div> : null}
      {requestOpen ? (
        <form className="mt-5 grid gap-4 rounded-sm border border-[var(--border)] bg-deep p-5" onSubmit={submitRequest}>
          <p className="font-semibold text-white">Request contact for this possible recommendation</p>
          <label>
            <span className="mb-2 block text-sm font-semibold text-primary">Reason for contact</span>
            <textarea className={`${inputClass} min-h-24`} value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} required />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit">Send Request</button>
            <button className={`${buttonClass} border border-[var(--border)] text-primary`} type="button" onClick={() => setRequestOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {canManage ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => setRequestOpen(true)}>Request Contact</button> : <Link className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} href="/login">Sign In to Request Contact</Link>}
        {canManage ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => updateRecommendation("view")}>Mark Viewed</button> : null}
        <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={dismiss}>{canManage ? "Dismiss" : "Hide Recommendation"}</button>
        {!canManage ? <Link className={`${buttonClass} border border-[var(--border)] text-primary`} href="/browse">Explore Public Cases</Link> : null}
      </div>
    </article>
  );
}

function RecommendationResults({ items = [], canManage = false }) {
  const [page, setPage] = useState(0);
  const visible = items.slice(page * 5, page * 5 + 5);
  const hasNext = (page + 1) * 5 < items.length;
  if (!items.length) {
    return (
      <div className="stitch-panel rounded-sm p-6">
        <EmptyState title="No possible recommendations yet" description="You can explore public cases while human review continues." />
        <Link className={`${buttonClass} mt-5 border border-[var(--border)] text-primary`} href="/browse">Explore Public Cases</Link>
      </div>
    );
  }
  return (
    <section className="grid gap-5">
      <div className="rounded-sm border border-[var(--border)] bg-deep p-5 text-sm text-muted">
        {items.some((item) => item.textEmbeddingUsed)
          ? "These possible recommendations use development-only English text embeddings and structured details. Evaluation is deferred, and human review is required."
          : "These are public-safe possible recommendations generated with deterministic local scoring. They do not confirm identity."}
      </div>
      {visible.map((item) => <Phase4RecommendationCard key={item.id || item.similarReportId} item={item} canManage={canManage} />)}
      <div className="flex flex-col gap-3 sm:flex-row">
        {page > 0 ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => setPage((current) => current - 1)}>Previous 5</button> : null}
        {hasNext ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => setPage((current) => current + 1)}>View Next 5</button> : null}
        <Link className={`${buttonClass} border border-[var(--border)] text-primary`} href="/browse">Explore Public Cases</Link>
      </div>
    </section>
  );
}

export function ConnectionRequestCard({ request }) {
  const [status, setStatus] = useState(request.status);
  const [contact, setContact] = useState(request.contact);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const accepted = status === "Accepted";
  const review = async (action) => {
    if (action === "accept" && !window.confirm("If you accept, your selected contact method will be shared with the other reporter. This does not confirm identity.")) {
      return;
    }
    setPending(action);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/contact-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update request.");
      const nextStatus = result.status === "ACCEPTED" ? "Accepted" : result.status === "DECLINED" ? "Declined" : "Cancelled";
      setStatus(nextStatus);
      setContact(result.contact ? `${result.contact.method}: ${result.contact.value}` : "Hidden until acceptance");
      setNotice(`Contact request ${nextStatus.toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending("");
    }
  };
  return (
    <article className="stitch-panel rounded-sm p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-sm text-accent">{request.id} • {request.relatedReportId}</p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white">{request.direction} Contact Request</h3>
          <p className="mt-2 text-sm text-muted">{request.message}</p>
        </div>
        <StatusBadge status={`Contact ${status}`} />
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Broad Region" value={request.region} />
        <Info label="Overall Score" value={`${request.score}%`} />
        <Info label="Request Date" value={request.date} />
        <Info label="Contact" value={accepted ? contact : "Hidden until acceptance"} />
      </dl>
      {accepted ? <p className="mt-4 rounded-md bg-[var(--accent-soft)] p-3 text-sm text-accent">Contact Request Accepted. Only the selected contact method is visible to the two participants. This does not confirm identity.</p> : null}
      {notice ? <p className="mt-4 rounded-md bg-[var(--accent-soft)] p-3 text-sm text-accent">{notice}</p> : null}
      {error ? <p className="mt-4 rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-primary">{error}</p> : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {request.canAccept ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => review("accept")} disabled={Boolean(pending)}>{pending === "accept" ? "Accepting..." : "Accept Contact Request"}</button> : null}
        {request.canDecline ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => review("decline")} disabled={Boolean(pending)}>{pending === "decline" ? "Declining..." : "Decline Contact Request"}</button> : null}
        {request.canCancel ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => review("cancel")} disabled={Boolean(pending)}>{pending === "cancel" ? "Cancelling..." : "Cancel Request"}</button> : null}
      </div>
    </article>
  );
}

export function Timeline({ items }) {
  return (
    <ol className="stitch-panel rounded-sm p-6">
      {items.map((item, index) => (
        <li key={item.title} className="relative border-l border-[var(--border)] pb-5 pl-6 last:pb-0">
          <span className="absolute -left-[9px] top-0 grid h-4 w-4 place-items-center rounded-full bg-accent text-deep">
            <Check size={10} />
          </span>
          <p className="font-semibold text-white">{item.title}</p>
          <p className="mt-1 text-sm text-muted">{item.date || `Step ${index + 1}`} • {item.description}</p>
        </li>
      ))}
    </ol>
  );
}

export function StatusBadge({ status }) {
  const tone = status?.includes("Declined") || status?.includes("Archived") ? "text-warning bg-warning/10" : "text-accent bg-[var(--accent-soft)]";
  return <span className={cn("inline-flex rounded-sm px-2.5 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-[0.12em]", tone)}>{status}</span>;
}

export function PrivacyNoticeCard({ className = "" }) {
  return (
    <div className={cn("rounded-sm border-l-4 border-accent bg-[var(--accent-soft)] p-5 text-sm leading-6 text-primary", className)}>
      <div className="flex gap-3">
        <Lock className="mt-0.5 shrink-0 text-accent" size={18} aria-hidden="true" />
        <p>{privacyNotice}</p>
      </div>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search" }) {
  return (
    <label className="relative block">
      <span className="sr-only">{placeholder}</span>
      <Search className="absolute left-3 top-3.5 text-muted" size={18} />
      <input className={`${inputClass} pl-10`} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function FilterBar({ children }) {
  return (
    <div className="stitch-panel rounded-sm p-5">
      <div className="mb-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white">
        <SlidersHorizontal size={18} className="text-accent" />
        Filters
      </div>
      <div className="grid gap-3 md:grid-cols-4">{children}</div>
    </div>
  );
}

export function EmptyState({ title = "No results", description = "Try adjusting the filters." }) {
  return (
    <div className="stitch-panel rounded-sm border-dashed p-10 text-center">
      <AlertCircle className="mx-auto text-accent" size={34} aria-hidden="true" />
      <h3 className="mt-4 font-display text-xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted">{description}</p>
    </div>
  );
}

export function LoadingSkeleton() {
  return <div className="h-28 animate-pulse rounded-lg border border-[var(--border)] bg-surface" aria-label="Loading preview" />;
}

export function FormSection({ title, children }) {
  return (
    <section className="stitch-panel rounded-sm p-6">
      <h2 className="font-mono text-lg font-bold uppercase tracking-[0.14em] text-white">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function FileUploadField({ error, onFileChange }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const inputRef = useRef(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  const handleChange = (event) => {
    const selected = event.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    const valid = selected && ["image/jpeg", "image/png", "image/webp"].includes(selected.type);
    setFile(valid ? selected : null);
    setPreview(valid ? URL.createObjectURL(selected) : "");
    onFileChange?.(valid ? selected : null);
  };
  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    if (inputRef.current) inputRef.current.value = "";
    onFileChange?.(null);
  };

  return (
    <div className="rounded-sm border border-dashed border-[var(--border)] bg-deep p-5">
      <label className="grid min-h-44 cursor-pointer place-items-center rounded-sm border border-[var(--border)] bg-background p-5 text-center transition hover:border-accent">
        {preview ? (
          <Image src={preview} alt="Selected report preview" width={640} height={360} unoptimized className="max-h-48 w-full rounded-sm object-contain" />
        ) : (
          <span>
            <Upload className="mx-auto text-accent" size={28} aria-hidden="true" />
            <span className="mt-3 block text-sm font-semibold text-white">Upload required person photo</span>
            <span className="mt-1 block text-xs text-muted">JPG, PNG, or WEBP. Use a clear human face/person image.</span>
          </span>
        )}
        <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleChange} />
      </label>
      <div className="mt-3 flex flex-col justify-between gap-3 text-xs text-muted sm:flex-row sm:items-center">
        <span>{file ? file.name : "No file selected. A person/face image is required before submit."}</span>
        {file ? <button type="button" className="min-h-10 rounded-sm px-3 text-accent hover:bg-surface" onClick={clearFile}>Remove</button> : null}
      </div>
      <p className="mt-2 text-xs text-muted">Phase 4 stores the selected image privately after submission. Automated face/person validation is not implemented in this local demo.</p>
      <ErrorText text={error} />
    </div>
  );
}

function CaseIdDisplay({ caseId = "MP-2026-0047" }) {
  const [copied, setCopied] = useState("");
  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied("Copy unavailable");
    }
  };
  return (
    <div className="stitch-panel rounded-sm p-6 text-center">
      <p className="stitch-label">Case submitted</p>
      <p className="mt-3 font-mono text-4xl font-extrabold text-accent sm:text-5xl">{caseId}</p>
      <p className="mt-3 text-sm text-muted">Save this ID to track your report.</p>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
        <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => copy(caseId, "Case ID copied")}>Copy Case ID</button>
        <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => copy(`${window.location.origin}/track?caseId=${encodeURIComponent(caseId)}`, "Tracking link copied")}>Copy Link</button>
        <Link href={`/track?caseId=${encodeURIComponent(caseId)}`} className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`}>Track This Case</Link>
      </div>
      {copied ? <p className="mt-3 text-sm text-muted" role="status">{copied}</p> : null}
    </div>
  );
}

export function DemoDataNotice() {
  return <span className="inline-flex rounded-full border border-accent/40 bg-[var(--accent-soft)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-accent">Demo Data • UI Preview • Demonstration Only</span>;
}

export function DataTable({ columns, rows }) {
  if (!rows.length) return <EmptyState title="Empty table" description="No demonstration rows are available." />;
  return (
    <>
      <div className="mobile-data-cards gap-3">
        {rows.map((row, index) => (
          <article key={row.id || row.email || index} className="stitch-panel rounded-sm p-4">
            {columns.map((column) => (
              <div key={column.key} className="border-b border-[var(--border)] py-2 last:border-0">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">{column.label}</p>
                <div className="mt-1 break-words text-sm text-primary">{column.render ? column.render(row) : row[column.key]}</div>
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="desktop-data-table overflow-x-auto rounded-sm border border-[var(--border)] bg-surface">
        <table className="min-w-full text-left text-sm">
        <thead className="bg-deep text-xs uppercase tracking-[0.12em] text-muted">
          <tr>{columns.map((column) => <th key={column.key} className="px-4 py-3">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || row.email || index} className="border-t border-[var(--border)]">
              {columns.map((column) => <td key={column.key} className="px-4 py-4 align-top text-primary">{column.render ? column.render(row) : row[column.key]}</td>)}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </>
  );
}

export function MobileDrawer({ title, routes, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" role="dialog" aria-modal="true">
      <div className="ml-auto h-full w-[min(22rem,90vw)] border-l border-[var(--border)] bg-surface p-4 shadow-soft">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold text-white">{title}</p>
          <button className="grid h-10 w-10 place-items-center rounded-md border border-[var(--border)]" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <nav className="mt-6 grid gap-2">
          {routes.map((route) => (
            <Link key={route.href} href={route.href} onClick={onClose} className="rounded-md px-3 py-3 text-sm text-primary hover:bg-deep">{route.label}</Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export function ReporterSidebar({ name = "Reporter" }) {
  return <PortalSidebar title={`${name} • Reporter`} routes={reporterRoutes} />;
}

export function AdminSidebar({ name = "Admin" }) {
  return <PortalSidebar title={`${name} • Admin`} routes={adminRoutes} admin />;
}

function PortalSidebar({ title, routes, admin = false }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = [...routes, { href: "/", label: "Public Site" }];
  const logout = async () => {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    const result = await response.json().catch(() => ({ redirectTo: "/login" }));
    window.location.href = result.redirectTo || "/login";
  };
  return (
    <>
      <button className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-sm border border-[var(--border)] bg-surface lg:hidden" onClick={() => setOpen(true)} aria-label="Open portal navigation">
        <Menu size={21} />
      </button>
      {open ? <MobileDrawer title={title} routes={links} onClose={() => setOpen(false)} /> : null}
      <aside className="hidden min-h-screen w-[292px] shrink-0 border-r border-[var(--border)] bg-surface p-7 lg:block">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-sm bg-[var(--accent-soft)] text-accent"><Shield size={20} /></span>
          <span>
            <span className="block font-display text-2xl font-extrabold uppercase text-white">HumTrace AI</span>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent">{title}</span>
          </span>
        </Link>
        <nav className="mt-14 grid gap-4">
          {routes.map((route) => {
            const active = pathname === route.href;
            return (
              <Link key={route.href} href={route.href} className={cn("rounded-sm px-5 py-4 font-mono text-sm font-bold uppercase tracking-[0.08em]", active ? "bg-accent text-deep" : "text-muted hover:bg-deep hover:text-white")}>
                {route.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-12 border-t border-[var(--border)] pt-8">
          <div className="rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted">
          {admin ? "Admin moderation does not confirm or reject identity. HumTrace AI only generates AI suggestions for reporter review." : "Manage submitted reports, AI suggestions, and consent-based Contact Requests."}
          </div>
        </div>
        <div className="mt-6 grid gap-3">
          <Link className={`${buttonClass} border border-[var(--border)] text-primary`} href="/">Public-site link</Link>
          {admin ? <Link className={`${buttonClass} border border-[var(--border)] text-primary`} href="/admin/staff">Create Staff</Link> : null}
          <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={logout}><LogOut size={16} /> Logout</button>
        </div>
      </aside>
    </>
  );
}

export function ResponsiveTabs({ tabs }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) || tabs[0];
  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <div className="mb-6 flex w-full max-w-full gap-4 overflow-x-auto border-b border-[var(--border)] bg-transparent pb-1" role="tablist">
        {tabs.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)} className={cn("min-h-12 shrink-0 border-b-2 px-1 font-mono text-sm font-bold uppercase tracking-[0.14em]", active === tab.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-white")}>{tab.label}</button>
        ))}
      </div>
      <div>{current.content}</div>
    </div>
  );
}

export function ChartCard({ title, type = "bar", data, metric }) {
  const chartData = data || (type === "line" ? chartReportsByMonth : chartReportsByCity);
  return (
    <div className="stitch-panel rounded-sm p-6">
      <h3 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-white">{title}</h3>
      {metric ? <div className="mt-4 rounded-sm border border-[var(--border)] bg-deep p-5"><p className="font-mono text-4xl font-bold text-accent">{metric.value}%</p><p className="mt-2 text-sm text-muted">{metric.label}</p></div> : null}
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {type === "line" ? (
            <LineChart data={chartData}>
              <CartesianGrid stroke="rgba(211,228,254,0.1)" />
              <XAxis dataKey="month" stroke="#aebbd0" />
              <YAxis stroke="#aebbd0" />
              <Tooltip contentStyle={{ background: "#0b1c30", border: "1px solid rgba(211,228,254,0.12)", color: "#d3e4fe" }} />
              <Line type="monotone" dataKey="missing" stroke="var(--red)" strokeWidth={2} />
              <Line type="monotone" dataKey="unidentified" stroke="#f59e7a" strokeWidth={2} />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(211,228,254,0.1)" />
              <XAxis dataKey="name" stroke="#aebbd0" />
              <YAxis stroke="#aebbd0" />
              <Tooltip contentStyle={{ background: "#0b1c30", border: "1px solid rgba(211,228,254,0.12)", color: "#d3e4fe" }} />
              <Bar dataKey="reports" fill="var(--red)" radius={[5, 5, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function NotificationCard({ text }) {
  return (
    <div className="flex items-center gap-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm">
      <Bell size={17} className="text-accent" />
      <span>{text}</span>
    </div>
  );
}

export function BrowsePage({ searchMode = false, reportsData = reports }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [type, setType] = useState("All Types");
  const [selectedReport, setSelectedReport] = useState(null);
  const filtered = useMemo(() => {
    return reportsData.filter((report) => {
      const queryOk = `${report.id} ${report.type} ${report.region} ${report.description}`.toLowerCase().includes(query.toLowerCase());
      const regionOk = region === "All Regions" || report.region === region;
      const typeOk = type === "All Types" || report.type === type;
      return queryOk && regionOk && typeOk && report.visibility === "Public";
    });
  }, [query, region, type, reportsData]);
  return (
    <PublicShell>
      <PageHeader
        title={searchMode ? "Search Public Reports" : "Browse Limited Public Information"}
        description={searchMode ? "Search limited public fields only. Private notes and contact details are never shown." : "Review sample public report cards with broad regions, approximate dates, and respectful limited details."}
      />
      <Content>
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <FilterBar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search by report ID, region, or detail" />
          <Select value={region} onChange={setRegion} options={["All Regions", ...regions.filter((item) => item !== "Prefer Not to Specify")]} label="Broad region filter" />
          <Select value={type} onChange={setType} options={["All Types", "Missing Person", "Unidentified Individual"]} label="Report type filter" />
          <Select value="Any Date" onChange={() => {}} options={["Any Date", "Last 30 days", "Last 90 days", "2026"]} label="Approximate date filter" />
          </FilterBar>
          <PrivacyNoticeCard />
        </div>
        {searchMode ? <SectionHeader title="Search Results" description="Public results show limited database fields only. AI recommendations appear after a report workflow." /> : <SectionHeader title="Public Directory" description="Use filters to browse missing and unidentified cases." />}
        {filtered.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((report) => <ReportCard key={report.id} report={report} onViewDetails={setSelectedReport} />)}</div> : <EmptyState title={searchMode ? "No Cases Found" : "No reports"} description="No public demonstration report fits the current filters." />}
        <div className="stitch-panel flex items-center justify-between rounded-sm p-4 text-sm text-muted">
          <span>Page 1 of 1</span>
          <div className="flex gap-2"><button className={`${buttonClass} border border-[var(--border)] text-primary`}>Previous</button><button className={`${buttonClass} border border-[var(--border)] text-primary`}>Next</button></div>
        </div>
      </Content>
      <ReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </PublicShell>
  );
}

export function SmartSearchPage() {
  const [results, setResults] = useState(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(""); setNotice(""); setLoading(true);
    try {
      const response = await fetch("/api/search/recommendations", { method: "POST", body: new FormData(event.currentTarget) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to search.");
      setResults(result.recommendations || []); setNotice(result.notice || "Search completed.");
    } catch (searchError) { setError(searchError.message); } finally { setLoading(false); }
  };
  return <PublicShell><PageHeader title="Smart Search" description="Use a photograph, descriptive details, or both to look for public-safe possible recommendations." /><Content>
    <form className="stitch-panel grid gap-5 rounded-sm p-6" onSubmit={submit}>
      <div className="rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted">Phase 5 development can use English descriptive text embeddings when enabled. Evaluation is deferred. Photographs are validated and discarded but are not analyzed in this slice. Human review is required.</div>
      <label><span className="mb-2 block font-semibold">Optional photograph</span><input className={inputClass} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /><span className="mt-2 block text-xs text-muted">JPG, PNG or WEBP, maximum 5 MB. Search uploads are not stored.</span></label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label><span>Approximate age</span><input className={inputClass} name="age" /></label><label><span>Gender</span><select className={inputClass} name="gender" defaultValue=""><option value="">Not specified</option><option>Female</option><option>Male</option><option>Other</option></select></label><label><span>Height (cm)</span><input className={inputClass} type="number" name="heightCm" min="30" max="260" /></label><label><span>Weight (kg)</span><input className={inputClass} type="number" name="weightKg" min="2" max="300" /></label><label><span>Broad region</span><input className={inputClass} name="region" /></label><label><span>Location detail</span><input className={inputClass} name="location" /></label><label><span>Clothing</span><input className={inputClass} name="clothing" /></label><label><span>Identifying features</span><input className={inputClass} name="identifyingFeatures" /></label></div>
      <label><span>Description</span><textarea className={`${inputClass} min-h-28`} name="description" /></label>
      {error ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm">{error}</div> : null}<button className={`${buttonClass} bg-accent text-white`} disabled={loading}>{loading ? "Searching..." : "Find Possible Recommendations"}</button>
    </form>
    {notice ? <div className="rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted">{notice}</div> : null}
    {results !== null ? <RecommendationResults items={results} /> : null}
  </Content></PublicShell>;
}

export function ReportFormPage({ type }) {
  const missing = type === "missing";
  const today = new Date().toISOString().slice(0, 10);
  const schema = z.object({
    name: missing ? z.string().min(2, "Enter at least two characters.") : z.string().optional(),
    age: z.string().min(1, "Approximate age is required."),
    region: z.string().optional(),
    locationDetail: z.string().max(180, "Location detail is too long.").optional(),
    date: z.string().optional().refine((value) => !value || value <= today, "Date cannot be in the future."),
    description: z.string().min(10, "Add a short respectful description.").max(1200, "Description is too long."),
    clothing: z.string().max(500, "Clothing notes are too long.").optional(),
    identifyingFeatures: z.string().max(500, "Feature notes are too long.").optional(),
    medicalCondition: z.string().max(300, "Medical notes are too long.").optional(),
    heightFeet: z.string().min(1, "Height in feet is required.").refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "Enter height as a number in feet."),
    weightKg: z.string().min(1, "Weight is required.").refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, "Enter weight as a number."),
    gender: z.string().optional(),
    reporterName: z.string().min(2, "Reporter name is required."),
    reporterPhone: z.string().optional(),
    reporterEmail: z.string().email("Enter a valid email address."),
    relationship: z.string().optional(),
    reporterContext: z.string().max(500, "Reporter context is too long.").optional(),
    relationshipContext: z.string().max(500, "Relationship context is too long.").optional(),
    preferredContactMethod: z.enum(["EMAIL", "PHONE"]),
    publicVisible: z.boolean().optional(),
    aiProcessingConsent: z.boolean().optional(),
    photoConfirm: z.literal(true, { errorMap: () => ({ message: "Confirm the uploaded image shows a human face/person." }) }),
    consent: z.literal(true, { errorMap: () => ({ message: "Consent is required for local report submission." }) })
  });
  const steps = [
    { title: "Person Details", fields: ["name", "age", "gender", "heightFeet", "weightKg"] },
    { title: missing ? "Last Seen Details" : "Found Location", fields: ["region", "locationDetail", "date"] },
    { title: "Description", fields: ["description", "clothing", "identifyingFeatures", "medicalCondition"] },
    { title: "Photo Upload", fields: [] },
    { title: "Reporter Information", fields: ["reporterName", "reporterPhone", "reporterEmail", "relationship", "reporterContext", "relationshipContext", "preferredContactMethod"] },
    { title: "Privacy and Consent", fields: ["publicVisible", "aiProcessingConsent", "photoConfirm", "consent"] },
    { title: "Review and Submit", fields: [] }
  ];
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [immediateRecommendations, setImmediateRecommendations] = useState([]);
  const [recommendationNotice, setRecommendationNotice] = useState("");
  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      consent: false,
      photoConfirm: false,
      publicVisible: false,
      aiProcessingConsent: false,
      preferredContactMethod: "EMAIL"
    }
  });
  const values = watch();
  const nextStep = async () => {
    if (step === 3 && !photoFile) {
      setPhotoError("Upload a clear human face/person image before continuing.");
      return;
    }
    const ok = steps[step].fields.length ? await trigger(steps[step].fields) : true;
    if (ok) setStep((current) => Math.min(current + 1, steps.length - 1));
  };
  const previousStep = () => setStep((current) => Math.max(current - 1, 0));
  const submitReport = async (values) => {
    if (!photoFile) {
      setPhotoError("Upload a clear human face/person image before submitting.");
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    setPhotoError("");
    try {
      const formData = new FormData();
      formData.append("type", type);
      Object.entries(values).forEach(([key, value]) => {
        formData.append(key, typeof value === "boolean" ? String(value) : value || "");
      });
      formData.append("photo", photoFile);
      const response = await fetch("/api/reports", {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to submit report.");
      }
      setMessage(result.caseId);
      setImmediateRecommendations(result.recommendations || []);
      setRecommendationNotice(result.recommendationNotice || "");
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setSubmitting(false);
    }
  };
  const handleFormSubmit = (event) => {
    if (!photoFile) setPhotoError("Upload a clear human face/person image before submitting.");
    return handleSubmit(submitReport)(event);
  };
  return (
    <PublicShell>
      <PageHeader
        title={missing ? "Submit Missing Person Report" : "Submit Unidentified Individual Report"}
        description={missing ? "Submit details for a missing person case. AI suggestions assist human decision-making only." : "Submit respectful details for an unidentified person case. AI suggestions assist human decision-making only."}
      />
      <Content>
        <div className="grid gap-7 xl:grid-cols-[1fr_420px]">
        <form className="grid gap-5" onSubmit={handleFormSubmit}>
          <div className="stitch-panel rounded-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="stitch-label">Step {step + 1} of {steps.length}</p>
                <h2 className="mt-2 font-display text-2xl font-extrabold uppercase text-white">{steps[step].title}</h2>
              </div>
              <div className="flex gap-1">
                {steps.map((item, index) => <span key={item.title} className={cn("h-2 w-8 rounded-full", index <= step ? "bg-accent" : "bg-high")} />)}
              </div>
            </div>
          </div>
          {step === 0 ? <FormSection title="Step 1: Person Details">
            {missing ? (
              <Field label="Full Name" register={register("name")} error={errors.name?.message} />
            ) : (
              <Field label="Name if known" register={register("name")} error={errors.name?.message} />
            )}
            <Field label="Approximate age" register={register("age")} error={errors.age?.message} />
            <SelectField label="Gender" register={register("gender")} options={["Female", "Male", "Other", "Not specified"]} />
            <Field label="Height (feet)" register={register("heightFeet")} error={errors.heightFeet?.message} />
            <Field label="Weight (kg)" register={register("weightKg")} error={errors.weightKg?.message} />
          </FormSection> : null}
          {step === 1 ? <FormSection title={missing ? "Step 2: Last Seen Details" : "Step 2: Found Location"}>
            <SelectField label="Broad region / city" register={register("region")} error={errors.region?.message} options={regions} />
            <Field label={missing ? "Last seen location detail" : "Found location detail"} register={register("locationDetail")} error={errors.locationDetail?.message} />
            <Field label={missing ? "Date Missing" : "Date Found"} type="date" register={register("date")} error={errors.date?.message} />
          </FormSection> : null}
          {step === 2 ? <FormSection title="Step 3: Description">
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-primary">Physical Description</span>
              <textarea className={`${inputClass} min-h-32`} {...register("description")} />
              <ErrorText text={errors.description?.message} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-primary">Clothing</span>
              <textarea className={`${inputClass} min-h-24`} {...register("clothing")} />
              <ErrorText text={errors.clothing?.message} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-primary">Identifying features</span>
              <textarea className={`${inputClass} min-h-24`} {...register("identifyingFeatures")} />
              <ErrorText text={errors.identifyingFeatures?.message} />
            </label>
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-primary">Medical condition</span>
              <textarea className={`${inputClass} min-h-20`} {...register("medicalCondition")} />
              <ErrorText text={errors.medicalCondition?.message} />
            </label>
          </FormSection> : null}
          {step === 3 ? <FormSection title="Step 4: Photo Upload">
            <div className="md:col-span-2">
              <FileUploadField error={photoError} onFileChange={(file) => { setPhotoFile(file); setPhotoError(""); }} />
            </div>
          </FormSection> : null}
          {step === 4 ? <FormSection title="Step 5: Reporter Information">
            <Field label="Your Name" register={register("reporterName")} error={errors.reporterName?.message} />
            <Field label="Phone" register={register("reporterPhone")} error={errors.reporterPhone?.message} />
            <Field label="Email" register={register("reporterEmail")} error={errors.reporterEmail?.message} />
            <SelectField label="Relationship" register={register("relationship")} error={errors.relationship?.message} options={["Family Member", "Police/Authority", "Friend", "Community Member", "Organization", "Other"]} />
            <SelectField label="Preferred contact method" register={register("preferredContactMethod")} error={errors.preferredContactMethod?.message} options={["EMAIL", "PHONE"]} />
            <label>
              <span className="mb-2 block text-sm font-semibold text-primary">Reporter or organization context</span>
              <textarea className={`${inputClass} min-h-24`} {...register("reporterContext")} />
              <ErrorText text={errors.reporterContext?.message} />
            </label>
            <label>
              <span className="mb-2 block text-sm font-semibold text-primary">Relationship context</span>
              <textarea className={`${inputClass} min-h-24`} {...register("relationshipContext")} />
              <ErrorText text={errors.relationshipContext?.message} />
            </label>
          </FormSection> : null}
          {step === 5 ? <FormSection title="Step 6: Privacy and Consent">
            <label className="flex gap-3 rounded-md border border-[var(--border)] bg-deep p-4 text-sm md:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" {...register("publicVisible")} />
              <span>I understand public visibility still requires human review. Sensitive details and contact information remain hidden.</span>
            </label>
            <label className="flex gap-3 rounded-md border border-[var(--border)] bg-deep p-4 text-sm md:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" {...register("photoConfirm")} />
              <span>I confirm the uploaded image is a clear human face/person image, not an animal, object, or unrelated photo.</span>
            </label>
            <label className="flex gap-3 rounded-md border border-[var(--border)] bg-deep p-4 text-sm md:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" {...register("aiProcessingConsent")} />
              <span>Allow development-only local English text embeddings for this active report. Evaluation is deferred, and this permission can be withdrawn in a later Phase 5 lifecycle step.</span>
            </label>
            <div className="md:col-span-2"><ErrorText text={errors.photoConfirm?.message} /></div>
            <label className="flex gap-3 rounded-md border border-[var(--border)] bg-deep p-4 text-sm md:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" {...register("consent")} />
              <span>I understand this Phase 4 local-demo form saves report details and the selected image privately, and that contact sharing requires mutual consent.</span>
            </label>
            <div className="md:col-span-2"><ErrorText text={errors.consent?.message} /></div>
          </FormSection> : null}
          {step === 6 ? <FormSection title="Step 7: Review and Submit">
            <div className="md:col-span-2 rounded-sm border border-[var(--border)] bg-deep p-5 text-sm text-primary">
              <p className="font-semibold text-white">Review summary</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Name" value={values.name || (missing ? "Missing" : "Unknown")} />
                <Info label="Age / Gender" value={`${values.age || "Not set"} - ${values.gender || "Not specified"}`} />
                <Info label="Region" value={values.region || "Not set"} />
                <Info label={missing ? "Last seen" : "Found"} value={values.locationDetail || "Not set"} />
                <Info label="Reporter" value={values.reporterName || "Not set"} />
                <Info label="Public request" value={values.publicVisible ? "Requested for review" : "Not requested"} />
              </dl>
              <p className="mt-4 text-muted">Submission creates the report, private photo metadata, timeline event, notification, and audit log together.</p>
            </div>
          </FormSection> : null}
          {submitError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary"><strong className="text-white">Please fix this:</strong> {submitError}</div> : null}
          {message ? <div className="rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary"><strong className="text-white">Submission notification:</strong> Case {message} and its local image file were saved for human review.</div> : null}
          {message ? <CaseIdDisplay caseId={message} /> : null}
          {message ? <div className="grid gap-4">
            <SectionHeader title="Possible Recommendations" description={recommendationNotice || "Public-safe possible recommendations appear here when available."} />
            <RecommendationResults items={immediateRecommendations} />
          </div> : null}
          <div className="flex flex-col gap-3 sm:flex-row">
            {step > 0 ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} type="button" onClick={previousStep}>Back</button> : null}
            {step < steps.length - 1 ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="button" onClick={nextStep}>Next</button> : null}
            {step === steps.length - 1 ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Report"}</button> : null}
          </div>
        </form>
        <aside className="grid content-start gap-5">
          <PrivacyNoticeCard />
          <div className="stitch-panel rounded-sm p-6">
            <p className="stitch-label">Secure local workflow</p>
            <h2 className="mt-3 font-display text-2xl font-extrabold uppercase text-white">Human review required</h2>
            <p className="mt-4 text-sm leading-7 text-muted">Report metadata is saved to the local SQLite database and images are stored privately. Automated face/person validation is still a future step.</p>
          </div>
          <div className="stitch-panel rounded-sm border-dashed p-6">
            <p className="stitch-label">Submission Steps</p>
            <div className="mt-5 grid gap-3">
              {steps.map((item, index) => (
                <div key={item.title} className="flex items-center gap-3 border-b border-[var(--border)] pb-3 last:border-0">
                  <span className="font-mono text-accent">0{index + 1}</span>
                  <span className="text-sm text-primary">{item.title}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
        </div>
      </Content>
    </PublicShell>
  );
}

export function TrackPage() {
  const [id, setId] = useState("");
  const [report, setReport] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const caseId = new URLSearchParams(window.location.search).get("caseId");
    if (caseId) setId(caseId);
  }, []);
  const normalizedId = id.trim().toUpperCase();
  const invalid = submitted && normalizedId && !/^(MP|UI)-\d{4}-\d{4}$/.test(normalizedId);
  const track = async () => {
    setSubmitted(true);
    setReport(null);
    if (!/^(MP|UI)-\d{4}-\d{4}$/.test(normalizedId)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/track/${encodeURIComponent(normalizedId)}`);
      const result = await response.json();
      if (response.ok) setReport(result.report);
    } finally {
      setLoading(false);
    }
  };
  return (
    <PublicShell>
      <PageHeader title="Track Case" description="Public-safe tracking information is available only for reports that completed public review." />
      <Content>
        <div className="stitch-panel rounded-sm p-6">
          <div className="grid items-end gap-3 md:grid-cols-[1fr_auto]">
            <label>
              <span className="mb-2 block text-sm font-semibold text-primary">Case ID</span>
              <input className={inputClass} value={id} maxLength={12} onChange={(event) => setId(event.target.value)} placeholder="MP-2026-0047" />
            </label>
            <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={track} disabled={loading}>{loading ? "Checking..." : "Track Case"}</button>
          </div>
        </div>
        {invalid ? <EmptyState title="Invalid Case ID" description="Use a sample format such as MP-2026-0047." /> : null}
        {submitted && !invalid && !loading && !report ? <EmptyState title="No result" description="No public tracking result is available for that ID." /> : null}
        {report ? (
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="stitch-panel rounded-sm p-6">
              <StatusBadge status={report.status} />
              <h2 className="mt-4 font-display text-2xl font-semibold text-white">{report.id}</h2>
              <dl className="mt-5 grid gap-3"><Info label="Case type" value={report.type} /><Info label="Submission date" value={report.date} /><Info label="Last update" value={report.lastUpdate} /></dl>
            </div>
            <Timeline items={report.timeline?.length ? report.timeline : [
              { title: "Report saved", date: "Current", description: "This case exists in the local HumTrace AI database." },
              { title: "Human review required", date: "Next", description: "Public visibility and contact sharing require review and consent." }
            ]} />
          </div>
        ) : null}
        <PrivacyNoticeCard />
      </Content>
    </PublicShell>
  );
}

export function ContactPage() {
  return <SimpleFormPage title="Contact" description="For emergencies in Pakistan: Rescue 1122, Police 15, Edhi Foundation 115, Chhipa Welfare 1020. For missing person reports, use the report page." submitText="Demo contact form only. Message delivery is not implemented in the Phase 4 local demo." fields={["Your Name", "Email Address", "Subject", "Case ID, optional", "Your Message"]} />;
}

export function AuthPage({ mode }) {
  const login = mode === "login" || mode === "admin";
  const adminLogin = mode === "admin";
  return (
    <PublicShell>
      <Content>
        <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-md items-center py-10">
          <SimpleForm
            title={adminLogin ? "Admin Portal" : login ? "Welcome Back" : "Create Your Account"}
            description={adminLogin ? "Sign in with an existing Admin account. Public registration never creates Admin access." : login ? "Sign in with your registered email and password." : "Create a reporter account. After registration, sign in to open your dashboard."}
            submitText={login ? "Sign in failed." : "Registration failed."}
            fields={login ? ["Email Address", "Password"] : ["Full Name", "Email Address", "Password", "Confirm Password", "Privacy Consent"]}
            authMode={mode}
          />
        </div>
      </Content>
    </PublicShell>
  );
}

function SimpleFormPage({ title, description, submitText, fields, authMode }) {
  return (
    <PublicShell>
      <PageHeader title={title} description={description} />
      <Content narrow>
        <SimpleForm title={title} submitText={submitText} fields={fields} authMode={authMode} />
      </Content>
    </PublicShell>
  );
}

function SimpleForm({ title, description, submitText, fields, authMode }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authValues, setAuthValues] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    consent: false
  });
  const updateAuthValue = (key, value) => setAuthValues((current) => ({ ...current, [key]: value }));
  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (authMode === "register" && authValues.password !== authValues.confirmPassword) {
      setError("Passwords must match.");
      return;
    }
    setPending(true);
    try {
      const endpoint = authMode === "login" || authMode === "admin" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authValues.name,
          email: authValues.email,
          phone: authValues.phone,
          password: authValues.password,
          returnTo: new URLSearchParams(window.location.search).get("returnTo") || ""
          ,adminOnly: authMode === "admin"
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || submitText);
      setMessage(authMode === "login" || authMode === "admin" ? "Signed in. Redirecting..." : "Account created. Please sign in.");
      window.location.href = result.redirectTo;
    } catch (authError) {
      setError(authError.message);
    } finally {
      setPending(false);
    }
  };
  if (authMode) {
    const login = authMode === "login" || authMode === "admin";
    return (
      <form className="stitch-panel w-full rounded-sm p-7" onSubmit={submitAuth}>
        {description ? <div className="mb-6 text-center">
          <LogoText className="text-2xl" />
          <h1 className="mt-6 font-display text-3xl font-extrabold uppercase text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
        </div> : null}
        <div className="grid gap-4">
          {!login ? <label>
            <span className="mb-2 block text-sm font-semibold text-primary">Full Name</span>
            <input className={inputClass} value={authValues.name} onChange={(event) => updateAuthValue("name", event.target.value)} required />
          </label> : null}
          <label>
            <span className="mb-2 block text-sm font-semibold text-primary">Email Address</span>
            <input className={inputClass} type="email" value={authValues.email} onChange={(event) => updateAuthValue("email", event.target.value)} required />
          </label>
          <label>
            <span className="mb-2 block text-sm font-semibold text-primary">Password</span>
            <span className="relative block">
              <input className={inputClass} type={showPassword ? "text" : "password"} value={authValues.password} onChange={(event) => updateAuthValue("password", event.target.value)} required minLength={8} />
              <button type="button" className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-sm text-muted hover:bg-surface" onClick={() => setShowPassword(!showPassword)} aria-label="Show or hide password">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </span>
          </label>
          {!login ? <label>
            <span className="mb-2 block text-sm font-semibold text-primary">Confirm Password</span>
            <input className={inputClass} type={showPassword ? "text" : "password"} value={authValues.confirmPassword} onChange={(event) => updateAuthValue("confirmPassword", event.target.value)} required minLength={8} />
          </label> : null}
          {!login ? <label className="flex min-h-12 gap-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm">
            <input className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]" type="checkbox" checked={authValues.consent} onChange={(event) => updateAuthValue("consent", event.target.checked)} required />
            <span>I agree to the privacy notice for this local demo.</span>
          </label> : null}
        </div>
        {error ? <div className="mt-5 rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary">{error}</div> : null}
        {message ? <div className="mt-5 rounded-sm bg-[var(--accent-soft)] p-4 text-sm text-accent">{message}</div> : null}
        {!login ? <div className="mt-5 rounded-sm border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-primary">Public registration creates reporter accounts only. After creating an account, sign in from the login page.</div> : null}
        <button className={`${buttonClass} mt-5 w-full bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit" disabled={pending}>{pending ? "Please wait..." : login ? "Sign In" : "Create Account"}</button>
        <Link className="mt-4 block min-h-10 py-2 text-center text-sm text-accent" href={authMode === "admin" ? "/login" : login ? "/register" : "/login"}>{authMode === "admin" ? "Return to standard sign in" : login ? "Don't have an account? Register" : "Already have an account? Sign In"}</Link>
      </form>
    );
  }
  return (
        <form className="stitch-panel w-full rounded-sm p-7" onSubmit={(event) => { event.preventDefault(); setMessage(submitText); }}>
          {description ? <div className="mb-6 text-center">
            <LogoText className="text-2xl" />
            <h1 className="mt-6 font-display text-3xl font-extrabold uppercase text-white">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
          </div> : null}
          <div className="grid gap-4">
            {fields.map((field) => (
              field === "Message" || field === "Your Message" ? (
                <label key={field}>
                  <span className="mb-2 block text-sm font-semibold text-primary">{field}</span>
                  <textarea className={`${inputClass} min-h-32`} required />
                </label>
              ) : field === "Privacy Consent" ? (
            <label key={field} className="flex min-h-12 gap-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm">
                  <input className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]" type="checkbox" required /> <span>I agree to the privacy notice for this local demo.</span>
                </label>
              ) : field === "Region" ? (
                <SelectField key={field} label={field} options={regions} />
              ) : (
                <label key={field}>
                  <span className="mb-2 block text-sm font-semibold text-primary">{field}</span>
                  <span className="relative block">
                    <input className={inputClass} type={field.includes("Password") && !showPassword ? "password" : field.includes("Email") ? "email" : "text"} required />
                    {field.includes("Password") ? <button type="button" className="absolute right-1 top-1 grid h-11 w-11 place-items-center rounded-sm text-muted hover:bg-surface" onClick={() => setShowPassword(!showPassword)} aria-label="Show or hide password">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button> : null}
                  </span>
                </label>
              )
            ))}
          </div>
          {authMode === "login" ? <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted"><label className="flex min-h-10 items-center gap-2"><input className="h-5 w-5 accent-[var(--accent)]" type="checkbox" /> Remember me</label><button type="button" className="min-h-10 rounded-sm px-2 text-accent">Forgot password</button></div> : null}
          {message ? <div className="mt-5 rounded-sm bg-[var(--accent-soft)] p-4 text-sm text-accent">{message}</div> : null}
          {authMode === "register" ? <div className="mt-5 rounded-sm border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-primary">Public registration creates reporter accounts only. Admin accounts are seeded demo users.</div> : null}
          <button className={`${buttonClass} mt-5 w-full bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit">{authMode === "login" ? "Sign In" : authMode === "register" ? "Create Account" : title === "Contact" ? "Send Message" : title}</button>
          {authMode ? <Link className="mt-4 block min-h-10 py-2 text-center text-sm text-accent" href={authMode === "login" ? "/register" : "/login"}>{authMode === "login" ? "Don't have an account? Register" : "Already have an account? Sign In"}</Link> : null}
        </form>
  );
}

export function ReporterDashboard({ user = null, summary = { reportCount: 0, recommendationCount: 0 } }) {
  return (
    <PortalContent title={user?.name ? `Welcome, ${user.name}` : "My Dashboard"} description="Your submitted reports and available recommendations.">
      <div className="grid gap-5 md:grid-cols-2">
        <StatCard title="My Reports" value={summary.reportCount} />
        <StatCard title="Recommendations" value={summary.recommendationCount} />
      </div>
      <div className="stitch-panel rounded-sm p-6">
        <SectionHeader title="Dashboard Summary" />
        <p className="text-sm leading-6 text-muted">Use My Reports to review your submitted cases. Recommendations only show possible similarities for human review and do not confirm identity.</p>
      </div>
      <PrivacyNoticeCard />
    </PortalContent>
  );
}

export function MyReportsPage({ reportsData = reports }) {
  const [caseReports, setCaseReports] = useState(reportsData);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All Statuses");
  const [type, setType] = useState("All Types");
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState("");
  const statusOptions = ["All Statuses", ...new Set(caseReports.map((report) => report.status))];
  const typeOptions = ["All Types", ...new Set(caseReports.map((report) => report.type))];
  const normalizedQuery = query.trim().toLowerCase();
  const filteredReports = caseReports.filter((report) => {
    const matchesQuery = !normalizedQuery || `${report.id} ${report.name || ""} ${report.region || ""} ${report.description || ""}`.toLowerCase().includes(normalizedQuery);
    return matchesQuery && (status === "All Statuses" || report.status === status) && (type === "All Types" || report.type === type);
  });
  const runAction = async (report, action, values = {}) => {
    const confirmations = {
      close: "Close this case? It will be removed from public visibility. This action does not confirm identity.",
      archive: "Archive this case? It will be hidden until you reopen it for human review."
    };
    if (confirmations[action] && !window.confirm(confirmations[action])) return false;
    setActionError("");
    const response = await fetch(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...values }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setActionError(result.error || "Unable to update report."); return false; }
    const labels = { UNDER_REVIEW: "Report Under Review", CLOSED_BY_REPORTER: "Closed by Reporter", ARCHIVED: "Archived" };
    setCaseReports((current) => current.map((item) => item.id === report.id ? { ...item, ...result.report, status: labels[result.report.rawStatus] || result.report.status, visibility: result.report.visibility === "LIMITED" ? "Limited" : result.report.visibility === "HIDDEN" ? "Hidden" : result.report.visibility } : item));
    setEditing(null); return true;
  };
  return (
    <PortalContent title="My Cases" description="Search and filter your submitted cases.">
      <FilterBar><SearchInput value={query} onChange={setQuery} placeholder="Search my cases" /><Select value={status} onChange={setStatus} options={statusOptions} label="Status" /><Select value={type} onChange={setType} options={typeOptions} label="Type" /></FilterBar>
      {actionError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm">{actionError}</div> : null}
      {filteredReports.length ? <div className="grid gap-5 lg:grid-cols-2">{filteredReports.map((report) => <div key={report.id} className="stitch-panel rounded-sm p-5"><ReportCard report={report} /><div className="mt-4 flex flex-wrap gap-2">{["SUBMITTED", "UNDER_REVIEW", "PUBLIC"].includes(report.rawStatus) ? <button className={`${buttonClass} border border-[var(--border)]`} onClick={() => setEditing({ ...report })}>Edit</button> : null}{!["CLOSED_BY_REPORTER", "ARCHIVED"].includes(report.rawStatus) ? <button className={`${buttonClass} border border-[var(--border)]`} onClick={() => runAction(report, "close")}>Close Case</button> : null}{report.rawStatus !== "ARCHIVED" ? <button className={`${buttonClass} border border-[var(--border)]`} onClick={() => runAction(report, "archive")}><Archive size={16} /> Archive</button> : null}{["CLOSED_BY_REPORTER", "ARCHIVED"].includes(report.rawStatus) ? <button className={`${buttonClass} bg-accent text-white`} onClick={() => runAction(report, "reopen")}>Reopen for Review</button> : null}</div><p className="mt-3 text-sm text-muted">{report.recommendations} Possible Recommendations - Visibility: {report.visibility}</p></div>)}</div> : <EmptyState title="No cases found" description="No submitted case matches the current search and filters." />}
      {editing ? <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4"><form className="my-8 grid w-full max-w-3xl gap-4 rounded-sm border border-[var(--border)] bg-background p-6" onSubmit={(event) => { event.preventDefault(); runAction(editing, "edit", editing); }}><div className="flex justify-between"><h2 className="font-display text-2xl font-bold text-white">Edit {editing.id}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Close edit form"><X /></button></div><div className="grid gap-4 sm:grid-cols-2"><label><span>Name</span><input className={inputClass} value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, fullName: e.target.value })} /></label><label><span>Age</span><input className={inputClass} value={editing.age || ""} onChange={(e) => setEditing({ ...editing, age: e.target.value, approximateAge: e.target.value })} required /></label><label><span>Height (cm)</span><input className={inputClass} type="number" value={editing.heightCm || ""} onChange={(e) => setEditing({ ...editing, heightCm: Number(e.target.value) })} required /></label><label><span>Weight (kg)</span><input className={inputClass} type="number" value={editing.weightKg || ""} onChange={(e) => setEditing({ ...editing, weightKg: Number(e.target.value) })} required /></label><label><span>Gender</span><select className={inputClass} value={editing.gender || "Not specified"} onChange={(e) => setEditing({ ...editing, gender: e.target.value })}>{["Female", "Male", "Other", "Not specified"].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Broad region</span><input className={inputClass} value={editing.region || ""} onChange={(e) => setEditing({ ...editing, region: e.target.value, broadRegion: e.target.value })} /></label></div><label><span>Description</span><textarea className={`${inputClass} min-h-28`} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} required /></label><div className="rounded-sm bg-deep p-4 text-sm text-muted">Editing a public report returns it to human review. This action does not confirm identity.</div><button className={`${buttonClass} bg-accent text-white`} type="submit">Save and Return to Review</button></form></div> : null}
    </PortalContent>
  );
}

export function RecommendationsPage({ recommendationsData = [] }) {
  return (
    <PortalContent title="Possible Recommendations" description="Review AI-assisted similarity suggestions with human judgment. Suggestions do not confirm identity.">
      <PrivacyNoticeCard />
      <RecommendationResults items={recommendationsData} canManage />
    </PortalContent>
  );
}

export function ConnectionRequestsPage({ requestsData = connectionRequests }) {
  const tabs = ["All Requests", "Incoming", "Outgoing", "Accepted", "Declined", "Cancelled"].map((label) => ({
    id: label,
    label,
    content: <div className="grid gap-5">{requestsData.filter((item) => label === "All Requests" || label === item.direction || label === item.status).map((item) => <ConnectionRequestCard key={item.id} request={item} />)}</div>
  }));
  return (
    <PortalContent title="Contact Requests" description="Another family member may request contact when a potential match appears relevant. Contact information remains hidden until accepted.">
      <ResponsiveTabs tabs={tabs} />
    </PortalContent>
  );
}

export function ProfilePage({ user = null }) {
  return (
    <PortalContent title="Profile" description="Basic account details for the signed-in reporter.">
      <div className="stitch-panel rounded-sm p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="Name" value={user?.name || "Not available"} />
          <Info label="Email" value={user?.email || "Not available"} />
          <Info label="Role" value={user?.role || "Reporter"} />
          <Info label="Preferred contact" value={user?.preferredContactMethod || "EMAIL"} />
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">Profile editing is not part of this phase. Contact information remains hidden unless a connection request is accepted.</p>
      </div>
    </PortalContent>
  );
}

export function AdminDashboardPage({ dashboardData = { stats: [], reportsByRegion: [], reportsByMonth: [], acceptanceRate: { value: 0, label: "No reviewed contact requests yet" }, recentActivity: [] } }) {
  return (
    <PortalContent title="Admin Dashboard" description="Real local database aggregates for moderation and operations review.">
      <div className="rounded-sm border-l-4 border-accent bg-[var(--accent-soft)] p-5 text-sm text-primary">Admin moderation does not confirm or reject identity. HumTrace AI only generates possible recommendations for reporter review.</div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardData.stats.map((item) => <StatCard key={item.title} title={item.title} value={item.value} />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
        <ChartCard title="Reports by City/Region" data={dashboardData.reportsByRegion} />
        <ChartCard title="Reports by Month" type="line" data={dashboardData.reportsByMonth} />
        <ChartCard title="Connection Acceptance Rate" type="line" metric={dashboardData.acceptanceRate} data={dashboardData.reportsByMonth} />
        <div className="stitch-panel rounded-sm p-6"><SectionHeader title="Recent Activity" /><Timeline items={dashboardData.recentActivity.map((log) => ({ title: log.title, description: `${log.actor} - ${log.description}`, date: log.date }))} /></div>
      </div>
    </PortalContent>
  );
}

function AdminSettingsPanel({ initialSettings = {} }) {
  const [settings, setSettings] = useState({
    publicSearchEnabled: Boolean(initialSettings.publicSearchEnabled),
    reportSubmissionEnabled: Boolean(initialSettings.reportSubmissionEnabled),
    maintenanceMode: Boolean(initialSettings.maintenanceMode),
    englishTextEmbeddingEnabled: Boolean(initialSettings.englishTextEmbeddingEnabled),
    englishTextEmbeddingDevelopmentMode: Boolean(initialSettings.englishTextEmbeddingDevelopmentMode),
    englishTextEmbeddingThreshold: initialSettings.englishTextEmbeddingThreshold ?? 35,
    recommendationDisplayThreshold: initialSettings.recommendationDisplayThreshold ?? 0,
    duplicateWarningThreshold: initialSettings.duplicateWarningThreshold ?? 85
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error || "Unable to update settings.");
      return;
    }
    setSettings(result.settings);
    setNotice("Settings saved and audited.");
  };
  return (
    <form className="stitch-panel rounded-sm p-6" onSubmit={save}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["publicSearchEnabled", "Public search enabled"],
          ["reportSubmissionEnabled", "Report submission enabled"],
          ["englishTextEmbeddingEnabled", "English text embeddings (development only)"],
          ["maintenanceMode", "Maintenance mode"]
        ].map(([key, label]) => (
          <label key={key} className="flex min-h-12 items-center gap-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm">
            <input className="h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={Boolean(settings[key])} onChange={(event) => update(key, event.target.checked)} />
            <span>{label}</span>
          </label>
        ))}
        <Field label="Recommendation display threshold" type="number" register={{ value: settings.recommendationDisplayThreshold, min: 0, max: 100, onChange: (event) => update("recommendationDisplayThreshold", Number(event.target.value)) }} />
        <Field label="English text development threshold" type="number" register={{ value: settings.englishTextEmbeddingThreshold, min: 0, max: 100, onChange: (event) => update("englishTextEmbeddingThreshold", Number(event.target.value)) }} />
        <Field label="Duplicate warning threshold" type="number" register={{ value: settings.duplicateWarningThreshold, min: 0, max: 100, onChange: (event) => update("duplicateWarningThreshold", Number(event.target.value)) }} />
      </div>
      <p className="mt-4 text-sm text-muted">English text embeddings run only when development mode and this setting are both enabled. Evaluation remains deferred. Recommendation thresholds affect which possible similarities are displayed; human review is required.</p>
      {notice ? <div className="mt-4 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary">{notice}</div> : null}
      {error ? <div className="mt-4 rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary">{error}</div> : null}
      <button className={`${buttonClass} mt-5 bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit">Save Settings</button>
    </form>
  );
}

export function AdminManagePage({ manageData = { reports, users: [], auditLogs: [], recommendations: [], settings: {} } }) {
  const [adminReports, setAdminReports] = useState(manageData.reports);
  const [adminUsers, setAdminUsers] = useState(manageData.users || []);
  const [adminError, setAdminError] = useState("");
  const [reportQuery, setReportQuery] = useState("");
  const [reportType, setReportType] = useState("All Types");
  const [reportVisibility, setReportVisibility] = useState("All Visibility");
  const [reportStatus, setReportStatus] = useState("All Statuses");
  const normalizedReportQuery = reportQuery.trim().toLowerCase();
  const filteredAdminReports = adminReports.filter((report) => {
    const matchesQuery = !normalizedReportQuery || `${report.id} ${report.name || ""} ${report.region || ""}`.toLowerCase().includes(normalizedReportQuery);
    return matchesQuery
      && (reportType === "All Types" || report.type === reportType)
      && (reportVisibility === "All Visibility" || report.visibility === reportVisibility)
      && (reportStatus === "All Statuses" || report.status === reportStatus);
  });
  const updateReportStatus = async (report, status) => {
    setAdminError("");
    const response = await fetch(`/api/reports/${report.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status })
    });
    const result = await response.json();
    if (!response.ok) {
      setAdminError(result.error || "Unable to update report.");
      return;
    }
    const statusLabel = result.status === "PUBLIC" ? "Content Review Completed" : result.status === "HIDDEN" ? "Hidden" : result.status === "ARCHIVED" ? "Archived" : "Report Under Review";
    const visibilityLabel = result.visibility === "PUBLIC" ? "Public" : result.visibility === "HIDDEN" ? "Hidden" : "Limited";
    setAdminReports((current) => current.map((item) => item.id === report.id ? { ...item, status: statusLabel, visibility: visibilityLabel } : item));
  };
  const updateUserStatus = async (user, action) => {
    setAdminError("");
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setAdminError(result.error || "Unable to update user.");
      return;
    }
    setAdminUsers((current) => current.map((item) => item.id === user.id ? result.user : item));
  };
  const reportColumns = [
    { key: "id", label: "Report ID" },
    { key: "type", label: "Type" },
    { key: "region", label: "Broad Region" },
    { key: "date", label: "Submitted Date" },
    { key: "visibility", label: "Visibility" },
    { key: "status", label: "Moderation Status" },
    { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><button className="text-accent" onClick={() => updateReportStatus(row, "PUBLIC")}>Make Public</button><button className="text-accent" onClick={() => updateReportStatus(row, "UNDER_REVIEW")}>Restore to Review</button><button className="text-accent" onClick={() => updateReportStatus(row, "HIDDEN")}>Hide</button><button className="text-accent" onClick={() => updateReportStatus(row, "ARCHIVED")}>Archive</button></div> }
  ];
  const userColumns = [
    { key: "name", label: "User Account" },
    { key: "role", label: "Role" },
    { key: "region", label: "Broad Region" },
    { key: "date", label: "Registration Date" },
    { key: "reports", label: "Reports Submitted" },
    { key: "status", label: "Account Status" },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button className="text-accent" onClick={() => updateUserStatus(row, "activate")} disabled={row.status === "Active"}>Activate</button>
          <button className="text-accent" onClick={() => updateUserStatus(row, "deactivate")} disabled={row.status === "Deactivated"}>Deactivate</button>
        </div>
      )
    }
  ];
  const auditColumns = [
    { key: "timestamp", label: "Timestamp" },
    { key: "actor", label: "Actor" },
    { key: "action", label: "Action" },
    { key: "module", label: "Module" },
    { key: "recordId", label: "Record ID" },
    { key: "details", label: "Safe Details" }
  ];
  const recommendationColumns = [
    { key: "source", label: "Source Case" },
    { key: "target", label: "Related Case" },
    { key: "score", label: "Score" },
    { key: "quality", label: "Quality Label" },
    { key: "status", label: "Status" },
    { key: "created", label: "Created" }
  ];
  return (
    <PortalContent title="Admin Manage" description="Reports, Users, Audit Logs, and Settings are consolidated into one responsive management page.">
      {adminError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary">{adminError}</div> : null}
      <ResponsiveTabs tabs={[
        { id: "reports", label: "Reports", content: <div className="grid gap-5"><FilterBar><SearchInput value={reportQuery} onChange={setReportQuery} placeholder="Search reports" /><Select value={reportType} onChange={setReportType} options={["All Types", ...new Set(adminReports.map((report) => report.type))]} label="Report type" /><Select value={reportVisibility} onChange={setReportVisibility} options={["All Visibility", ...new Set(adminReports.map((report) => report.visibility))]} label="Visibility" /><Select value={reportStatus} onChange={setReportStatus} options={["All Statuses", ...new Set(adminReports.map((report) => report.status))]} label="Moderation status" /></FilterBar><DataTable columns={reportColumns} rows={filteredAdminReports} /></div> },
        { id: "recommendations", label: "Recommendations", content: <div className="grid gap-5"><div className="rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted">Admin can review recommendation quality labels and statuses, but cannot confirm identity or force contact.</div><DataTable columns={recommendationColumns} rows={manageData.recommendations || []} /></div> },
        { id: "users", label: "Users", content: <DataTable columns={userColumns} rows={adminUsers} /> },
        { id: "audit", label: "Audit Logs", content: <DataTable columns={auditColumns} rows={manageData.auditLogs || []} /> },
        { id: "settings", label: "Settings", content: <AdminSettingsPanel initialSettings={manageData.settings} /> }
      ]} />
    </PortalContent>
  );
}

export function AdminStaffPage({ initialStaff = [] }) {
  const [staff, setStaff] = useState(initialStaff);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    const response = await fetch("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return setError(result.error || "Unable to create staff account.");
    setStaff((current) => [{ ...result.staff, createdAt: new Date().toISOString() }, ...current]);
    setForm({ name: "", email: "", password: "" }); setMessage("Admin staff account created and audited.");
  };
  return <PortalContent title="Admin Staff" description="Create and review authenticated Admin accounts. Public registration cannot grant this role.">
    <form className="stitch-panel grid gap-4 rounded-sm p-6 md:grid-cols-3" onSubmit={submit}>
      <label><span className="mb-2 block text-sm font-semibold">Staff name</span><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      <label><span className="mb-2 block text-sm font-semibold">Staff email</span><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
      <label><span className="mb-2 block text-sm font-semibold">Temporary password</span><input className={inputClass} type="password" minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
      <div className="md:col-span-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted">Share the temporary password securely. Staff should sign in at <span className="text-accent">/admin/login</span>.</div>
      {error ? <div className="md:col-span-3 text-sm text-[var(--danger)]">{error}</div> : null}{message ? <div className="md:col-span-3 text-sm text-[var(--success)]">{message}</div> : null}
      <button className={`${buttonClass} bg-accent text-white md:col-span-3`} type="submit">Create Admin Staff</button>
    </form>
    <div className="grid gap-3">{staff.map((item) => <div className="stitch-panel flex flex-col justify-between gap-2 rounded-sm p-5 sm:flex-row" key={item.id}><div><p className="font-semibold text-white">{item.name}</p><p className="text-sm text-muted">{item.email}</p></div><StatusBadge status={item.status === "ACTIVE" ? "Active" : "Deactivated"} /></div>)}</div>
  </PortalContent>;
}

export function Content({ children, narrow = false }) {
  return <div className={cn("mx-auto grid max-w-[1500px] gap-7 px-5 pb-16 sm:px-8", narrow && "max-w-3xl")}>{children}</div>;
}

function PortalContent({ title, description, children }) {
  return (
    <div className="min-h-screen min-w-0 flex-1 overflow-x-hidden bg-background lg:ml-0">
      <div className="mx-auto grid min-w-0 max-w-[1320px] gap-7 px-5 pb-14 pt-20 sm:px-8 lg:pt-7">
        <PageHeader eyebrow="HumTrace AI" title={title} description={description} />
        {children}
      </div>
    </div>
  );
}

function ScorePill({ score, label }) {
  return (
    <div className="rounded-sm border border-[var(--border)] bg-deep p-5 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-3xl font-bold text-accent">{clampScore(score)}%</p>
    </div>
  );
}

function ScoreBar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between gap-4 text-xs"><span className="text-muted">{label}</span><span className="font-mono text-primary">{value}%</span></div>
      <div className="mt-2 h-2 rounded-full bg-high"><div className="h-2 rounded-full bg-accent" style={{ width: `${clampScore(value)}%` }} /></div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-primary">{value}</dd>
    </div>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Field({ label, register = {}, error, type = "text" }) {
  const id = useId();
  return (
    <label htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-primary">{label}</span>
      <input id={id} className={inputClass} type={type} {...register} />
      <ErrorText text={error} />
    </label>
  );
}

function SelectField({ label, register = {}, error, options }) {
  const id = useId();
  return (
    <label htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-primary">{label}</span>
      <select id={id} className={inputClass} {...register}>
        <option value="">Select</option>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
      <ErrorText text={error} />
    </label>
  );
}

function ErrorText({ text }) {
  return text ? <p className="mt-2 text-sm text-warning" role="alert">{text}</p> : null;
}
