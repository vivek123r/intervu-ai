"use client";

import type { Interview, InterviewType, User } from "@/types/domain";

export const ACTIVE_TRACK_STORAGE_KEY = "intervu_active_preparation_track";

export interface ActivePreparationTrack {
  id: string;
  title: string;
  role: string;
  company?: string;
  companyMark?: string;
  type: InterviewType;
  roundName: string;
  source: "role" | "interview" | "mock" | "custom";
  interviewId?: string;
  readinessScore: number;
  currentDay: number;
  totalDays: number;
  completedTasks: number;
  totalTasks: number;
  weakTopics: string[];
  focusDescription: string;
}

export const PRESET_ROLE_TRACKS: ActivePreparationTrack[] = [
  {
    id: "track-backend-lead",
    title: "Senior Backend Engineer Track",
    role: "Senior Backend Engineer",
    company: "Target Role Calibration",
    companyMark: "B",
    type: "technical",
    roundName: "Technical Deep Dive & Architecture",
    source: "role",
    readinessScore: 78,
    currentDay: 1,
    totalDays: 5,
    completedTasks: 2,
    totalTasks: 5,
    weakTopics: ["Caching & Stampedes", "Transaction Isolation", "Distributed Idempotency"],
    focusDescription: "Calibrated to high-scale platform services, database internals, and concurrency.",
  },
  {
    id: "track-dist-systems",
    title: "Distributed Systems & Cloud Architect Track",
    role: "Staff Infrastructure Engineer",
    company: "Distributed Systems",
    companyMark: "D",
    type: "system_design",
    roundName: "Large-Scale System Design",
    source: "role",
    readinessScore: 72,
    currentDay: 1,
    totalDays: 7,
    completedTasks: 1,
    totalTasks: 6,
    weakTopics: ["Partitioning & Replication", "Eventual Consistency", "Kafka Event Pipelines"],
    focusDescription: "Focus on multi-region availability, CAP trade-offs, and failure domain mitigation.",
  },
  {
    id: "track-fullstack",
    title: "Full Stack Engineering Track",
    role: "Full Stack Engineer",
    company: "Full Stack Modern Web",
    companyMark: "F",
    type: "technical",
    roundName: "Full Stack Architecture & APIs",
    source: "role",
    readinessScore: 81,
    currentDay: 1,
    totalDays: 5,
    completedTasks: 3,
    totalTasks: 5,
    weakTopics: ["API Idempotency", "Client-Side Cache Invalidation", "Security Headers"],
    focusDescription: "End-to-end web architectures, scalable API contracts, and real-time state.",
  },
  {
    id: "track-behavioral-lead",
    title: "Behavioral & Engineering Leadership Track",
    role: "Engineering Lead / Staff Engineer",
    company: "Leadership & STAR",
    companyMark: "L",
    type: "behavioral",
    roundName: "STAR Framework & Impact Stories",
    source: "mock",
    readinessScore: 84,
    currentDay: 1,
    totalDays: 3,
    completedTasks: 2,
    totalTasks: 4,
    weakTopics: ["Architectural Disagreements", "Outage Incident Leadership", "Measurable Business Impact"],
    focusDescription: "Executive communication, conflict resolution trade-offs, and structured STAR storytelling.",
  },
];

export function toTitleCase(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getActivePreparationTrack(
  user?: User | null,
): ActivePreparationTrack | null {
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(ACTIVE_TRACK_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ActivePreparationTrack;
        if (parsed && parsed.title && parsed.role) {
          return {
            ...parsed,
            role: toTitleCase(parsed.role),
            title: parsed.title.includes("Track")
              ? `${toTitleCase(parsed.role)} Track`
              : parsed.title,
          };
        }
      }
    } catch {
      // Best-effort JSON parse
    }
  }

  // Fallback 1: If user configured a target role in their profile, calibrate to it
  if (user?.targetRole && user.targetRole.trim()) {
    const rawRole = user.targetRole.trim();
    const formattedRole = toTitleCase(rawRole);
    return {
      id: "track-user-role",
      title: `${formattedRole} Track`,
      role: formattedRole,
      company: "Target Role Calibration",
      companyMark: (formattedRole[0] || "R").toUpperCase(),
      type: "technical",
      roundName: "Technical Deep Dive & Architecture",
      source: "role",
      readinessScore: 75,
      currentDay: 1,
      totalDays: 5,
      completedTasks: 0,
      totalTasks: 5,
      weakTopics: ["System Design", "Databases", "Concurrency"],
      focusDescription: `Customized preparation track aligned to your ${formattedRole} target role and resume profile.`,
    };
  }

  // If no track is stored and no target role set, return null (renders track chooser)
  return null;
}

export function saveActivePreparationTrack(track: ActivePreparationTrack): void {
  if (typeof window !== "undefined") {
    try {
      const normalizedTrack = {
        ...track,
        role: toTitleCase(track.role),
        title: track.title.includes("Track")
          ? `${toTitleCase(track.role)} Track`
          : track.title,
      };
      localStorage.setItem(ACTIVE_TRACK_STORAGE_KEY, JSON.stringify(normalizedTrack));
    } catch {
      // Ignore write errors
    }
  }
}

