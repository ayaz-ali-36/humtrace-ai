import Link from "next/link";
import { EmptyState, PublicShell } from "@/components/ui/kit";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-3xl px-4 py-20">
        <EmptyState title="Unknown route" description="This local demo includes only the approved public, reporter, and admin pages." />
        <Link className="mt-5 inline-flex min-h-11 items-center rounded-md bg-accent px-4 font-semibold text-deep" href="/">Return Home</Link>
      </div>
    </PublicShell>
  );
}
