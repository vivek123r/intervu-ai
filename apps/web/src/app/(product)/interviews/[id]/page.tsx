"use client";

import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { InterviewDetail } from "@/components/product/interview-detail";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { useProduct } from "@/lib/product-store";

import styles from "../../product.module.css";

export default function InterviewDetailPage() {
  const params = useParams<{ id: string }>();
  const { state, selectedInterview } = useProduct();
  const interview = state.interviews.find((item) => item.id === params.id) ?? selectedInterview;
  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <Link href="/interviews" className={styles.backRow}><ArrowLeft size={15} /> Back to interviews</Link>
      <div className={styles.detailPageGrid}>
        <Surface gold className={styles.selectedInterviewPanel}><InterviewDetail interview={interview} full /></Surface>
        <Surface className={styles.detailNextAction}>
          <span className="fine-label">Next best action</span>
          <h1>Defend one complete system-design decision.</h1>
          <p>Your architecture openings are improving, but the trade-off arrives too late. Practice constraints → choice → failure mode.</p>
          <div><strong>12 min</strong><span>focused drill</span></div>
          <a className="gold-button" href={`/interviews/${interview.id}/prepare`}>Open today’s focus</a>
        </Surface>
      </div>
    </motion.div>
  );
}
