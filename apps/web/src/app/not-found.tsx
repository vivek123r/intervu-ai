import { ArrowLeft, RadioTower } from "lucide-react";

import { ActionButton } from "@/components/ui/buttons";

export default function NotFound() {
  return (
    <main className="error-page">
      <div>
        <span><RadioTower size={24} /></span>
        <p className="fine-label">404 · Signal not found</p>
        <h1>That workspace doesn’t exist.</h1>
        <p>The interview may have moved or the link is incomplete. Your account data has not changed.</p>
        <ActionButton href="/dashboard"><ArrowLeft size={16} /> Return to dashboard</ActionButton>
      </div>
    </main>
  );
}
