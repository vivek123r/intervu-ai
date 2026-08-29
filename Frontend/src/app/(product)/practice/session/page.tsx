"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { InterviewRoom } from "@/components/practice/interview-room";

function PracticeSessionContent() {
  const searchParams = useSearchParams();
  const interviewId = searchParams.get("interview") ?? undefined;
  return <InterviewRoom interviewId={interviewId} />;
}

export default function PracticeSessionPage() {
  return (
    <Suspense fallback={null}>
      <PracticeSessionContent />
    </Suspense>
  );
}
