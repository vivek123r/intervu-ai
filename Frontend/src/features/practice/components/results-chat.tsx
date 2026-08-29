"use client";

import { Mic, MicOff, Send, Volume2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { IconButton } from "@/components/ui/buttons";
import { Surface } from "@/components/ui/surface";
import { SpeechRecognitionService } from "@/lib/voice/speech-recognition";
import { SpeechSynthesisService } from "@/lib/voice/speech-synthesis";
import {
  useGetReportChatQuery,
  usePostReportChatMutation,
} from "@/services/api/practice.api";
import type { ConversationTurn } from "@/types/domain";

import styles from "@/app/(product)/practice/practice.module.css";

export interface ResultsChatSeed {
  questionId?: string;
  message: string;
}

// Backend/app/schemas/practice.py's ReportChatRequest.message caps at 2000 chars —
// mirrored here so an over-length message fails visibly in the composer instead of
// as a 422 from the server.
const MAX_MESSAGE_LENGTH = 2000;

interface ResultsChatProps {
  reportId: string;
  /** Set by a per-question "Why this score?" action to seed and immediately send
   * one message; cleared via onSeedConsumed once handled. */
  seed?: ResultsChatSeed | null;
  onSeedConsumed?: () => void;
}

/** Voice-first Q&A about a completed interview report — "why this score", "what
 * would a better answer look like". Grounded in the report on the backend; this
 * component only handles the conversation UI, mic capture, and spoken replies. */
export function ResultsChat({ reportId, seed, onSeedConsumed }: ResultsChatProps) {
  const { data: thread, isLoading: isThreadLoading } = useGetReportChatQuery(reportId);
  const [postChat, { isLoading: isSending }] = usePostReportChatMutation();

  // The query cache is the source of truth for confirmed turns (postReportChat
  // patches it directly on success — see practice.api.ts); this is only the
  // candidate's own message while its reply is still in flight.
  const [pendingTurn, setPendingTurn] = useState<ConversationTurn | null>(null);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [sendError, setSendError] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionService | null>(null);
  const synthesisRef = useRef<SpeechSynthesisService | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastSeedRef = useRef<ResultsChatSeed | null | undefined>(null);

  const turns = useMemo(
    () => (pendingTurn ? [...(thread?.turns ?? []), pendingTurn] : (thread?.turns ?? [])),
    [thread, pendingTurn],
  );

  useEffect(() => {
    recognitionRef.current = new SpeechRecognitionService({
      onTranscript: (text) => setDraft(text),
      onStateChange: (state) => setListening(state === "listening"),
    });
    synthesisRef.current = new SpeechSynthesisService();
    return () => {
      recognitionRef.current?.abort();
      synthesisRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const speak = useCallback((text: string) => {
    synthesisRef.current?.speak(text, {
      onBlocked: () => setAutoplayBlocked(true),
      onStart: () => setAutoplayBlocked(false),
    });
  }, []);

  const send = useCallback(
    async (message: string, questionId?: string) => {
      const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!trimmed) return;
      setDraft("");
      setSendError(false);
      recognitionRef.current?.resetTranscript();
      setPendingTurn({
        speaker: "candidate",
        text: trimmed,
        questionId,
        createdAt: new Date().toISOString(),
      });

      try {
        const result = await postChat({ reportId, message: trimmed, questionId }).unwrap();
        setPendingTurn(null);
        speak(result.reply.text);
      } catch {
        setPendingTurn(null);
        setSendError(true);
      }
    },
    [postChat, reportId, speak],
  );

  // A per-question quick action ("Why this score?") seeds and immediately sends —
  // guarded so the same seed object never fires twice (e.g. a parent re-render).
  useEffect(() => {
    if (seed && seed !== lastSeedRef.current) {
      lastSeedRef.current = seed;
      queueMicrotask(() => void send(seed.message, seed.questionId));
      onSeedConsumed?.();
    }
  }, [seed, send, onSeedConsumed]);

  const toggleListening = () => {
    if (listening) {
      const finalText = recognitionRef.current?.stop() ?? "";
      if (finalText.trim()) void send(finalText);
    } else {
      setDraft("");
      recognitionRef.current?.start();
    }
  };

  return (
    <Surface className={styles.questionPanel}>
      <div className={styles.panelHeading}>
        <span className="fine-label">Ask about your interview</span>
      </div>

      <div
        ref={listRef}
        style={{
          maxHeight: 320,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.6rem",
          padding: "0.75rem 0",
        }}
      >
        {isThreadLoading && (
          <div
            data-testid="chat-thread-loading"
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <span className="skeleton" style={{ height: 32, width: "70%", alignSelf: "flex-start" }} />
            <span className="skeleton" style={{ height: 32, width: "55%", alignSelf: "flex-end" }} />
          </div>
        )}
        {!isThreadLoading && turns.length === 0 && (
          <p style={{ opacity: 0.65, fontSize: "0.85rem", margin: 0 }}>
            Ask why you got a score, or what a better answer would look like — by
            voice or text.
          </p>
        )}
        <AnimatePresence initial={false}>
          {turns.map((turn, index) => (
            <motion.div
              key={`${turn.createdAt}-${index}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                alignSelf: turn.speaker === "candidate" ? "flex-end" : "flex-start",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                maxWidth: "85%",
              }}
            >
              <div
                className={turn.speaker === "candidate" ? "gold-surface" : "surface"}
                style={{
                  borderRadius: 12,
                  padding: "0.55rem 0.8rem",
                  fontSize: "0.85rem",
                  lineHeight: 1.5,
                }}
              >
                {turn.text}
              </div>
              {turn.speaker === "assistant" && (
                <IconButton
                  ariaLabel="Play this reply aloud"
                  onClick={() => speak(turn.text)}
                >
                  <Volume2 size={13} />
                </IconButton>
              )}
            </motion.div>
          ))}
          {isSending && (
            <motion.div
              key="assistant-typing"
              data-testid="assistant-typing-indicator"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ alignSelf: "flex-start", maxWidth: "85%" }}
            >
              <div
                className="surface"
                style={{
                  borderRadius: 12,
                  padding: "0.55rem 0.8rem",
                  display: "flex",
                  gap: "0.25rem",
                }}
              >
                {[0, 1, 2].map((dot) => (
                  <motion.span
                    key={dot}
                    aria-hidden="true"
                    animate={{ opacity: [0.25, 1, 0.25] }}
                    transition={{ duration: 1, repeat: Infinity, delay: dot * 0.15 }}
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: "currentColor",
                      display: "inline-block",
                    }}
                  />
                ))}
                <span className="sr-only">Waiting for a reply</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {autoplayBlocked && (
        <p style={{ fontSize: "0.75rem", opacity: 0.7, margin: "0 0 0.5rem" }}>
          Tap the speaker icon on a reply to hear it.
        </p>
      )}
      {sendError && (
        <p style={{ fontSize: "0.75rem", color: "#ff6b6b", margin: "0 0 0.5rem" }}>
          That message didn&apos;t go through — try again.
        </p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
        style={{ display: "flex", gap: "0.5rem" }}
      >
        <IconButton
          ariaLabel={listening ? "Stop listening" : "Ask by voice"}
          aria-pressed={listening}
          onClick={toggleListening}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </IconButton>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <input
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask a question about your interview…"
            aria-describedby="results-chat-counter"
          />
          {draft.length > MAX_MESSAGE_LENGTH * 0.8 && (
            <span
              id="results-chat-counter"
              data-testid="results-chat-counter"
              style={{
                fontSize: "0.7rem",
                opacity: 0.7,
                alignSelf: "flex-end",
                color: draft.length >= MAX_MESSAGE_LENGTH ? "#ff6b6b" : undefined,
              }}
            >
              {draft.length}/{MAX_MESSAGE_LENGTH}
            </span>
          )}
        </div>
        <IconButton
          ariaLabel="Send"
          type="submit"
          disabled={isSending || !draft.trim() || draft.length > MAX_MESSAGE_LENGTH}
        >
          <Send size={16} />
        </IconButton>
      </form>
    </Surface>
  );
}
