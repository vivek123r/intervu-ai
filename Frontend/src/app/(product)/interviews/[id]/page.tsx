"use client";

import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { InterviewDetail } from "@/features/interviews/components/interview-detail";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { useGetInterviewQuery } from "@/services/api/interviews.api";
import { useGetPreparationQuery } from "@/services/api/preparation.api";

import styles from "../../product.module.css";

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: interview, isLoading, isError } = useGetInterviewQuery(params.id);
  const { data: plan } = useGetPreparationQuery(params.id);
  const nextTask = plan?.tasks.find((task) => task.status !== "completed") ?? plan?.tasks[0];

  if (isLoading) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <div className={styles.chartSkeleton}><span className="skeleton" /></div>
      </motion.div>
    );
  }

  if (isError || !interview) {
    return (
      <motion.div {...pageTransition} className={styles.productPage}>
        <Link href="/interviews" className={styles.backRow}><ArrowLeft size={15} /> Back to interviews</Link>
        <div className={styles.emptyPipelineCard}>
          <span>Couldn&apos;t find that interview. It may have been removed.</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <Link href="/interviews" className={styles.backRow}><ArrowLeft size={15} /> Back to interviews</Link>
      <div className={styles.detailPageGrid}>
        <Surface gold className={styles.selectedInterviewPanel}><InterviewDetail interview={interview} full /></Surface>
        {nextTask && (
          <Surface className={styles.detailNextAction}>
            <span className="fine-label">Next best action</span>
            <h1>{nextTask.title}</h1>
            <p>{nextTask.description}</p>
            <div><strong>{nextTask.estimatedMinutes} min</strong><span>focused drill</span></div>
            <a className="gold-button" href={`/interviews/${interview.id}/prepare`}>Open today’s focus</a>
          </Surface>
        )}
      </div>
    </motion.div>
  );
}
