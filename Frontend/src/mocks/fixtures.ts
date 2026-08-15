import type {
  AnalyticsOverview,
  CalendarConnection,
  DashboardOverview,
  Interview,
  InterviewReport,
  JobDescriptionAnalysis,
  NotificationItem,
  PreparationPlan,
  PreparationTask,
  ProductState,
  Question,
  Resume,
  TopicMetric,
  User,
} from "@/types/domain";

// Keep server-rendered demo data deterministic. Relative `Date.now()` values are
// evaluated independently in the server and browser bundles and can otherwise
// produce different countdown text during hydration.
export const DEMO_ANCHOR = "2026-08-15T02:30:00.000Z";
const DEMO_ANCHOR_MS = Date.parse(DEMO_ANCHOR);
const inHours = (hours: number) => new Date(DEMO_ANCHOR_MS + hours * 3_600_000).toISOString();

export const demoInterviews: Interview[] = [
  {
    id: "interview-northstar",
    company: "Northstar Labs",
    companyMark: "N",
    role: "Senior Backend Engineer",
    type: "system_design",
    round: "System Design",
    roundNumber: 3,
    totalRounds: 4,
    scheduledAt: inHours(62),
    timezone: "Asia/Kolkata",
    durationMinutes: 60,
    meetingUrl: "https://meet.google.com/demo-room",
    recruiter: "Maya Chen",
    interviewers: ["Elena Ruiz", "Jordan Kim"],
    status: "upcoming",
    readiness: 85,
    preparationProgress: 68,
    location: "Google Meet",
    accent: "#f0b94c",
    rounds: [
      { id: "r1", name: "Recruiter screen", type: "recruiter", status: "completed" },
      { id: "r2", name: "Coding", type: "technical", status: "completed" },
      { id: "r3", name: "System design", type: "system_design", status: "current" },
      { id: "r4", name: "Hiring manager", type: "hiring_manager", status: "pending" },
    ],
  },
  {
    id: "interview-lattice",
    company: "Lattice Works",
    companyMark: "L",
    role: "Platform Engineer",
    type: "technical",
    round: "Technical deep dive",
    roundNumber: 2,
    totalRounds: 3,
    scheduledAt: inHours(148),
    timezone: "Asia/Kolkata",
    durationMinutes: 75,
    meetingUrl: "https://zoom.us/j/demo",
    recruiter: "Noah Williams",
    interviewers: ["Priya Raman"],
    status: "upcoming",
    readiness: 71,
    preparationProgress: 42,
    location: "Zoom",
    accent: "#9f7aea",
    rounds: [
      { id: "l1", name: "Recruiter screen", type: "recruiter", status: "completed" },
      { id: "l2", name: "Technical deep dive", type: "technical", status: "current" },
      { id: "l3", name: "Team conversation", type: "behavioral", status: "pending" },
    ],
  },
  {
    id: "interview-atelier",
    company: "Atelier Cloud",
    companyMark: "A",
    role: "Backend Engineer",
    type: "behavioral",
    round: "Hiring manager",
    roundNumber: 4,
    totalRounds: 4,
    scheduledAt: inHours(222),
    timezone: "Asia/Kolkata",
    durationMinutes: 45,
    recruiter: "Sam Taylor",
    interviewers: ["Avery Singh"],
    status: "confirmed",
    readiness: 64,
    preparationProgress: 31,
    location: "Microsoft Teams",
    accent: "#62b8a9",
    rounds: [
      { id: "a1", name: "Recruiter screen", type: "recruiter", status: "completed" },
      { id: "a2", name: "Coding", type: "technical", status: "completed" },
      { id: "a3", name: "Architecture", type: "system_design", status: "completed" },
      { id: "a4", name: "Hiring manager", type: "hiring_manager", status: "current" },
    ],
  },
];

