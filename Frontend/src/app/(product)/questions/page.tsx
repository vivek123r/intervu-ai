"use client";

import { Bookmark, BookmarkCheck, Search, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";

import { ActionButton } from "@/components/ui/buttons";
import { pageTransition } from "@/components/ui/motion";
import { Surface } from "@/components/ui/surface";
import { Tabs } from "@/components/ui/tabs";
import { interviewQuestions } from "@/mocks/fixtures";

import styles from "../product.module.css";

type Filter = "all" | "saved" | "weak";
const filters = [{ value: "all", label: "All questions" }, { value: "saved", label: "Saved" }, { value: "weak", label: "Weak topics" }] as const;

export default function QuestionsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<Set<string>>(() => new Set(["q-cache"]));
  const questions = useMemo(() => interviewQuestions.filter((question) => {
    const matchesQuery = `${question.text} ${question.topic}`.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;
    if (filter === "saved") return saved.has(question.id);
    if (filter === "weak") return ["Caching", "Databases", "Distributed systems"].includes(question.topic);
    return true;
  }), [filter, query, saved]);

  const toggleSaved = (id: string) => setSaved((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <motion.div {...pageTransition} className={styles.productPage}>
      <header className={styles.pageHeading}><div><span className={styles.systemStatus}><i /> Personalized question bank</span><h1>Questions worth practicing</h1><p>Generated from your resume, target role, active interviews, and previous weak answers.</p></div><ActionButton href="/practice/setup"><Sparkles size={16} /> Start question drill</ActionButton></header>
      <div className={styles.questionToolbar}>
        <label><Search size={17} /><span className="sr-only">Search questions</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by topic or question…" /></label>
        <Tabs items={filters} value={filter} onChange={setFilter} ariaLabel="Question filter" />
      </div>
      <section className={styles.questionBank}>
        <div className={styles.questionBankSummary}><span>{questions.length} questions</span><span>Sorted by interview relevance</span></div>
        {questions.map((question, index) => (
          <Surface key={question.id} interactive className={styles.bankQuestion}>
            <span className="mono">{String(index + 1).padStart(2, "0")}</span>
            <div><div><span>{question.category}</span><span>{question.topic}</span><span>{question.difficulty}</span></div><h2>{question.text}</h2><p>Selected because this topic is highly relevant to your Northstar Labs round.</p></div>
            <div><button onClick={() => toggleSaved(question.id)} aria-label={saved.has(question.id) ? "Remove saved question" : "Save question"}>{saved.has(question.id) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}</button><ActionButton href={`/practice/setup?focus=${encodeURIComponent(question.topic)}`} variant="ghost">Practice</ActionButton></div>
          </Surface>
        ))}
        {!questions.length && <Surface className="empty-state"><div><Search size={24} /><h2>No matching questions</h2><p className="secondary">Try another topic or clear the current filter.</p><ActionButton variant="ghost" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</ActionButton></div></Surface>}
      </section>
    </motion.div>
  );
}
