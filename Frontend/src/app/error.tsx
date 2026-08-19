"use client";

import { RefreshCw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";

import { ActionButton } from "@/components/ui/buttons";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Intervu route error:", {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="error-page">
      <div>
        <span>
          <TriangleAlert size={24} />
        </span>
        <h1>This signal was interrupted.</h1>
        <p>Your work is preserved. Retry the view, or return to the dashboard while the connection recovers.</p>
        {error?.message && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "rgba(240, 185, 76, 0.8)",
              background: "rgba(240, 185, 76, 0.06)",
              border: "1px solid rgba(240, 185, 76, 0.2)",
              borderRadius: "6px",
              padding: "0.4rem 0.8rem",
              maxWidth: "480px",
              margin: "0 auto 1.2rem auto",
              wordBreak: "break-word",
            }}
          >
            <strong>Diagnostics:</strong> {error.message}
          </p>
        )}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <ActionButton onClick={reset}>
            <RefreshCw size={16} /> Try again
          </ActionButton>
          <ActionButton href="/dashboard" variant="ghost">
            Return to dashboard
          </ActionButton>
        </div>
      </div>
    </main>
  );
}
