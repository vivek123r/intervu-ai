import { CodingStatsView } from "@/features/coding/components/coding-stats";

export const metadata = {
  title: "Coding Analytics | Intervu AI",
  description: "Detailed DSA performance and progress analytics.",
};

export default function CodingStatsPage() {
  return (
    <div className="py-6 px-4 md:px-8">
      <CodingStatsView />
    </div>
  );
}