export const demoTasks: PreparationTask[] = [
  {
    id: "task-isolation",
    day: 1,
    dateLabel: "Today",
    phase: "Foundation",
    category: "Databases",
    title: "Review transaction isolation",
    description: "Explain dirty, non-repeatable, and phantom reads with one production example.",
    estimatedMinutes: 12,
    status: "completed",
    priority: "high",
  },
  {
    id: "task-acid",
    day: 1,
    dateLabel: "Today",
    phase: "Foundation",
    category: "Databases",
    title: "Practice ACID trade-offs",
    description: "Answer five prompts and name the operational cost of stronger guarantees.",
    estimatedMinutes: 14,
    status: "completed",
    priority: "high",
  },
  {
    id: "task-cache",
    day: 1,
    dateLabel: "Today",
    phase: "Foundation",
    category: "System design",
    title: "Defend a cache strategy",
    description: "Cover invalidation, stampedes, stale reads, and graceful Redis failure.",
    estimatedMinutes: 18,
    status: "in_progress",
    priority: "high",
  },
  {
    id: "task-story",
    day: 1,
    dateLabel: "Today",
    phase: "Foundation",
    category: "Behavioral",
    title: "Tighten one impact story",
    description: "Add a measurable result to the incident-response example in your resume.",
    estimatedMinutes: 10,
    status: "pending",
    priority: "normal",
  },
  {
    id: "task-mock",
    day: 1,
    dateLabel: "Today",
    phase: "Foundation",
    category: "Mock",
    title: "Complete a 10-minute pressure test",
    description: "Use hard difficulty and focus on SQL plus distributed caching.",
    estimatedMinutes: 10,
    status: "pending",
    priority: "high",
  },
  {
    id: "task-company",
    day: 2,
    dateLabel: "Tomorrow",
    phase: "Company + role",
    category: "Company",
    title: "Map the role to your strongest evidence",
    description: "Connect three job requirements to concrete work from your resume.",
    estimatedMinutes: 20,
    status: "pending",
    priority: "normal",
  },
  {
    id: "task-design",
    day: 3,
    dateLabel: "Mon",
    phase: "Core technical",
    category: "System design",
    title: "Design a resilient job queue",
    description: "Practice constraints, delivery semantics, retries, and observability.",
    estimatedMinutes: 30,
    status: "pending",
    priority: "high",
  },
  {
    id: "task-final",
    day: 4,
    dateLabel: "Interview day",
    phase: "Warm-up",
    category: "Warm-up",
    title: "Run the calm-start protocol",
    description: "One concise story, one architecture trade-off, then stop preparing.",
    estimatedMinutes: 8,
    status: "pending",
    priority: "normal",
  },
];

export const preparationTimeline: PreparationPlan["timeline"] = [
  { day: 1, label: "Day 1", phase: "Foundation", status: "active" },
  { day: 2, label: "Day 2", phase: "Company + role", status: "upcoming" },
  { day: 3, label: "Day 3", phase: "Core technical", status: "upcoming" },
  { day: 4, label: "Day 4", phase: "Mock + weak areas", status: "upcoming" },
  { day: 5, label: "Interview", phase: "Warm-up", status: "upcoming" },
];

export const topicMetrics: TopicMetric[] = [
  { topic: "REST APIs", score: 92, trend: 4, relevance: "high" },
  { topic: "Node.js", score: 89, trend: 7, relevance: "critical" },
  { topic: "Data structures", score: 86, trend: 2, relevance: "high" },
  { topic: "Databases", score: 78, trend: 8, relevance: "critical" },
  { topic: "Cloud architecture", score: 67, trend: 5, relevance: "high" },
  { topic: "Networking", score: 64, trend: -1, relevance: "normal" },
  { topic: "System design", score: 58, trend: 11, relevance: "critical" },
];

export const interviewQuestions: Question[] = [
  {
    id: "q-cache",
    text: "You mentioned using Redis to reduce database load. Walk me through what you cached and how you kept it correct.",
    category: "Technical",
    topic: "Caching",
    difficulty: "hard",
  },
  {
    id: "q-cache-followup",
    text: "How did you handle cache invalidation, and what would the application do if Redis became unavailable?",
    category: "Technical",
    topic: "Caching",
    difficulty: "hard",
    followUp: true,
  },
  {
    id: "q-queue",
    text: "Design a background-job system that can tolerate worker failures without processing a payment twice.",
    category: "System design",
    topic: "Distributed systems",
    difficulty: "hard",
  },
  {
    id: "q-incident",
    text: "Tell me about a production incident where your first hypothesis was wrong. How did you recover?",
    category: "Behavioral",
    topic: "Ownership",
    difficulty: "normal",
  },
  {
    id: "q-index",
    text: "When can adding a database index make a system slower, and how would you validate the trade-off?",
    category: "Technical",
    topic: "Databases",
    difficulty: "hard",
  },
];

