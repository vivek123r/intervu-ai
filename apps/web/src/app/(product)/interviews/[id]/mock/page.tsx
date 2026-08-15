"use client";

import { useParams } from "next/navigation";

import { InterviewRoom } from "@/components/practice/interview-room";

export default function InterviewMockPage() {
  const params = useParams<{ id: string }>();
  return <InterviewRoom interviewId={params.id} />;
}
