"use client";

import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";

export default function Loading() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 300);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <main className="humtrace-loading grid min-h-[50vh] place-items-center bg-background px-5 text-primary" aria-busy="true">
      <div className="stitch-panel w-full max-w-lg rounded-sm p-7" role="status" aria-live="polite">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-accent/30 bg-[var(--accent-soft)]">
            <LoaderCircle className="animate-spin text-accent motion-reduce:animate-none" size={25} aria-hidden="true" />
          </span>
          <div>
            <p className="font-semibold text-white">Loading HumTrace</p>
            <p className="mt-1 text-sm text-muted">Preparing the requested page securely.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3" aria-hidden="true">
          <span className="humtrace-loading-bar h-3 w-full rounded-full bg-high" />
          <span className="humtrace-loading-bar h-3 w-4/5 rounded-full bg-high [animation-delay:120ms]" />
          <span className="humtrace-loading-bar h-3 w-3/5 rounded-full bg-high [animation-delay:240ms]" />
        </div>
      </div>
      <style jsx>{`
        .humtrace-loading { animation: loading-enter 220ms ease-out both; }
        .humtrace-loading-bar { animation: loading-pulse 1.25s ease-in-out infinite; }
        @keyframes loading-enter { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loading-pulse { 0%, 100% { opacity: .32; } 50% { opacity: .88; } }
        @media (prefers-reduced-motion: reduce) { .humtrace-loading, .humtrace-loading-bar { animation: none; } }
      `}</style>
    </main>
  );
}