export const demoReport: InterviewReport = {
  id: "report-demo-01",
  sessionId: "session-demo-01",
  createdAt: new Date(DEMO_ANCHOR_MS - 86_400_000).toISOString(),
  overall: 82,
  technical: 84,
  communication: 81,
  structure: 76,
  clarity: 88,
  relevance: 86,
  depth: 79,
  summary:
    "Your technical instincts are strong and your examples feel credible. The next gain is structural: state the decision, name the trade-off, then prove the outcome before adding implementation detail.",
  speech: {
    averageWpm: 137,
    fillerCount: 18,
    fillers: { um: 7, like: 4, actually: 3, basically: 2, "you know": 2 },
    longPauses: 4,
    longestPause: 3.8,
    averageAnswerSeconds: 102,
  },
  weakTopics: ["System design", "SQL transactions", "Behavioral results"],
  strengths: [
    "Used concrete production examples",
    "Explained failure modes without prompting",
    "Maintained a clear, steady speaking pace",
  ],
  recommendedActions: [
    "Practice two system-design openings using constraints first",
    "Add measurable results to the incident-response story",
    "Re-answer the cache question in under 90 seconds",
  ],
  answers: [
    {
      question: "How did you keep cached data correct?",
      answer:
        "We cached the read-heavy account summary and invalidated it from the write path. We used a short TTL as a backstop and bypassed Redis when health checks failed.",
      score: 8.2,
      strengths: [
        "Named the cached object and access pattern",
        "Included a safe fallback path",
        "Recognized TTL as a backstop rather than the strategy",
      ],
      missing: ["Stampede protection", "Concurrent write ordering", "Operational alert threshold"],
      betterStructure: [
        "Define the data and consistency need",
        "Explain invalidation ownership",
        "Describe failure behavior",
        "Close with observed impact",
      ],
    },
    {
      question: "Describe a production incident where your first hypothesis was wrong.",
      answer:
        "I initially suspected a database regression, then used request traces to isolate an upstream timeout. I coordinated a rollback and added an alert for the saturation signal.",
      score: 7.4,
      strengths: ["Owned the incorrect hypothesis", "Explained the diagnostic pivot"],
      missing: ["Measurable user impact", "Time to recovery", "Result after the alert was added"],
      betterStructure: ["Situation", "Task", "Action", "Measurable result", "Lesson"],
    },
  ],
};

export const notifications: NotificationItem[] = [
  {
    id: "note-tomorrow",
    title: "Interview in under three days",
    message: "Your system-design preparation is 58%. A focused 12-minute drill is ready.",
    createdAt: new Date(DEMO_ANCHOR_MS - 12 * 60_000).toISOString(),
    read: false,
    actionHref: "/interviews/interview-northstar/prepare",
  },
  {
    id: "note-report",
    title: "Analysis complete",
    message: "Your backend mock report is ready, with three answers selected for retry.",
    createdAt: new Date(DEMO_ANCHOR_MS - 3 * 3_600_000).toISOString(),
    read: false,
    actionHref: "/practice/results/report-demo-01",
  },
];

export const scoreTrend = [64, 67, 66, 72, 75, 74, 79, 82, 84, 87];
export const readinessTrend = [51, 55, 58, 61, 66, 70, 73, 78, 82, 85];

export const demoUser: User = {
  id: "user-demo-01",
  email: "alex.morgan@example.com",
  displayName: "Alex Morgan",
  avatarUrl: null,
  timezone: "Asia/Kolkata",
  targetRole: "Senior Backend Engineer",
  experienceLevel: "senior",
  preferredLanguage: "English",
  skills: ["Node.js", "TypeScript", "PostgreSQL", "Redis", "Docker", "AWS"],
  onboardingCompleted: false,
  createdAt: "2026-01-04T09:00:00.000Z",
};

