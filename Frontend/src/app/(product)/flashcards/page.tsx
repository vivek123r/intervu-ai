"use client";

import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { ProgressBar } from "@/components/ui/surface";

import styles from "../product.module.css";

const cards = [
  { topic: "Databases", front: "What is the practical difference between repeatable read and serializable isolation?", back: "Repeatable read protects previously read rows from changing during the transaction; serializable additionally prevents outcomes that could not occur in any serial execution. PostgreSQL implements serializable with SSI, which can abort transactions and requires retry handling." },
  { topic: "Caching", front: "How do you prevent a cache stampede?", back: "Combine request coalescing or distributed locking with jittered TTLs, stale-while-revalidate, and bounded fallback behavior. Choose the mechanism based on consistency need and expected fan-out." },
  { topic: "System design", front: "What makes an operation idempotent?", back: "Repeating the same logical request produces no additional side effect. Use a stable idempotency key, persist the first result atomically with the mutation, and define expiry and conflict behavior." },
  { topic: "Behavioral", front: "What completes the Result in a STAR answer?", back: "A measurable outcome, user or business impact, what changed afterward, and—when useful—what you learned. Avoid ending at the action itself." },
];

export default function FlashcardsPage() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const card = cards[index] ?? cards[0]!;

  const move = (direction: number, remembered?: boolean) => {
    if (remembered) setKnown((value) => value + 1);
    setFlipped(false);
    window.setTimeout(() => setIndex((current) => (current + direction + cards.length) % cards.length), 120);
  };

  return (
    <motion.div {...pageTransition} className={styles.flashcardPage}>
      <header className={styles.flashcardHeader}><div><span className="fine-label">Active recall</span><h1>Weak-topic flashcards</h1><p>Short retrieval practice for the concepts most likely to surface in your next round.</p></div><div><strong className="mono">{known}</strong><span>remembered</span></div></header>
      <div className={styles.flashProgress}><span className="mono">{index + 1} / {cards.length}</span><ProgressBar value={((index + 1) / cards.length) * 100} /><span>{card.topic}</span></div>
      <div className={styles.flashStage}>
        <motion.button className={styles.flashCard} onClick={() => setFlipped((value) => !value)} animate={{ rotateY: flipped ? 180 : 0 }} transition={{ type: "spring", stiffness: 240, damping: 28 }} aria-label={flipped ? "Show question" : "Show answer"}>
          <div className={styles.flashFront}><span className="fine-label">Question</span><h2>{card.front}</h2><small>Tap to reveal the answer</small></div>
          <div className={styles.flashBack}><span className="fine-label">Answer</span><p>{card.back}</p><small>Tap to see the question</small></div>
        </motion.button>
      </div>
      <div className={styles.flashControls}>
        <button onClick={() => move(-1)}><ArrowLeft size={18} /><span>Previous</span></button>
        <button className={styles.forgotButton} onClick={() => move(1, false)}><X size={18} /><span>Review again</span></button>
        <button className={styles.knownButton} onClick={() => move(1, true)}><Check size={18} /><span>Remembered</span></button>
        <button onClick={() => move(1)}><ArrowRight size={18} /><span>Next</span></button>
      </div>
      <div className={styles.flashFooter}><ActionButton href="/practice/setup?focus=Weak%20topics" variant="ghost"><RotateCcw size={15} /> Turn these into interview questions</ActionButton></div>
    </motion.div>
  );
}
