"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function ErrorBoundary({ reset }) {
  return (
    <main className="grid min-h-[60vh] place-items-center bg-background px-5 text-primary">
      <div className="stitch-panel max-w-xl rounded-sm p-7 text-center" role="alert">
        <AlertCircle className="mx-auto text-accent" size={34} aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-bold uppercase text-white">This page could not load</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Check the local web service and database, then retry. No internal error details or private report data are shown here.</p>
        <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
          <button className="min-h-11 rounded-sm bg-accent px-5 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white" onClick={reset}>Retry</button>
          <Link className="inline-flex min-h-11 items-center justify-center rounded-sm border border-[var(--border)] px-5 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary" href="/">Return Home</Link>
        </div>
      </div>
    </main>
  );
}