export function createTrackFromInterview(interview: Interview): ActivePreparationTrack {
  const formattedRole = toTitleCase(interview.role);
  return {
    id: `track-interview-${interview.id}`,
    title: `${interview.company} Interview Preparation`,
    role: formattedRole,
    company: interview.company,
    companyMark: interview.companyMark || (interview.company[0] || "I").toUpperCase(),
    type: interview.type,
    roundName: interview.round,
    source: "interview",
    interviewId: interview.id,
    readinessScore: interview.readiness || 72,
    currentDay: 1,
    totalDays: 5,
    completedTasks: 1,
    totalTasks: 5,
    weakTopics: ["System Design", "Databases", "Distributed Systems"],
    focusDescription: `Targeted preparation for your upcoming ${interview.company} ${interview.round} round.`,
  };
}

export interface DefaultDrillItem {
  id: string;
  title: string;
  category: string;
  estimatedMinutes: number;
  status: "pending" | "completed";
}

export function getDefaultTrackDrills(role: string): DefaultDrillItem[] {
  const normalized = (role || "").toLowerCase();
  if (normalized.includes("backend")) {
    return [
      { id: "d1", title: "Review Transaction Isolation & ACID Guarantees", category: "Databases", estimatedMinutes: 12, status: "completed" },
      { id: "d2", title: "Defend Cache Strategy & Stampede Protection", category: "System Design", estimatedMinutes: 15, status: "pending" },
      { id: "d3", title: "Database Indexing (B-Tree vs LSM Trees)", category: "Databases", estimatedMinutes: 10, status: "pending" },
      { id: "d4", title: "Handle Distributed Idempotency & Race Conditions", category: "Architecture", estimatedMinutes: 14, status: "pending" },
    ];
  }
  if (normalized.includes("system") || normalized.includes("infra") || normalized.includes("cloud")) {
    return [
      { id: "d1", title: "Design Distributed Rate Limiter with Redis", category: "System Design", estimatedMinutes: 15, status: "completed" },
      { id: "d2", title: "Analyze Partitioning & Consensus (Raft/Paxos)", category: "Distributed Systems", estimatedMinutes: 18, status: "pending" },
      { id: "d3", title: "Trade-offs in Eventual vs Strong Consistency", category: "Architecture", estimatedMinutes: 12, status: "pending" },
      { id: "d4", title: "Multi-Region Disaster Recovery Architecture", category: "Infra", estimatedMinutes: 15, status: "pending" },
    ];
  }
  if (normalized.includes("frontend") || normalized.includes("full")) {
    return [
      { id: "d1", title: "Optimize Core Web Vitals (LCP, INP, CLS)", category: "Performance", estimatedMinutes: 12, status: "completed" },
      { id: "d2", title: "Implement Scalable State Management & Caching", category: "Architecture", estimatedMinutes: 15, status: "pending" },
      { id: "d3", title: "Defend REST vs GraphQL vs gRPC API Contracts", category: "API Design", estimatedMinutes: 14, status: "pending" },
      { id: "d4", title: "Handle Real-time WebSocket Sync & Reconnection", category: "Networking", estimatedMinutes: 15, status: "pending" },
    ];
  }
  return [
    { id: "d1", title: "Frame a High-Impact Engineering Problem (STAR)", category: "Behavioral", estimatedMinutes: 10, status: "completed" },
    { id: "d2", title: "System Architecture Trade-offs & Scalability", category: "System Design", estimatedMinutes: 15, status: "pending" },
    { id: "d3", title: "Core Data Structures & Algorithm Complexity", category: "Technical", estimatedMinutes: 12, status: "pending" },
    { id: "d4", title: "Complete 10-Minute Role Pressure Test", category: "Mock", estimatedMinutes: 10, status: "pending" },
  ];
}

export interface DefaultTopicItem {
  topic: string;
  relevance: string;
  score: number;
}

export function getDefaultTopicBenchmarks(role: string): DefaultTopicItem[] {
  const normalized = (role || "").toLowerCase();
  if (normalized.includes("backend")) {
    return [
      { topic: "Distributed Caching & Stampedes", relevance: "high", score: 62 },
      { topic: "Database Indexing & Locks", relevance: "critical", score: 68 },
      { topic: "API Idempotency & Error Handling", relevance: "high", score: 74 },
    ];
  }
  if (normalized.includes("system") || normalized.includes("infra")) {
    return [
      { topic: "Partitioning & Sharding Keys", relevance: "critical", score: 58 },
      { topic: "CAP Theorem & Failure Modes", relevance: "high", score: 65 },
      { topic: "Message Queues & Backpressure", relevance: "high", score: 72 },
    ];
  }
  if (normalized.includes("full") || normalized.includes("frontend")) {
    return [
      { topic: "Client Cache Invalidation & SWR", relevance: "high", score: 64 },
      { topic: "API Rate Limiting & Auth Flow", relevance: "critical", score: 70 },
      { topic: "Component Rendering Bottlenecks", relevance: "high", score: 76 },
    ];
  }
  return [
    { topic: "STAR Framework Articulation", relevance: "critical", score: 65 },
    { topic: "System Trade-off Justification", relevance: "high", score: 70 },
    { topic: "Concurrency & Edge Cases", relevance: "high", score: 75 },
  ];
}