export const demoCalendarConnection: CalendarConnection = {
  connected: false,
  provider: null,
  accountEmail: null,
  scopes: [],
  lastSyncAt: null,
  status: null,
};

export const demoResume: Resume = {
  id: "resume-demo-01",
  fileName: "Alex_Morgan_Backend_Resume.pdf",
  parsedSkills: ["Node.js", "PostgreSQL", "Redis", "Docker", "AWS", "REST APIs"],
  uploadedAt: new Date(DEMO_ANCHOR_MS - 5 * 86_400_000).toISOString(),
};

export const demoJobDescriptionAnalysis: JobDescriptionAnalysis = {
  id: "jd-demo-01",
  overallMatch: 86,
  summary: "Your strongest evidence fits the core of this role.",
  skillMatrix: [
    { skill: "Node.js", candidateScore: 90, roleScore: 90 },
    { skill: "REST APIs", candidateScore: 92, roleScore: 85 },
    { skill: "SQL", candidateScore: 68, roleScore: 85 },
    { skill: "Docker", candidateScore: 55, roleScore: 75 },
    { skill: "AWS", candidateScore: 42, roleScore: 70 },
  ],
  createdAt: new Date(DEMO_ANCHOR_MS - 2 * 3_600_000).toISOString(),
};

export const demoAnalyticsOverview: AnalyticsOverview = {
  overallScore: 87,
  readinessScore: 85,
  streakDays: 12,
  improvementPercent: 23,
  scoreTrend,
  readinessTrend,
  microMetrics: [
    { key: "technical", label: "Technical score", value: 84, delta: "+8", trend: [70, 73, 72, 77, 80, 82, 84] },
    { key: "structure", label: "Answer structure", value: 76, delta: "+11", trend: [58, 62, 64, 68, 71, 74, 76] },
    { key: "pace", label: "Speaking pace", value: 137, delta: "WPM", trend: [144, 142, 139, 140, 138, 136, 137] },
    { key: "fillers", label: "Filler words", value: 18, delta: "-5", trend: [31, 29, 26, 25, 23, 20, 18] },
    { key: "practiceTime", label: "Practice time", value: 4.2, delta: "+38m", trend: [18, 24, 22, 31, 36, 41, 52] },
  ],
  topicPerformance: topicMetrics,
  recentSessions: [
    { reportId: "report-demo-01", company: "Northstar Labs", mode: "System design mock", score: 82, completedAt: inHours(-24) },
    { reportId: "report-demo-02", company: "Lattice Works", mode: "Technical mock", score: 79, completedAt: inHours(-96) },
    { reportId: "report-demo-03", company: "Atelier Cloud", mode: "Behavioral mock", score: 76, completedAt: inHours(-192) },
  ],
};

export function buildDashboardOverview(interviews: Interview[]): DashboardOverview {
  const sorted = [...interviews].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  return {
    nextInterview: sorted[0] ?? null,
    upcomingInterviews: sorted.slice(0, 3),
    todayTasks: demoTasks.filter((task) => task.day === 1),
    weakTopics: [...topicMetrics].sort((a, b) => a.score - b.score).slice(0, 3),
    streakDays: 12,
    scoreTrend,
    readinessDeltaThisWeek: 11,
  };
}

export const initialProductState: ProductState = {
  signedIn: false,
  onboardingCompleted: false,
  calendarConnected: false,
  calendarLastSync: null,
  userName: "Alex Morgan",
  userEmail: demoUser.email,
  userPhotoUrl: demoUser.avatarUrl,
  preparationTasks: demoTasks,
  resumeName: "Alex_Morgan_Backend_Resume.pdf",
  jobDescription:
    "Build resilient platform services in Node.js and PostgreSQL. Design distributed workflows, improve observability, and mentor engineers. Experience with Redis, queues, AWS, and container orchestration preferred.",
  session: null,
  reports: [demoReport],
  notifications,
};
