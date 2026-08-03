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
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Home,
  Lock,
  LogOut,
  LoaderCircle,
  Menu,
  Search,
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
  chartReportsByCity,
  chartReportsByMonth,
  connectionRequests,
  reports
} from "@/data/mock-data";
import { clampScore, cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-sm border border-[var(--border)] bg-deep px-4 py-3 text-sm text-primary placeholder:text-muted focus:border-accent";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-accent";

async function requestJson(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let result = {};
    if (text) {
      try { result = JSON.parse(text); }
      catch { throw new Error("The server returned an unreadable response. Please retry."); }
    }
    if (!response.ok) {
      const error = new Error(result.error || (response.status >= 500 ? "The service is temporarily unavailable. Please retry." : "The request could not be completed."));
      error.status = response.status;
      throw error;
    }
    return result;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("This request took too long. Check the service and retry.");
    if (error instanceof TypeError) throw new Error("Unable to reach HumTrace. Check your connection and retry.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function PendingLabel({ children }) {
  return <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" />{children}</>;
}

function RequiredMark() {
  return <><span className="ml-1 text-accent" aria-hidden="true">*</span><span className="sr-only"> (required)</span></>;
}

function LogoText({ className = "text-xl" }) {
  return (
    <span className={`block font-display ${className} font-bold tracking-tight text-primary`}>
      HumTrace <span className="font-medium text-accent">AI</span>
    </span>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [authState, setAuthState] = useState({ checked: false, user: null });
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef(null);
  useEffect(() => {
    let active = true;
    requestJson("/api/auth/me", {}, 10000)
      .then((result) => { if (active) setAuthState({ checked: true, user: result.user || null }); })
      .catch(() => { if (active) setAuthState({ checked: true, user: null }); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!accountOpen) return undefined;
    const closeAccountMenu = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && accountMenuRef.current?.contains(event.target)) return;
      setAccountOpen(false);
    };
    document.addEventListener("pointerdown", closeAccountMenu);
    window.addEventListener("keydown", closeAccountMenu);
    return () => {
      document.removeEventListener("pointerdown", closeAccountMenu);
      window.removeEventListener("keydown", closeAccountMenu);
    };
  }, [accountOpen]);
  const dashboardHref = authState.user?.role === "ADMIN" ? "/admin/dashboard" : "/reporter/dashboard";
  const logout = async () => {
    setLogoutPending(true);
    setLogoutError("");
    try {
      const result = await requestJson("/api/auth/logout", { method: "POST" });
      window.location.href = result.redirectTo || "/";
    } catch (error) {
      setLogoutError(error.message);
      setLogoutPending(false);
    }
  };
  const firstName = authState.user?.name?.trim().split(/\s+/)[0] || "Account";
  const dashboardLabel = authState.user?.role === "ADMIN" ? "Admin Dashboard" : "My Dashboard";
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-deep/98 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between px-5 py-0 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-sm bg-[var(--accent-soft)] text-accent">
            <Shield size={22} aria-hidden="true" />
          </span>
          <LogoText />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Public navigation">
          {publicRoutes.map((route) => (
            <Link key={route.href} href={route.href} className="border-b-2 border-transparent px-4 py-5 text-sm text-muted hover:border-accent hover:text-white">
              {route.label}
            </Link>
          ))}
          {!authState.checked ? <span className="h-11 w-40 animate-pulse rounded-sm bg-surface" aria-label="Checking sign-in status" /> : authState.user ? (
            <div className="ml-2 flex items-center gap-2">
              <Link href={dashboardHref} className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`}>{dashboardLabel}</Link>
              <div className="relative" ref={accountMenuRef}>
                <button className="grid h-11 w-11 place-items-center rounded-full border border-[var(--border)] bg-[var(--accent-soft)] text-sm font-bold text-accent hover:border-accent" onClick={() => setAccountOpen((current) => !current)} aria-label="Open account menu" aria-haspopup="menu" aria-expanded={accountOpen} title="Account menu">
                  {firstName.slice(0, 1).toUpperCase()}
                </button>
                {accountOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.65rem)] w-60 overflow-hidden rounded-sm border border-[var(--border)] bg-elevated shadow-2xl" role="menu">
                    <div className="border-b border-[var(--border)] px-4 py-4">
                      <p className="text-xs text-muted">Signed in as</p>
                      <p className="mt-1 truncate text-sm font-semibold text-primary">{authState.user.name}</p>
                    </div>
                    <div className="p-2">
                      <button className="flex min-h-11 w-full items-center gap-3 rounded-sm px-3 text-left text-sm font-semibold text-primary hover:bg-deep" onClick={logout} disabled={logoutPending} role="menuitem">
                        {logoutPending ? <PendingLabel>Signing out</PendingLabel> : <><LogOut size={17} aria-hidden="true" />Sign out</>}
                      </button>
                    </div>
                    {logoutError ? <p className="px-4 pb-3 text-sm text-[var(--danger)]" role="alert">{logoutError}</p> : null}
                  </div>
                ) : null}
              </div>
            </div>
          ) : <>
            <Link href="/login" className={`${buttonClass} border border-[var(--border)] text-primary`}>Sign In</Link>
            <Link href="/register" className={`${buttonClass} bg-accent text-white`}>Create account</Link>
          </>}
        </nav>
        <button className="my-2 grid h-11 w-11 place-items-center rounded-sm border border-[var(--border)] lg:hidden" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu size={22} />
        </button>
      </div>
      {open ? <MobileDrawer title={authState.user ? `Signed in as ${authState.user.name}` : "HumTrace AI"} onClose={() => setOpen(false)} routes={authState.user ? [...publicRoutes, { href: dashboardHref, label: dashboardLabel }] : [...publicRoutes, { href: "/login", label: "Sign in" }, { href: "/register", label: "Create account" }]} onLogout={authState.user ? logout : undefined} logoutPending={logoutPending} logoutError={logoutError} /> : null}
      {logoutError ? <p className="sr-only" role="alert">{logoutError}</p> : null}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-deep">
      <div className="mx-auto grid max-w-[1500px] gap-8 px-5 py-10 text-sm text-muted sm:px-8 md:grid-cols-[1.4fr_1fr]">
        <div>
          <LogoText className="text-2xl" />
          <p className="mt-2 max-w-xl">A final-year project for reporting missing and unidentified people and reviewing possible matches.</p>
          <p className="mt-3 text-xs">Possible matches are suggestions, not confirmed identities.</p>
        </div>
        <div className="md:text-right">
          <p className="font-semibold text-primary">Emergency contacts in Pakistan</p>
          <p className="mt-2">Rescue 1122 · Police 15 · Edhi 115 · Chhipa 1020</p>
          <div className="mt-3 flex gap-4 md:justify-end">
            <Link className="hover:text-accent" href="/about">About</Link>
            <Link className="hover:text-accent" href="/contact">Help</Link>
            <Link className="hover:text-accent" href="/admin/login">Admin</Link>
          </div>
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
      <div className="mx-auto grid min-h-[590px] max-w-[1500px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:py-20">
        <div className="self-center text-center lg:text-left">
          <p className="text-sm font-semibold text-accent">Missing and unidentified person reports</p>
          <h1 className="stitch-title mx-auto mt-4 max-w-4xl font-display text-4xl sm:text-6xl lg:mx-0 lg:text-7xl">
            Share a report.<br />Review possible matches.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted lg:mx-0">
            Add the details you know, compare them with other reports, and request contact when something looks relevant.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Link href="/report/missing" className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`}>Report a missing person</Link>
            <Link href="/report/unidentified" className={`${buttonClass} border border-[var(--border)] bg-deep text-primary hover:border-accent`}>Report an unidentified person</Link>
          </div>
          <Link href="/browse" className="mt-4 inline-flex min-h-10 items-center gap-2 py-2 text-sm font-semibold text-accent">
            Browse reports <ChevronRight size={16} />
          </Link>
        </div>
        <div className="stitch-panel self-center overflow-hidden rounded-sm p-6 shadow-soft">
          <div className="rounded-sm bg-[var(--accent-soft)] p-4 sm:p-5">
            <div className="overflow-hidden rounded-sm border border-[var(--border)] bg-white">
              <Image src="/images/humtrace-face-scanner-hero.png" alt="Geometric face pattern inside circular comparison rings" width={1536} height={1024} priority className="h-auto w-full object-cover" />
            </div>
            <div className="mt-5 text-center">
              <p className="text-lg font-semibold text-primary">Details and facial patterns can highlight a possible match</p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">You review the similarities and decide whether to request contact.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PageHeader({ eyebrow = "HumTrace", title, description, action }) {
  return (
    <div className="mx-auto max-w-[1500px] px-5 pb-8 pt-10 sm:px-8 lg:pt-12">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="stitch-label">{eyebrow}</p>
          <h1 className="stitch-title mt-3 font-display text-3xl sm:text-5xl lg:text-6xl">{title}</h1>
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
      <h2 className="font-display text-2xl font-semibold tracking-tight text-primary">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-muted">{description}</p> : null}
    </div>
  );
}

export function DashboardCard({ title, value, icon: Icon = FileText, meta }) {
  return (
    <article className="stitch-panel rounded-sm p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-primary">{title}</p>
          {value !== "" ? <p className="mt-4 font-display text-4xl font-bold text-primary">{value}</p> : null}
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

function ReportPhoto({ report, className = "", iconSize = 42 }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [report?.photoUrl]);
  const showPhoto = Boolean(report?.photoUrl && !failed);
  return (
    <div className={`relative overflow-hidden bg-[var(--accent-soft)] ${className}`}>
      {showPhoto ? <>
        <Image src={report.photoUrl} alt="" fill sizes="(max-width: 768px) 100vw, 40vw" unoptimized aria-hidden="true" className="scale-110 object-cover opacity-30 blur-xl" />
        <Image src={report.photoUrl} alt={`Photograph for report ${report.id || "case"}`} fill sizes="(max-width: 768px) 100vw, 40vw" unoptimized className="relative z-[1] object-contain object-center" onError={() => setFailed(true)} />
      </> : (
        <span className="absolute inset-0 grid place-items-center text-accent">
          <span className="grid h-16 w-16 place-items-center rounded-full border border-accent/20 bg-deep"><User size={iconSize} aria-hidden="true" /></span>
        </span>
      )}
    </div>
  );
}

export function ReportCard({ report, onViewDetails }) {
  return (
    <article className="stitch-panel overflow-hidden rounded-sm">
      <div className="relative aspect-[16/9] border-b border-[var(--border)]">
        <ReportPhoto report={report} className="h-full w-full" iconSize={30} />
        <span className="absolute left-4 top-4 z-[2] rounded-full bg-background/90 px-3 py-1.5 text-xs font-semibold text-accent shadow-sm backdrop-blur">{report.type}</span>
      </div>
      <div className="p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-accent">{report.id}</span>
          <StatusBadge status={report.status} />
        </div>
        <h3 className="mt-4 font-display text-2xl font-semibold text-primary">{report.name || (report.type === "Missing Person" ? "Name not publicly available" : "Unknown Person")}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">{report.description}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Info label="Case ID" value={report.id.replace("HT-M", "MP").replace("HT-U", "UI")} />
          <Info label="Age / Gender" value={`${report.age} · ${report.gender || "Not specified"}`} />
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
  const [requestPending, setRequestPending] = useState(false);
  const [humanReviewAcknowledged, setHumanReviewAcknowledged] = useState(false);
  const [authState, setAuthState] = useState({ checked: false, user: null });

  useEffect(() => {
    let active = true;
    setRequestSent(false);
    setRequestOpen(false);
    setRequestMessage("");
    setRequestError("");
    setRequestPending(false);
    setHumanReviewAcknowledged(false);
    setAuthState({ checked: false, user: null });
    if (!report) return () => { active = false; };

    requestJson("/api/auth/me", {}, 10000)
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
    setRequestPending(true);
    try {
      await requestJson("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: publicCaseId, message: requestMessage, humanReviewAcknowledged })
      });
      setRequestSent(true);
      setRequestOpen(false);
    } catch (error) {
      setRequestError(error.message);
    } finally {
      setRequestPending(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="report-details-title">
      <section className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-sm border border-[var(--border)] bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] p-5">
          <div>
            <p className="stitch-label">{publicCaseId}</p>
            <h2 id="report-details-title" className="mt-2 font-display text-3xl font-semibold text-primary">{report.name || "Unknown Person"}</h2>
            <p className="mt-2 text-sm text-muted">{report.photoUrl ? "Public report details are shown for this local presentation." : "Private notes, photographs and contact information are hidden."}</p>
          </div>
          <button className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-[var(--border)] text-primary hover:bg-surface" onClick={onClose} aria-label="Close details">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-sm border border-[var(--border)] bg-deep p-5">
            <ReportPhoto report={report} className="aspect-[4/3] w-full rounded-sm" iconSize={56} />
            <p className="mt-4 text-xs leading-6 text-muted">{report.photoUrl ? "Local presentation photo. Disable demo photo visibility before deployment." : "No public photograph is available for this report."}</p>
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
              {!authState.checked ? <button className={`${buttonClass} bg-accent text-white opacity-70`} disabled><PendingLabel>Checking Sign-In</PendingLabel></button> : canRequestContact ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => setRequestOpen(true)}>Request Contact</button> : <Link className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} href={`/login?returnTo=${encodeURIComponent(`/browse?caseId=${publicCaseId}`)}`}>Sign In to Request Contact</Link>}
              <Link href={`/track?caseId=${encodeURIComponent(publicCaseId)}`} className={`${buttonClass} border border-[var(--border)] text-primary`}>Track This Case</Link>
              <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={onClose}>Back to Results</button>
            </div>
          </div>
        </div>
        {requestOpen ? (
          <div className="border-t border-[var(--border)] bg-deep p-5">
            <form className="grid gap-4" onSubmit={submitRequest}>
              <div>
                <p className="font-display text-xl font-semibold text-primary">Request contact</p>
                <p className="mt-2 text-sm leading-6 text-muted">Write a short reason. The request is saved for reporter review, and contact remains hidden until acceptance.</p>
              </div>
              <label>
                <span className="mb-2 block text-sm font-semibold text-primary">Reason for contact</span>
                 <textarea className={`${inputClass} min-h-28`} value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} required minLength={10} placeholder="Explain why these public details may be relevant to your report." />
               </label>
              <label className="flex items-start gap-3 text-sm text-muted"><input className="mt-1 h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={humanReviewAcknowledged} onChange={(event) => setHumanReviewAcknowledged(event.target.checked)} required /><span>I reviewed this as a possible connection only. I understand it may be wrong and does not confirm identity.</span></label>
              <div className="rounded-sm border border-[var(--border)] bg-background p-4 text-sm text-muted">
                 This does not reveal either reporter&apos;s contact details. Contact sharing happens only after the recipient accepts.
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                 <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit" disabled={requestPending}>{requestPending ? <PendingLabel>Sending</PendingLabel> : "Send Request"}</button>
                 <button className={`${buttonClass} border border-[var(--border)] text-primary`} type="button" onClick={() => setRequestOpen(false)} disabled={requestPending}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function RecommendationCard({ item }) {
  const [hidden, setHidden] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  if (hidden) {
    return <EmptyState title="Match hidden" description="This item has been removed from your current view." />;
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
          <h3 className="mt-3 font-display text-3xl font-semibold text-primary">Possible match</h3>
          <p className="mt-2 text-sm text-muted">This score is a suggestion, not proof of identity.</p>
        </div>
        <ScorePill score={item.score} label="Match score" />
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
            <p className="font-semibold text-white">Request contact for this possible recommendation</p>
            <p className="mt-2 text-sm text-muted">Explain why this possible recommendation should be reviewed. Contact details remain hidden until recipient acceptance.</p>
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
        {(Array.isArray(items) ? items : []).map((item) => item.available === false
          ? <div key={item.label} className="flex items-center justify-between gap-3 text-sm"><span className="text-muted">{item.label}</span><span className="font-mono text-xs uppercase text-muted">Unavailable</span></div>
          : <ScoreBar key={item.label} label={item.label} value={item.value} />)}
      </div>
    </div>
  );
}

function RecommendationReviewCard({ item, canManage = false, onRemoved }) {
  const [hidden, setHidden] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [humanReviewAcknowledged, setHumanReviewAcknowledged] = useState(false);
  const [status, setStatus] = useState(item.status || "New");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  if (hidden) {
    return <EmptyState title="Match dismissed" description="This item has been removed from your current view." />;
  }

  const updateRecommendation = async (action, body = {}) => {
    setError("");
    setNotice("");
    if (!canManage || !item.id) {
      setError("Please sign in to manage recommendations or request contact.");
      return null;
    }
    if (pendingAction) return null;
    setPendingAction(action);
    try {
      const result = await requestJson(`/api/recommendations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body })
      });
      setStatus(result.status === "CONTACT_REQUESTED" ? "Contact Requested" : result.status === "DISMISSED" ? "Dismissed" : result.status === "VIEWED" ? "Viewed" : status);
      if (action === "view") setNotice("Recommendation marked as viewed.");
      if (action === "flag") setNotice("Quality concern recorded for operational review.");
      return result;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    } finally {
      setPendingAction("");
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    const result = await updateRecommendation("request_contact", { message: requestMessage, humanReviewAcknowledged });
    if (result) {
      setRequestSent(true);
      setRequestOpen(false);
    }
  };

  const dismiss = async () => {
    const result = canManage ? await updateRecommendation("dismiss") : {};
    if (result || !canManage) { setHidden(true); onRemoved?.(item.id || item.similarReportId); }
  };

  return (
    <article className="stitch-panel rounded-sm p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="stitch-label">{item.reportId} / Related Case {item.similarReportId}</p>
          <h3 className="mt-3 font-display text-3xl font-semibold text-primary">Possible match</h3>
          <p className="mt-2 text-sm text-muted">Review the details carefully. A score does not confirm identity.</p>
        </div>
        <ScorePill score={item.score} label="Match score" />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <ReportPhoto report={{ ...item.targetReport, id: item.similarReportId }} className="aspect-[4/3] w-full rounded-sm border border-[var(--border)]" iconSize={48} />
        <ScoreBreakdown items={item.breakdown || []} />
        <div className="rounded-sm border border-[var(--border)] bg-deep p-5">
          <p className="font-semibold text-primary">Details in common</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(item.attributes || []).map((attribute) => (
              <span key={attribute} className="rounded-full bg-[var(--accent-soft)] px-3 py-2 text-xs font-semibold text-accent">{attribute}</span>
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
      {notice ? <div className="mt-5 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary" role="status">{notice}</div> : null}
      {requestSent ? <div className="mt-5 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary"><strong className="text-white">Contact request sent.</strong> Contact details remain hidden until the recipient accepts.</div> : null}
      {requestOpen ? (
        <form className="mt-5 grid gap-4 rounded-sm border border-[var(--border)] bg-deep p-5" onSubmit={submitRequest}>
          <p className="font-semibold text-primary">Request contact about this match</p>
          <label>
            <span className="mb-2 block text-sm font-semibold text-primary">Reason for contact</span>
            <textarea className={`${inputClass} min-h-24`} value={requestMessage} onChange={(event) => setRequestMessage(event.target.value)} required />
          </label>
          <label className="flex items-start gap-3 text-sm text-muted"><input className="mt-1 h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={humanReviewAcknowledged} onChange={(event) => setHumanReviewAcknowledged(event.target.checked)} required /><span>I reviewed this suggestion as a possible similarity only. I understand it may be wrong and does not confirm identity.</span></label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit" disabled={Boolean(pendingAction)}>{pendingAction === "request_contact" ? <PendingLabel>Sending</PendingLabel> : "Send Request"}</button>
            <button className={`${buttonClass} border border-[var(--border)] text-primary`} type="button" onClick={() => setRequestOpen(false)} disabled={Boolean(pendingAction)}>Cancel</button>
          </div>
        </form>
      ) : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {canManage && !requestSent ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => setRequestOpen(true)} disabled={Boolean(pendingAction)}>Request Contact</button> : null}
        <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={dismiss} disabled={Boolean(pendingAction)}>{pendingAction === "dismiss" ? <PendingLabel>Dismissing</PendingLabel> : canManage ? "Not a match" : "Hide match"}</button>
        {!canManage ? <Link className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} href={`/browse?caseId=${encodeURIComponent(item.similarReportId)}`}>Review Public Report</Link> : null}
      </div>
    </article>
  );
}

function RecommendationResults({ items = [], canManage = false }) {
  const [page, setPage] = useState(0);
  const [removed, setRemoved] = useState(() => new Set());
  const pageSize = 5;
  useEffect(() => { setPage(0); setRemoved(new Set()); }, [items]);
  const activeItems = items.filter((item) => !removed.has(item.id || item.similarReportId));
  const visible = activeItems.slice(page * pageSize, page * pageSize + pageSize);
  const hasNext = (page + 1) * pageSize < activeItems.length;
  if (!activeItems.length) {
    return (
      <div className="stitch-panel rounded-sm p-6">
        <EmptyState title="No possible matches yet" description="New matches will appear here after reports are compared." />
        <Link className={`${buttonClass} mt-5 border border-[var(--border)] text-primary`} href="/browse">Browse public reports</Link>
      </div>
    );
  }
  return (
    <section className="grid gap-5">
      <div className="rounded-sm border border-[var(--border)] bg-[var(--accent-soft)] p-4 text-sm text-primary">Possible matches can be wrong. Check the photograph and report details before requesting contact.</div>
      <p className="text-sm text-muted">Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, activeItems.length)} of {activeItems.length} possible matches.</p>
      {visible.map((item) => <RecommendationReviewCard key={item.id || item.similarReportId} item={item} canManage={canManage} onRemoved={(id) => setRemoved((current) => new Set(current).add(id))} />)}
      <div className="flex flex-col gap-3 sm:flex-row">
        {page > 0 ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => setPage((current) => current - 1)}>Previous 5</button> : null}
        {hasNext ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => setPage((current) => current + 1)}>View Next 5</button> : null}
        <Link className={`${buttonClass} border border-[var(--border)] text-primary`} href="/browse">Browse public reports</Link>
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
      const result = await requestJson(`/api/contact-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
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
       <dl className="mt-5 grid gap-3 sm:grid-cols-3">
         <Info label="Broad Region" value={request.region} />
         <Info label="Request Date" value={request.date} />
        <Info label="Contact" value={accepted ? contact : "Hidden until acceptance"} />
      </dl>
      {accepted ? <p className="mt-4 rounded-md bg-[var(--accent-soft)] p-3 text-sm text-accent">Contact Request Accepted. Only the selected contact method is visible to the two participants. This does not confirm identity.</p> : null}
      {notice ? <p className="mt-4 rounded-md bg-[var(--accent-soft)] p-3 text-sm text-accent">{notice}</p> : null}
      {error ? <p className="mt-4 rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-3 text-sm text-primary">{error}</p> : null}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {request.canAccept && status === "Pending" ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={() => review("accept")} disabled={Boolean(pending)}>{pending === "accept" ? <PendingLabel>Accepting</PendingLabel> : "Accept Contact Request"}</button> : null}
        {request.canDecline && status === "Pending" ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => review("decline")} disabled={Boolean(pending)}>{pending === "decline" ? <PendingLabel>Declining</PendingLabel> : "Decline Contact Request"}</button> : null}
        {request.canCancel && status === "Pending" ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => review("cancel")} disabled={Boolean(pending)}>{pending === "cancel" ? <PendingLabel>Cancelling</PendingLabel> : "Cancel Request"}</button> : null}
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
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", tone)}>{status}</span>;
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
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
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
      <h2 className="font-display text-xl font-semibold tracking-tight text-primary">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function FileUploadField({ error, onFileChange, required = false }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [localError, setLocalError] = useState("");
  const inputRef = useRef(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  const handleChange = (event) => {
    const selected = event.target.files?.[0];
    if (preview) URL.revokeObjectURL(preview);
    const supported = selected && ["image/jpeg", "image/png", "image/webp"].includes(selected.type);
    const valid = supported && selected.size <= 5 * 1024 * 1024;
    setLocalError(!selected ? "" : !supported ? "Choose a JPG, PNG, or WEBP image." : selected.size > 5 * 1024 * 1024 ? "Choose an image that is 5 MB or smaller." : "");
    setFile(valid ? selected : null);
    setPreview(valid ? URL.createObjectURL(selected) : "");
    onFileChange?.(valid ? selected : null);
  };
  const clearFile = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setLocalError("");
    if (inputRef.current) inputRef.current.value = "";
    onFileChange?.(null);
  };

  return (
    <div className="rounded-sm border border-dashed border-[var(--border)] bg-deep p-5">
      <p className="mb-3 text-sm font-semibold text-white">Person photo{required ? <RequiredMark /> : null}</p>
      <label className="grid min-h-44 cursor-pointer place-items-center rounded-sm border border-[var(--border)] bg-background p-5 text-center transition hover:border-accent">
        {preview ? (
          <Image src={preview} alt="Selected report preview" width={640} height={360} unoptimized className="max-h-48 w-full rounded-sm object-contain" />
        ) : (
          <span>
            <Upload className="mx-auto text-accent" size={28} aria-hidden="true" />
            <span className="mt-3 block text-sm font-semibold text-white">Choose a person photo</span>
            <span className="mt-1 block text-xs text-muted">JPG, PNG, or WEBP, maximum 5 MB. Use a clear, relevant person image.</span>
          </span>
        )}
        <input ref={inputRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleChange} aria-required={required} />
      </label>
      <div className="mt-3 flex flex-col justify-between gap-3 text-xs text-muted sm:flex-row sm:items-center">
        <span>{file ? file.name : "No file selected. A person/face image is required before submit."}</span>
        {file ? <button type="button" className="min-h-10 rounded-sm px-3 text-accent hover:bg-surface" onClick={clearFile}>Remove</button> : null}
      </div>
      <p className="mt-2 text-xs text-muted">The selected image is stored securely. Its display depends on the current report and presentation settings.</p>
      <ErrorText text={localError || error} />
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
        <button type="button" className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => copy(caseId, "Case ID copied")}>Copy Case ID</button>
        <button type="button" className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={() => copy(`${window.location.origin}/track?caseId=${encodeURIComponent(caseId)}`, "Tracking link copied")}>Copy Link</button>
        <Link href={`/track?caseId=${encodeURIComponent(caseId)}`} className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`}>Track This Case</Link>
      </div>
      {copied ? <p className="mt-3 text-sm text-muted" role="status">{copied}</p> : null}
    </div>
  );
}

export function DemoDataNotice() {
  return <span className="inline-flex rounded-full border border-accent/40 bg-[var(--accent-soft)] px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-accent">Local FYP Demo • Non-operational Data</span>;
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

export function MobileDrawer({ title, routes, onClose, onLogout, logoutPending, logoutError }) {
  const titleId = useId();
  const pathname = usePathname();
  useEffect(() => {
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 isolate min-h-screen lg:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button className="fixed inset-0 block min-h-screen w-full cursor-default bg-black/55" onClick={onClose} aria-label="Close navigation overlay" />
      <aside className="fixed inset-y-0 right-0 z-[1] flex min-h-screen w-[min(22rem,92vw)] flex-col overflow-y-auto border-l border-[var(--border)] bg-elevated shadow-2xl" style={{ backgroundColor: "#ffffff", height: "100dvh" }}>
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <p id={titleId} className="pr-3 font-display text-lg font-bold text-primary">{title}</p>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-[var(--border)] bg-deep text-primary hover:border-accent" onClick={onClose} aria-label="Close navigation"><X size={20} /></button>
        </div>
        <nav className="grid gap-2 p-4" aria-label="Mobile navigation">
          {routes.map((route) => {
            const active = route.href === "/" ? pathname === "/" : pathname === route.href || pathname.startsWith(`${route.href}/`);
            return (
              <Link key={route.href} href={route.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center rounded-md border px-4 py-3 text-sm font-semibold ${active ? "border-accent bg-[var(--accent-soft)] text-accent" : "border-[var(--border)] bg-deep text-primary hover:border-accent hover:text-accent"}`}>{route.label}</Link>
            );
          })}
        </nav>
        {onLogout ? <div className="mt-auto border-t border-[var(--border)] bg-deep p-4"><button className={`${buttonClass} w-full border border-[var(--border)] bg-elevated text-primary hover:border-accent`} onClick={onLogout} disabled={logoutPending}>{logoutPending ? <PendingLabel>Signing Out</PendingLabel> : <><LogOut size={16} />Logout</>}</button>{logoutError ? <p className="mt-3 text-sm text-[var(--danger)]" role="alert">{logoutError}</p> : null}</div> : null}
      </aside>
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
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const links = [...routes, { href: "/", label: "Public Site" }];
  const logout = async () => {
    setLogoutPending(true);
    setLogoutError("");
    try {
      const result = await requestJson("/api/auth/logout", { method: "POST" });
      window.location.href = result.redirectTo || "/login";
    } catch (error) {
      setLogoutError(error.message);
      setLogoutPending(false);
    }
  };
  return (
    <>
      <button className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-sm border border-[var(--border)] bg-surface lg:hidden" onClick={() => setOpen(true)} aria-label="Open portal navigation">
        <Menu size={21} />
      </button>
      {open ? <MobileDrawer title={title} routes={links} onClose={() => setOpen(false)} onLogout={logout} logoutPending={logoutPending} logoutError={logoutError} /> : null}
      <aside className="hidden min-h-screen w-[292px] shrink-0 border-r border-[var(--border)] bg-surface p-7 lg:block">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-sm bg-[var(--accent-soft)] text-accent"><Shield size={20} /></span>
          <span>
            <span className="block font-display text-2xl font-bold text-primary">HumTrace <span className="font-medium text-accent">AI</span></span>
            <span className="text-xs font-semibold text-accent">{title}</span>
          </span>
        </Link>
        <nav className="mt-14 grid gap-4">
          {routes.map((route) => {
            const active = pathname === route.href;
            return (
              <Link key={route.href} href={route.href} className={cn("rounded-sm px-5 py-3 text-sm font-semibold", active ? "bg-accent text-white" : "text-muted hover:bg-deep hover:text-primary")}>
                {route.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-12 grid gap-3 border-t border-[var(--border)] pt-8">
          <Link className={`${buttonClass} border border-[var(--border)] text-primary`} href="/">View public site</Link>
          <button className={`${buttonClass} border border-[var(--border)] text-primary`} onClick={logout} disabled={logoutPending}><LogOut size={16} /> {logoutPending ? <PendingLabel>Signing Out</PendingLabel> : "Logout"}</button>
          {logoutError ? <p className="text-sm text-[var(--danger)]" role="alert">{logoutError}</p> : null}
        </div>
      </aside>
    </>
  );
}

export function ResponsiveTabs({ tabs }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const tabSetId = useId();
  const current = tabs.find((tab) => tab.id === active) || tabs[0];
  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <div className="mb-6 flex w-full max-w-full gap-4 overflow-x-auto border-b border-[var(--border)] bg-transparent pb-1" role="tablist">
        {tabs.map((tab) => (
          <button key={tab.id} id={`${tabSetId}-tab-${tab.id}`} aria-controls={`${tabSetId}-panel-${tab.id}`} role="tab" aria-selected={active === tab.id} tabIndex={active === tab.id ? 0 : -1} onClick={() => setActive(tab.id)} className={cn("min-h-12 shrink-0 border-b-2 px-1 text-sm font-semibold", active === tab.id ? "border-accent text-accent" : "border-transparent text-muted hover:text-primary")}>{tab.label}</button>
        ))}
      </div>
      <div id={`${tabSetId}-panel-${current.id}`} role="tabpanel" aria-labelledby={`${tabSetId}-tab-${current.id}`}>{current.content}</div>
    </div>
  );
}

export function ChartCard({ title, type = "bar", data, metric }) {
  const chartData = data || (type === "line" ? chartReportsByMonth : chartReportsByCity);
  return (
    <div className="stitch-panel rounded-sm p-6">
      <h3 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-white">{title}</h3>
      {metric ? <div className="mt-4 rounded-sm border border-[var(--border)] bg-deep p-5"><p className="font-mono text-4xl font-bold text-accent">{metric.value}%</p><p className="mt-2 text-sm text-muted">{metric.label}</p></div> : null}
      {!metric ? <div className="mt-4 h-64">
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
      </div> : null}
    </div>
  );
}

export function BrowsePage({ reportsData = reports, availability = "" }) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("All Regions");
  const [type, setType] = useState("All Types");
  const [selectedReport, setSelectedReport] = useState(null);
  useEffect(() => {
    const caseId = new URLSearchParams(window.location.search).get("caseId")?.trim().toUpperCase();
    if (caseId) setSelectedReport(reportsData.find((report) => report.id === caseId) || null);
  }, [reportsData]);
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
        title="Browse reports"
        description="Search missing and unidentified person reports by location or case details."
      />
      <Content>
        <FilterBar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search by report ID, region, or detail" />
          <Select value={region} onChange={setRegion} options={["All Regions", ...regions.filter((item) => item !== "Prefer Not to Specify")]} label="Broad region filter" />
          <Select value={type} onChange={setType} options={["All Types", "Missing Person", "Unidentified Person"]} label="Report type filter" />
        </FilterBar>
        {availability ? <EmptyState title="Public browsing unavailable" description={availability} /> : filtered.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filtered.map((report) => <ReportCard key={report.id} report={report} onViewDetails={setSelectedReport} />)}</div> : <EmptyState title="No reports" description="No public report fits the current filters." />}
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
    event.preventDefault(); setError(""); setNotice(""); setResults(null); setLoading(true);
    try {
      const result = await requestJson("/api/search/recommendations", { method: "POST", body: new FormData(event.currentTarget) }, 210000);
      setResults(result.recommendations || []); setNotice(result.notice || "Search completed.");
    } catch (searchError) { setError(searchError.message); } finally { setLoading(false); }
  };
  return <PublicShell><PageHeader title="Smart Search" description="Compare a photograph or description with public reports." /><Content>
    <form className="stitch-panel grid gap-5 rounded-sm p-6" onSubmit={submit}>
      <div className="rounded-sm border border-[var(--border)] bg-[var(--accent-soft)] p-4 text-sm text-primary">Your search photograph is used only for this comparison and is not saved.</div>
      <label><span className="mb-2 block font-semibold">Search public report type</span><select className={inputClass} name="searchScope" defaultValue="ALL"><option value="ALL">All missing and unidentified reports</option><option value="UNIDENTIFIED">Unidentified reports only</option><option value="MISSING">Missing-person reports only</option></select><span className="mt-2 block text-xs text-muted">All eligible public reports in the selected scope are compared; up to 10 suggestions are shown five at a time.</span></label>
      <label><span className="mb-2 block font-semibold">Optional photograph</span><input className={inputClass} type="file" name="photo" accept="image/jpeg,image/png,image/webp" /><span className="mt-2 block text-xs text-muted">JPG, PNG or WEBP, maximum 5 MB. Search uploads are not stored.</span></label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label><span>Approximate age</span><input className={inputClass} name="age" /></label><label><span>Gender</span><select className={inputClass} name="gender" defaultValue=""><option value="">Not specified</option><option>Female</option><option>Male</option><option>Other</option></select></label><label><span>Height (cm)</span><input className={inputClass} type="number" name="heightCm" min="30" max="260" /></label><label><span>Weight (kg)</span><input className={inputClass} type="number" name="weightKg" min="2" max="300" /></label><label><span>Broad region</span><input className={inputClass} name="region" /></label><label><span>Location detail</span><input className={inputClass} name="location" /></label><label><span>Clothing</span><input className={inputClass} name="clothing" /></label><label><span>Identifying features</span><input className={inputClass} name="identifyingFeatures" /></label></div>
      <label><span>Description</span><textarea className={`${inputClass} min-h-28`} name="description" /></label>
      <label className="flex items-start gap-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm"><input className="mt-1 h-5 w-5 accent-[var(--accent)]" type="checkbox" name="aiProcessingConsent" value="true" required /><span>I am authorized to use these details or this photograph for this search. I understand similarity suggestions can be wrong and never confirm identity.</span></label>
      {loading ? <div className="flex items-start gap-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted" role="status"><LoaderCircle className="mt-0.5 animate-spin text-accent" size={18} /><span>Comparing public reports. This may take a few minutes.</span></div> : null}
      {error ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm" role="alert">{error} Please retry.</div> : null}<button type="submit" className={`${buttonClass} bg-accent text-white`} disabled={loading}>{loading ? <PendingLabel>Searching</PendingLabel> : "Find Possible Recommendations"}</button>
    </form>
    {notice ? <div className="rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted" role="status">{notice}</div> : null}
    {results !== null ? <RecommendationResults items={results} /> : null}
  </Content></PublicShell>;
}

export function ReportFormPage({ type, reporter }) {
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
    heightFeet: z.string().min(1, "Height in feet is required.").refine((value) => Number.isFinite(Number(value)) && Number(value) >= 1 && Number(value) <= 8.5, "Enter a realistic height from 1 to 8.5 feet."),
    weightKg: z.string().min(1, "Weight is required.").refine((value) => Number.isFinite(Number(value)) && Number(value) >= 2 && Number(value) <= 300, "Enter a realistic weight from 2 to 300 kg."),
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
  const reporterFields = reporter
    ? ["relationship", "reporterContext", "relationshipContext"]
    : ["reporterName", "reporterEmail", "reporterPhone", "preferredContactMethod", "relationship", "reporterContext", "relationshipContext"];
  const steps = [
    { title: "Person and location", fields: ["name", "age", "gender", "heightFeet", "weightKg", "region", "locationDetail", "date"] },
    { title: "Description and photo", fields: ["description", "clothing", "identifyingFeatures", "medicalCondition"] },
    { title: "Reporter and permissions", fields: [...reporterFields, "publicVisible", "aiProcessingConsent", "photoConfirm", "consent"] },
    { title: "Review and submit", fields: [] }
  ];
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoError, setPhotoError] = useState("");
  const [immediateRecommendations, setImmediateRecommendations] = useState([]);
  const [recommendationNotice, setRecommendationNotice] = useState("");
  const [claimCode, setClaimCode] = useState("");
  const { register, handleSubmit, trigger, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      consent: false,
      photoConfirm: false,
      publicVisible: false,
      aiProcessingConsent: false,
      preferredContactMethod: reporter?.preferredContactMethod || "EMAIL"
      ,reporterName: reporter?.name || ""
      ,reporterPhone: reporter?.phone || ""
      ,reporterEmail: reporter?.email || ""
    }
  });
  const values = watch();
  const nextStep = async () => {
    if (step === 1 && !photoFile) {
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
      const result = await requestJson("/api/reports", {
        method: "POST",
        body: formData
      }, 30000);
      setMessage(result.caseId);
      setClaimCode(result.claimCode || "");
      if (result.claimCode) {
        window.sessionStorage.setItem(`humtrace-report-claim:${result.caseId}`, result.claimCode);
      }
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
        title={missing ? "Report a missing person" : "Report an unidentified person"}
        description="Add the information you know. You can review everything before submitting."
      />
      <Content>
        <div className="mx-auto max-w-4xl">
        <form className="grid gap-5" onSubmit={handleFormSubmit}>
          <p className="text-sm text-muted"><span className="font-bold text-accent" aria-hidden="true">*</span> Required field</p>
          <div className="stitch-panel rounded-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-accent">Step {step + 1} of {steps.length}</p>
                <h2 className="mt-2 font-display text-2xl font-semibold text-primary">{steps[step].title}</h2>
              </div>
              <div className="flex gap-1">
                {steps.map((item, index) => <span key={item.title} className={cn("h-2 w-8 rounded-full", index <= step ? "bg-accent" : "bg-high")} />)}
              </div>
            </div>
          </div>
          {step === 0 ? <FormSection title="Person details">
            {missing ? (
              <Field label="Full Name" required register={register("name")} error={errors.name?.message} />
            ) : (
              <Field label="Name if known" register={register("name")} error={errors.name?.message} />
            )}
            <Field label="Approximate age" required register={register("age")} error={errors.age?.message} />
            <SelectField label="Gender" register={register("gender")} options={["Female", "Male", "Other", "Not specified"]} />
            <Field label="Height (feet)" required register={register("heightFeet")} error={errors.heightFeet?.message} />
            <Field label="Weight (kg)" required register={register("weightKg")} error={errors.weightKg?.message} />
          </FormSection> : null}
          {step === 0 ? <FormSection title={missing ? "Last seen" : "Found location"}>
            <SelectField label="Broad region / city" register={register("region")} error={errors.region?.message} options={regions} />
            <Field label={missing ? "Last seen location detail" : "Found location detail"} register={register("locationDetail")} error={errors.locationDetail?.message} />
            <Field label={missing ? "Date Missing" : "Date Found"} type="date" register={register("date")} error={errors.date?.message} />
          </FormSection> : null}
          {step === 1 ? <FormSection title="Description">
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-primary">Physical Description<RequiredMark /></span>
              <textarea className={`${inputClass} min-h-32`} {...register("description")} required aria-required="true" />
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
          {step === 1 ? <FormSection title="Photograph">
            <div className="md:col-span-2">
              <FileUploadField required error={photoError} onFileChange={(file) => { setPhotoFile(file); setPhotoError(""); }} />
            </div>
          </FormSection> : null}
          {step === 2 ? <FormSection title="Your information">
            {reporter ? <div className="md:col-span-2 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted"><p className="font-semibold text-white">Signed-in report owner</p><p className="mt-2">{reporter.name} • {reporter.email}</p><p className="mt-1">Accepted contact requests use the account&apos;s {String(reporter.preferredContactMethod || "EMAIL").toLowerCase()} preference.</p></div> : <>
              <div className="md:col-span-2 rounded-sm border border-blue-400/30 bg-blue-500/10 p-4 text-sm leading-6 text-primary"><p className="font-semibold text-primary">You can submit without an account.</p><p className="mt-2">We will give you a one-time code so you can claim the report after signing in.</p></div>
              <Field label="Reporter name" required register={register("reporterName")} error={errors.reporterName?.message} />
              <Field label="Reporter email" required type="email" register={register("reporterEmail")} error={errors.reporterEmail?.message} />
              <Field label="Reporter phone (optional)" type="tel" register={register("reporterPhone")} error={errors.reporterPhone?.message} />
              <SelectField label="Preferred contact method" required register={register("preferredContactMethod")} error={errors.preferredContactMethod?.message} options={["EMAIL", "PHONE"]} />
            </>}
            <SelectField label="Relationship" register={register("relationship")} error={errors.relationship?.message} options={["Family Member", "Police/Authority", "Friend", "Community Member", "Organization", "Other"]} />
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
          {step === 2 ? <FormSection title="Permissions">
            <label className="flex gap-3 rounded-md border border-[var(--border)] bg-deep p-4 text-sm md:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" {...register("publicVisible")} />
               <span><strong>Show this report publicly.</strong> Contact details and the uploaded photograph will stay private.</span>
            </label>
            <label className="flex gap-3 rounded-md border border-[var(--border)] bg-deep p-4 text-sm md:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" {...register("photoConfirm")} />
                <span>I confirm that the photograph clearly shows the person in this report.<RequiredMark /></span>
            </label>
            <label className="flex gap-3 rounded-md border border-[var(--border)] bg-deep p-4 text-sm md:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" {...register("aiProcessingConsent")} />
              <span><strong>Use this photograph and description to find possible matches.</strong> This includes face-pattern and English-text comparison.</span>
            </label>
            <div className="md:col-span-2"><ErrorText text={errors.photoConfirm?.message} /></div>
            <label className="flex gap-3 rounded-md border border-[var(--border)] bg-deep p-4 text-sm md:col-span-2">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--accent)]" {...register("consent")} />
                <span>I understand that my report will be stored and that contact details are shared only after a request is accepted.<RequiredMark /></span>
            </label>
            <div className="md:col-span-2"><ErrorText text={errors.consent?.message} /></div>
          </FormSection> : null}
          {step === 3 ? <FormSection title="Review your report">
            <div className="md:col-span-2 rounded-sm border border-[var(--border)] bg-deep p-5 text-sm text-primary">
              <p className="font-semibold text-white">Review summary</p>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Name" value={values.name || (missing ? "Missing" : "Unknown")} />
                <Info label="Age / Gender" value={`${values.age || "Not set"} - ${values.gender || "Not specified"}`} />
                <Info label="Region" value={values.region || "Not set"} />
                <Info label={missing ? "Last seen" : "Found"} value={values.locationDetail || "Not set"} />
                <Info label="Reporter" value={values.reporterName || "Not set"} />
                <Info label="Public visibility" value={values.publicVisible ? "Publish immediately" : "Keep limited"} />
              </dl>
              <p className="mt-4 text-muted">Check the details above. You can return to an earlier step if something needs changing.</p>
            </div>
          </FormSection> : null}
          {submitError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary" role="alert"><strong className="text-white">Please fix this:</strong> {submitError} If the service is unavailable, keep your details and retry once it is online.</div> : null}
          {message ? <div className="rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary" role="status"><strong>Report submitted.</strong> Your case ID is {message}. Possible matches will appear when they are ready.</div> : null}
          {message ? <CaseIdDisplay caseId={message} /> : null}
          {message && claimCode ? <div className="rounded-sm border border-amber-400/40 bg-amber-500/10 p-5 text-sm text-primary">
            <p className="font-semibold text-white">Save this one-time report claim code</p>
            <p className="mt-3 break-all font-mono text-xl font-bold tracking-wider text-amber-200">{claimCode}</p>
            <p className="mt-3 leading-6 text-muted">This code is shown only once. Sign in with <span className="text-primary">{values.reporterEmail}</span> to claim and manage the report. Do not share the code.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link className={`${buttonClass} bg-accent text-white`} href={`/login?returnTo=${encodeURIComponent(`/reporter/claim-report?caseId=${message}`)}`}>Sign In and Claim</Link>
              <Link className={`${buttonClass} border border-[var(--border)] text-primary`} href={`/register?returnTo=${encodeURIComponent(`/reporter/claim-report?caseId=${message}`)}`}>Register and Claim</Link>
            </div>
          </div> : null}
          {message ? <div className="grid gap-4">
            <SectionHeader title="Possible matches" description={recommendationNotice || "Matches will appear here when available."} />
            <RecommendationResults items={immediateRecommendations} />
          </div> : null}
          {!message ? <div className="flex flex-col gap-3 sm:flex-row">
            {step > 0 ? <button className={`${buttonClass} border border-[var(--border)] text-primary`} type="button" onClick={previousStep}>Back</button> : null}
            {step < steps.length - 1 ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="button" onClick={nextStep}>Next</button> : null}
            {step === steps.length - 1 ? <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit" disabled={submitting}>{submitting ? <PendingLabel>Submitting</PendingLabel> : "Submit Report"}</button> : null}
          </div> : null}
        </form>
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
  const [trackError, setTrackError] = useState("");
  useEffect(() => {
    const caseId = new URLSearchParams(window.location.search).get("caseId");
    if (caseId) setId(caseId);
  }, []);
  const normalizedId = id.trim().toUpperCase();
  const invalid = submitted && normalizedId && !/^(MP|UI)-\d{4}-\d{4}$/.test(normalizedId);
  const track = async () => {
    setSubmitted(true);
    setReport(null);
    setTrackError("");
    if (!/^(MP|UI)-\d{4}-\d{4}$/.test(normalizedId)) return;
    setLoading(true);
    try {
      const result = await requestJson(`/api/track/${encodeURIComponent(normalizedId)}`, {}, 15000);
      setReport(result.report);
    } catch (error) {
      if (error.status !== 404) setTrackError(error.message);
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
             <button className={`${buttonClass} bg-accent text-white hover:bg-[var(--red-dark)]`} onClick={track} disabled={loading}>{loading ? <PendingLabel>Checking</PendingLabel> : "Track Case"}</button>
          </div>
        </div>
        {invalid ? <EmptyState title="Invalid Case ID" description="Use a sample format such as MP-2026-0047." /> : null}
        {trackError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm" role="alert">{trackError} Check your connection or local service, then retry.</div> : null}
        {submitted && !invalid && !loading && !report && !trackError ? <EmptyState title="No result" description="No public tracking result is available for that ID." /> : null}
        {report ? (
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="stitch-panel rounded-sm p-6">
              <StatusBadge status={report.status} />
              <h2 className="mt-4 font-display text-2xl font-semibold text-white">{report.id}</h2>
              <dl className="mt-5 grid gap-3"><Info label="Case type" value={report.type} /><Info label="Submission date" value={report.date} /><Info label="Last update" value={report.lastUpdate} /></dl>
            </div>
            <Timeline items={report.timeline?.length ? report.timeline : [
              { title: "Report received", date: "Current", description: "The report has been saved." },
              { title: "Review", date: "Next", description: "Check the report status here for updates." }
            ]} />
          </div>
        ) : null}
      </Content>
    </PublicShell>
  );
}

export function ContactPage() {
  return <PublicShell><PageHeader title="Help and emergency contacts" description="HumTrace is not an emergency service." /><Content narrow><div className="stitch-panel rounded-sm p-6"><p className="font-semibold text-primary">Pakistan emergency contacts</p><p className="mt-3 text-sm leading-7 text-muted">Rescue 1122 · Police 15 · Edhi Foundation 115 · Chhipa Welfare 1020</p><p className="mt-4 text-sm leading-7 text-muted">For a HumTrace report, sign in to review matches or contact requests. Contact details remain private until a request is accepted.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Link className={`${buttonClass} bg-accent text-white`} href="/report/missing">Report a missing person</Link><Link className={`${buttonClass} border border-[var(--border)] text-primary`} href="/browse">Browse reports</Link></div></div></Content></PublicShell>;
}

export function AuthPage({ mode }) {
  const login = mode === "login" || mode === "admin";
  const adminLogin = mode === "admin";
  return (
    <PublicShell>
      <Content>
        <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full max-w-md items-center py-10">
          <SimpleForm
            title={adminLogin ? "Admin sign in" : login ? "Sign in" : "Create an account"}
            description={adminLogin ? "Use an existing administrator account." : login ? "Use your reporter email and password." : "Create a reporter account to manage reports, matches and contact requests."}
            submitText={login ? "Sign in failed." : "Registration failed."}
            fields={login ? ["Email Address", "Password"] : ["Full Name", "Email Address", "Password", "Confirm Password", "Privacy Consent"]}
            authMode={mode}
          />
        </div>
      </Content>
    </PublicShell>
  );
}

function SimpleForm({ title, description, submitText, fields, authMode }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [returnTo, setReturnTo] = useState("");
  const [authValues, setAuthValues] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    consent: false
  });
  useEffect(() => {
    setReturnTo(new URLSearchParams(window.location.search).get("returnTo") || "");
  }, []);
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
      const result = await requestJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: authValues.name,
          email: authValues.email,
          phone: authValues.phone,
          password: authValues.password,
          returnTo: new URLSearchParams(window.location.search).get("returnTo") || returnTo
          ,adminOnly: authMode === "admin",
          privacyConsent: authValues.consent
        })
      });
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
          <h1 className="mt-6 font-display text-3xl font-semibold text-primary">{title}</h1>
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
          {!login ? <label>
            <span className="mb-2 block text-sm font-semibold text-primary">Phone (optional)</span>
            <input className={inputClass} type="tel" value={authValues.phone} onChange={(event) => updateAuthValue("phone", event.target.value)} />
          </label> : null}
          {!login ? <label className="flex min-h-12 gap-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm">
            <input className="mt-1 h-5 w-5 shrink-0 accent-[var(--accent)]" type="checkbox" checked={authValues.consent} onChange={(event) => updateAuthValue("consent", event.target.checked)} required />
            <span>I agree to the privacy notice.</span>
          </label> : null}
        </div>
        {error ? <div className="mt-5 rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary">{error}</div> : null}
        {message ? <div className="mt-5 rounded-sm bg-[var(--accent-soft)] p-4 text-sm text-accent">{message}</div> : null}
        {!login ? <div className="mt-5 rounded-sm border border-blue-400/30 bg-blue-500/10 p-4 text-sm text-primary">This creates a reporter account. Administrative access is separate.</div> : null}
        <button className={`${buttonClass} mt-5 w-full bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit" disabled={pending}>{pending ? <PendingLabel>Please Wait</PendingLabel> : login ? "Sign In" : "Create Account"}</button>
        <Link className="mt-4 block min-h-10 py-2 text-center text-sm text-accent" href={authMode === "admin" ? "/login" : `${login ? "/register" : "/login"}${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}>{authMode === "admin" ? "Return to standard sign in" : login ? "Don't have an account? Register" : "Already have an account? Sign In"}</Link>
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
        <StatCard title="Possible matches" value={summary.recommendationCount} />
      </div>
      <div className="stitch-panel rounded-sm p-6">
        <SectionHeader title="What would you like to do?" />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link className={`${buttonClass} bg-accent text-white`} href="/reporter/my-reports">View my reports</Link>
          <Link className={`${buttonClass} border border-[var(--border)] text-primary`} href="/reporter/recommendations">Review possible matches</Link>
        </div>
      </div>
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
  const [pendingAction, setPendingAction] = useState("");
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
    if (pendingAction) return false;
    setPendingAction(`${report.id}:${action}`);
    try {
      const result = await requestJson(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...values }) });
      const labels = { UNDER_REVIEW: "Report Under Review", CLOSED_BY_REPORTER: "Closed by Reporter", ARCHIVED: "Archived" };
      setCaseReports((current) => current.map((item) => item.id === report.id ? { ...item, ...result.report, status: labels[result.report.rawStatus] || result.report.status, visibility: result.report.visibility === "LIMITED" ? "Limited" : result.report.visibility === "HIDDEN" ? "Hidden" : result.report.visibility } : item));
      setEditing(null); return true;
    } catch (error) {
      setActionError(error.message); return false;
    } finally {
      setPendingAction("");
    }
  };
  const updateAIProcessing = async (report, action) => {
    if (action === "withdraw" && !window.confirm("Withdraw AI processing permission? Encrypted embeddings will be deleted and AI-assisted recommendations invalidated.")) return;
    if (action === "enable" && !window.confirm("Enable optional local similarity processing for this report? Suggestions may be wrong, never confirm identity, and require human review.")) return;
    setActionError("");
    if (pendingAction) return;
    setPendingAction(`${report.id}:ai-${action}`);
    try {
      const result = await requestJson("/api/ai/processing-basis", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicId: report.id, action, acknowledged: action === "enable" }) });
      setCaseReports((current) => current.map((item) => item.id === report.id ? { ...item, aiProcessingAllowed: result.aiProcessingAllowed, aiProcessingStatus: result.aiProcessingStatus } : item));
    } catch (error) {
      setActionError(error.message);
    } finally {
      setPendingAction("");
    }
  };
  return (
    <PortalContent title="My reports" description="Review or update the reports you submitted.">
      <FilterBar><SearchInput value={query} onChange={setQuery} placeholder="Search my cases" /><Select value={status} onChange={setStatus} options={statusOptions} label="Status" /><Select value={type} onChange={setType} options={typeOptions} label="Type" /></FilterBar>
      {actionError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm">{actionError}</div> : null}
      {filteredReports.length ? <div className="grid gap-5 lg:grid-cols-2">{filteredReports.map((report) => {
        const busy = pendingAction.startsWith(`${report.id}:`);
        const aiStatus = { WAITING_REVIEW: "Waiting for review", WAITING_VISIBILITY: "Waiting to be published", PENDING: "Checking for matches", AVAILABLE: "Matches ready", LIMITED: "No strong similarities", DISABLED: "Matching is off" }[report.aiProcessingStatus] || "Status unavailable";
        return <div key={report.id} className="stitch-panel rounded-sm p-5"><ReportCard report={report} /><div className="mt-4 flex flex-wrap gap-2">
          <a className={`${buttonClass} border border-[var(--border)] text-primary`} href={`/api/reports/${report.id}/photo`} target="_blank" rel="noreferrer">View Private Photo</a>
          {["SUBMITTED", "UNDER_REVIEW", "PUBLIC"].includes(report.rawStatus) ? <button className={`${buttonClass} border border-[var(--border)]`} onClick={() => setEditing({ ...report })} disabled={busy}>Edit</button> : null}
          {!["CLOSED_BY_REPORTER", "ARCHIVED"].includes(report.rawStatus) ? <button className={`${buttonClass} border border-[var(--border)]`} onClick={() => runAction(report, "close")} disabled={busy}>Close Report</button> : null}
          {report.rawStatus !== "ARCHIVED" ? <button className={`${buttonClass} border border-[var(--border)]`} onClick={() => runAction(report, "archive")} disabled={busy}><Archive size={16} /> Archive</button> : null}
          {["CLOSED_BY_REPORTER", "ARCHIVED"].includes(report.rawStatus) ? <button className={`${buttonClass} bg-accent text-white`} onClick={() => runAction(report, "reopen")} disabled={busy}>Reopen for Review</button> : null}
          {report.aiProcessingAllowed ? <button className={`${buttonClass} border border-[var(--border)]`} onClick={() => updateAIProcessing(report, "withdraw")} disabled={busy}>Turn off matching</button> : <button className={`${buttonClass} border border-[var(--border)]`} onClick={() => updateAIProcessing(report, "enable")} disabled={busy}>Turn on matching</button>}
        </div><p className="mt-3 text-sm text-muted">{report.recommendations} possible matches · {report.visibility} · {aiStatus}</p>{busy ? <p className="mt-3 flex items-center gap-2 text-sm text-accent" role="status"><LoaderCircle className="animate-spin" size={16} />Saving report change…</p> : null}</div>;
      })}</div> : <EmptyState title="No reports found" description="No submitted report matches the current search and filters." />}
      {editing ? <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-report-title"><form className="my-8 grid w-full max-w-3xl gap-4 rounded-sm border border-[var(--border)] bg-background p-6" onSubmit={(event) => { event.preventDefault(); runAction(editing, "edit", editing); }}><div className="flex justify-between"><h2 id="edit-report-title" className="font-display text-2xl font-bold text-white">Edit {editing.id}</h2><button type="button" onClick={() => setEditing(null)} aria-label="Close edit form" disabled={Boolean(pendingAction)}><X /></button></div><div className="grid gap-4 sm:grid-cols-2"><label><span>Name</span><input className={inputClass} value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value, fullName: e.target.value })} /></label><label><span>Age</span><input className={inputClass} value={editing.age || ""} onChange={(e) => setEditing({ ...editing, age: e.target.value, approximateAge: e.target.value })} required /></label><label><span>Height (cm)</span><input className={inputClass} type="number" min="30" max="260" value={editing.heightCm || ""} onChange={(e) => setEditing({ ...editing, heightCm: Number(e.target.value) })} required /></label><label><span>Weight (kg)</span><input className={inputClass} type="number" min="2" max="300" value={editing.weightKg || ""} onChange={(e) => setEditing({ ...editing, weightKg: Number(e.target.value) })} required /></label><label><span>Gender</span><select className={inputClass} value={editing.gender || "Not specified"} onChange={(e) => setEditing({ ...editing, gender: e.target.value })}>{["Female", "Male", "Other", "Not specified"].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>Broad region</span><input className={inputClass} value={editing.region || ""} onChange={(e) => setEditing({ ...editing, region: e.target.value, broadRegion: e.target.value })} /></label></div><label><span>Description</span><textarea className={`${inputClass} min-h-28`} value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} required minLength={10} /></label><div className="rounded-sm bg-deep p-4 text-sm text-muted">Editing a public report returns it to human review and invalidates old recommendations. This action does not confirm identity.</div>{actionError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm" role="alert">{actionError}</div> : null}<button className={`${buttonClass} bg-accent text-white`} type="submit" disabled={Boolean(pendingAction)}>{pendingAction ? <PendingLabel>Saving</PendingLabel> : "Save and Return to Review"}</button></form></div> : null}
    </PortalContent>
  );
}

