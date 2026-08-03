"use client";

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body className="bg-background text-primary">
        <main className="grid min-h-screen place-items-center px-5">
          <section className="w-full max-w-xl rounded-sm border border-[var(--border)] bg-deep p-7 text-center" role="alert">
            <p className="font-display text-2xl font-bold uppercase text-white">HumTrace could not continue</p>
            <p className="mt-3 text-sm leading-6 text-muted">Your action was not confirmed. Retry safely; if the problem continues, return to the home page and check the local services.</p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button className="min-h-11 rounded-sm bg-accent px-5 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white" onClick={reset}>Retry</button>
              <a className="inline-flex min-h-11 items-center justify-center rounded-sm border border-[var(--border)] px-5 py-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-primary" href="/">Return Home</a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
