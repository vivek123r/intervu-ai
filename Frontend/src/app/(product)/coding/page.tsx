import { ProblemList } from "@/features/coding/components/problem-list";

export const metadata = {
  title: "Coding Practice | Intervu AI",
  description: "LeetCode-style coding practice arena with sandboxed code execution and curated algorithms.",
};

export default function CodingPage() {
  return (
    <div className="py-6 px-4 md:px-8">
      <ProblemList />
    </div>
  );
}