export function RecommendationsPage({ recommendationsData = [] }) {
  return (
    <PortalContent title="Possible matches" description="Compare the details and decide whether a report may be relevant.">
      <RecommendationResults items={recommendationsData} canManage />
    </PortalContent>
  );
}

export function ConnectionRequestsPage({ requestsData = connectionRequests }) {
  const tabs = ["All Requests", "Incoming", "Outgoing", "Accepted", "Declined", "Cancelled"].map((label) => {
    const filtered = requestsData.filter((item) => label === "All Requests" || label === item.direction || label === item.status);
    return { id: label, label, content: filtered.length ? <div className="grid gap-5">{filtered.map((item) => <ConnectionRequestCard key={item.id} request={item} />)}</div> : <EmptyState title={`No ${label.toLowerCase()}`} description="No contact requests are available in this category." /> };
  });
  return (
    <PortalContent title="Contact requests" description="Accept a request only when you are comfortable sharing your selected contact detail.">
      <ResponsiveTabs tabs={tabs} />
    </PortalContent>
  );
}

export function ClaimReportPage({ initialCaseId = "" }) {
  const [caseId, setCaseId] = useState(initialCaseId);
  const [claimCode, setClaimCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!caseId) return;
    const saved = window.sessionStorage.getItem(`humtrace-report-claim:${caseId.toUpperCase()}`);
    if (saved) setClaimCode(saved);
  }, [caseId]);

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const result = await requestJson("/api/reports/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, claimCode })
      });
      window.sessionStorage.removeItem(`humtrace-report-claim:${result.caseId}`);
      setMessage(result.message || "Report claimed successfully.");
    } catch (claimError) {
      setError(claimError.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <PortalContent title="Claim a Public Submission" description="Attach a report submitted without an account to your signed-in reporter profile.">
      <form className="stitch-panel mx-auto grid w-full max-w-2xl gap-5 rounded-sm p-6" onSubmit={submit}>
        <div className="rounded-sm border border-blue-400/30 bg-blue-500/10 p-4 text-sm leading-6 text-primary">Enter the case ID and one-time claim code shown after submission. For protection against stolen codes, your signed-in account email must match the reporter email entered on the public form.</div>
        <label><span className="mb-2 block text-sm font-semibold text-primary">Case ID</span><input className={inputClass} value={caseId} onChange={(event) => setCaseId(event.target.value.toUpperCase())} placeholder="MP-2026-0001" autoComplete="off" required /></label>
        <label><span className="mb-2 block text-sm font-semibold text-primary">One-time claim code</span><input className={inputClass} value={claimCode} onChange={(event) => setClaimCode(event.target.value.toUpperCase())} placeholder="HTC-XXXX-XXXX-XXXX-XXXX" autoComplete="off" required /></label>
        <p className="text-sm leading-6 text-muted">After claiming the report, you can manage it, review possible matches and send contact requests.</p>
        {error ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm" role="alert">{error}</div> : null}
        {message ? <div className="rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm" role="status">{message} <Link className="ml-1 text-accent underline" href="/reporter/my-reports">Open My Cases</Link></div> : null}
        <button className={`${buttonClass} bg-accent text-white`} type="submit" disabled={pending || Boolean(message)}>{pending ? <PendingLabel>Verifying Claim</PendingLabel> : message ? "Report Claimed" : "Claim Report"}</button>
      </form>
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
        <p className="mt-5 text-sm leading-6 text-muted">Profile editing is not part of this phase. Contact information remains hidden unless a contact request is accepted.</p>
      </div>
    </PortalContent>
  );
}

export function AdminDashboardPage({ dashboardData = { stats: [], reportsByRegion: [], reportsByMonth: [], acceptanceRate: { value: 0, label: "No reviewed contact requests yet" }, recentActivity: [] } }) {
  return (
    <PortalContent title="Admin dashboard" description="Review reports, users and recent activity.">
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
    aiAssistanceEnabled: Boolean(initialSettings.aiAssistanceEnabled),
    faceSimilarityEnabled: Boolean(initialSettings.faceSimilarityEnabled),
    textSimilarityEnabled: Boolean(initialSettings.textSimilarityEnabled),
    recommendationDisplayThreshold: initialSettings.recommendationDisplayThreshold ?? 0,
    duplicateWarningThreshold: initialSettings.duplicateWarningThreshold ?? 85
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const update = (key, value) => setSettings((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    setNotice("");
    setError("");
    if (pending) return;
    setPending(true);
    try {
      const result = await requestJson("/api/admin/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) });
      setSettings((current) => ({ ...current, ...result.settings }));
      setNotice("Settings saved and audited. Running work was safely re-queued or paused when a kill switch changed.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  };
  return (
    <form className="stitch-panel rounded-sm p-6" onSubmit={save}>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["publicSearchEnabled", "Public search enabled"],
          ["reportSubmissionEnabled", "Report submission enabled"],
          ["aiAssistanceEnabled", "AI-assisted suggestions enabled"],
          ["faceSimilarityEnabled", "Face similarity enabled"],
          ["textSimilarityEnabled", "English text similarity enabled"],
          ["maintenanceMode", "Maintenance mode"]
        ].map(([key, label]) => (
          <label key={key} className="flex min-h-12 items-center gap-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm">
            <input className="h-5 w-5 accent-[var(--accent)]" type="checkbox" checked={Boolean(settings[key])} onChange={(event) => update(key, event.target.checked)} />
            <span>{label}</span>
          </label>
        ))}
        <Field label="Recommendation display threshold" type="number" register={{ value: settings.recommendationDisplayThreshold, min: 0, max: 100, onChange: (event) => update("recommendationDisplayThreshold", Number(event.target.value)) }} />
        <Field label="Reserved duplicate-review threshold" type="number" register={{ value: settings.duplicateWarningThreshold, min: 0, max: 100, onChange: (event) => update("duplicateWarningThreshold", Number(event.target.value)) }} />
      </div>
      <p className="mt-4 text-sm text-muted">Recommendation thresholds affect which possible similarities are displayed. They do not confirm identity. These controls can pause approved capabilities but cannot approve a model or determine identity. AI suggestions remain unavailable without development mode or an approved final evaluation. HumTrace never generates images, and human review is required.</p>
      <p className="mt-2 text-xs text-muted">The duplicate-review threshold is reserved and does not activate an unfinished workflow.</p>
      {notice ? <div className="mt-4 rounded-sm border border-[var(--success)]/40 bg-[var(--success)]/10 p-4 text-sm text-primary" role="status">{notice}</div> : null}
      {error ? <div className="mt-4 rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary" role="alert">{error}</div> : null}
      <button className={`${buttonClass} mt-5 bg-accent text-white hover:bg-[var(--red-dark)]`} type="submit" disabled={pending}>{pending ? <PendingLabel>Saving Settings</PendingLabel> : "Save Settings"}</button>
    </form>
  );
}

export function AdminManagePage({ manageData = { reports, users: [], auditLogs: [], recommendations: [], settings: {} } }) {
  const [adminReports, setAdminReports] = useState(manageData.reports);
  const [adminUsers, setAdminUsers] = useState(manageData.users || []);
  const [adminError, setAdminError] = useState("");
  const [pendingAdminAction, setPendingAdminAction] = useState("");
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
    if (pendingAdminAction) return;
    const humanReviewAcknowledged = status === "PUBLIC" ? window.confirm("Confirm that you reviewed the report details and private photo, found them appropriate for limited public display, and understand this does not confirm identity.") : true;
    if (!humanReviewAcknowledged) return;
    if (["HIDDEN", "ARCHIVED"].includes(status) && !window.confirm(`${status === "HIDDEN" ? "Hide" : "Archive"} this report and cancel its pending contact requests?`)) return;
    setPendingAdminAction(`report:${report.id}`);
    try {
      const result = await requestJson(`/api/reports/${report.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, humanReviewAcknowledged }) });
      const statusLabel = result.status === "PUBLIC" ? "Content Review Completed" : result.status === "HIDDEN" ? "Hidden" : result.status === "ARCHIVED" ? "Archived" : "Report Under Review";
      const visibilityLabel = result.visibility === "PUBLIC" ? "Public" : result.visibility === "HIDDEN" ? "Hidden" : "Limited";
      setAdminReports((current) => current.map((item) => item.id === report.id ? { ...item, status: statusLabel, visibility: visibilityLabel } : item));
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setPendingAdminAction("");
    }
  };
  const updateUserStatus = async (user, action) => {
    setAdminError("");
    if (pendingAdminAction) return;
    if (action === "deactivate" && !window.confirm("Deactivate this account and revoke its active sessions?")) return;
    setPendingAdminAction(`user:${user.id}`);
    try {
      const result = await requestJson(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      setAdminUsers((current) => current.map((item) => item.id === user.id ? result.user : item));
    } catch (error) {
      setAdminError(error.message);
    } finally {
      setPendingAdminAction("");
    }
  };
  const reportColumns = [
    { key: "id", label: "Report ID" },
    { key: "type", label: "Type" },
    { key: "region", label: "Broad Region" },
    { key: "date", label: "Submitted Date" },
    { key: "visibility", label: "Visibility" },
    { key: "publicVisibilityRequested", label: "Reporter Public Request", render: (row) => row.publicVisibilityRequested ? "Yes" : "No" },
    { key: "status", label: "Moderation Status" },
    { key: "actions", label: "Actions", render: (row) => <div className="flex flex-wrap gap-2"><a className="min-h-11 rounded-sm px-3 py-3 text-accent" href={`/api/reports/${row.id}/photo`} target="_blank" rel="noreferrer">Review Private Photo</a><button className="min-h-11 rounded-sm px-3 text-accent" onClick={() => updateReportStatus(row, "PUBLIC")} disabled={Boolean(pendingAdminAction) || !row.publicVisibilityRequested} title={!row.publicVisibilityRequested ? "Reporter did not request public visibility" : ""}>Make Public</button><button className="min-h-11 rounded-sm px-3 text-accent" onClick={() => updateReportStatus(row, "UNDER_REVIEW")} disabled={Boolean(pendingAdminAction)}>Restore to Review</button><button className="min-h-11 rounded-sm px-3 text-accent" onClick={() => updateReportStatus(row, "HIDDEN")} disabled={Boolean(pendingAdminAction)}>Hide</button><button className="min-h-11 rounded-sm px-3 text-accent" onClick={() => updateReportStatus(row, "ARCHIVED")} disabled={Boolean(pendingAdminAction)}>Archive</button></div> }
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
          <button className="min-h-11 rounded-sm px-3 text-accent" onClick={() => updateUserStatus(row, "activate")} disabled={row.status === "Active" || Boolean(pendingAdminAction)}>Activate</button>
          <button className="min-h-11 rounded-sm px-3 text-accent" onClick={() => updateUserStatus(row, "deactivate")} disabled={row.status === "Deactivated" || Boolean(pendingAdminAction)}>Deactivate</button>
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
      {adminError ? <div className="rounded-sm border border-[var(--danger)]/40 bg-[var(--danger)]/10 p-4 text-sm text-primary" role="alert">{adminError}</div> : null}
      {pendingAdminAction ? <div className="flex items-center gap-2 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted" role="status"><LoaderCircle className="animate-spin text-accent" size={16} />Saving administrative change…</div> : null}
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
  const [pending, setPending] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(""); setMessage("");
    if (pending) return;
    setPending(true);
    try {
      const result = await requestJson("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      setStaff((current) => [{ ...result.staff, createdAt: new Date().toISOString() }, ...current]);
      setForm({ name: "", email: "", password: "" }); setMessage("Admin staff account created and audited.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  };
  return <PortalContent title="Admin Staff" description="Create and review authenticated Admin accounts. Public registration cannot grant this role.">
    <form className="stitch-panel grid gap-4 rounded-sm p-6 md:grid-cols-3" onSubmit={submit}>
      <label><span className="mb-2 block text-sm font-semibold">Staff name</span><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
      <label><span className="mb-2 block text-sm font-semibold">Staff email</span><input className={inputClass} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
      <label><span className="mb-2 block text-sm font-semibold">Temporary password</span><input className={inputClass} type="password" minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
      <div className="md:col-span-3 rounded-sm border border-[var(--border)] bg-deep p-4 text-sm text-muted">Share the temporary password securely. Staff should sign in at <span className="text-accent">/admin/login</span>.</div>
      {error ? <div className="md:col-span-3 text-sm text-[var(--danger)]">{error}</div> : null}{message ? <div className="md:col-span-3 text-sm text-[var(--success)]">{message}</div> : null}
      <button className={`${buttonClass} bg-accent text-white md:col-span-3`} type="submit" disabled={pending}>{pending ? <PendingLabel>Creating Staff</PendingLabel> : "Create Admin Staff"}</button>
    </form>
    <div className="grid gap-3">{staff.map((item) => <div className="stitch-panel flex flex-col justify-between gap-2 rounded-sm p-5 sm:flex-row" key={item.id}><div><p className="font-semibold text-white">{item.name}</p><p className="text-sm text-muted">{item.email}</p></div><StatusBadge status={item.status === "ACTIVE" ? "Active" : "Deactivated"} /></div>)}</div>
  </PortalContent>;
}

export function Content({ children, narrow = false }) {
  return <div className={cn("mx-auto grid max-w-[1500px] gap-7 px-5 pb-16 sm:px-8", narrow && "max-w-3xl")}>{children}</div>;
}

function PortalContent({ title, description, children }) {
  return (
    <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden bg-background lg:ml-0">
      <div className="mx-auto grid min-w-0 max-w-[1320px] gap-7 px-5 pb-14 pt-20 sm:px-8 lg:pt-7">
        <PageHeader eyebrow="HumTrace" title={title} description={description} />
        {children}
      </div>
    </main>
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

function Field({ label, register = {}, error, type = "text", required = false }) {
  const id = useId();
  return (
    <label htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-primary">{label}{required ? <RequiredMark /> : null}</span>
      <input id={id} className={inputClass} type={type} required={required} aria-required={required} {...register} />
      <ErrorText text={error} />
    </label>
  );
}

function SelectField({ label, register = {}, error, options, required = false }) {
  const id = useId();
  return (
    <label htmlFor={id}>
      <span className="mb-2 block text-sm font-semibold text-primary">{label}{required ? <RequiredMark /> : null}</span>
      <select id={id} className={inputClass} required={required} aria-required={required} {...register}>
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
