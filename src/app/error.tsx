"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { ActionButton } from "@/components/ui/buttons";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Intervu route error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <main className="error-page">
      <div>
        <span><TriangleAlert size={24} /></span>
        <h1>This signal was interrupted.</h1>
        <p>Your work is preserved. Retry the view, or return to the dashboard while the connection recovers.</p>
        <div><ActionButton onClick={reset}><RefreshCw size={16} /> Try again</ActionButton><ActionButton href="/dashboard" variant="ghost">Return to dashboard</ActionButton></div>
      </div>
    </main>
  );
}
