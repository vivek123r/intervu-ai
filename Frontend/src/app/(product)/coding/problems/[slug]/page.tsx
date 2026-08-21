import { use } from "react";
import { ProblemWorkspace } from "@/features/coding/components/problem-workspace";

interface ProblemPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default function ProblemPage({ params }: ProblemPageProps) {
  const { slug } = use(params);
  return <ProblemWorkspace slug={slug} />;
}
