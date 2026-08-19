import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirebaseAuth, ensureLocalAuthPersistence } from "@/lib/firebase/client";
import type { Interview, InterviewRound, InterviewType } from "@/types/domain";

export const GOOGLE_CALENDAR_TOKEN_KEY = "intervu_google_calendar_token";
export const GOOGLE_CALENDAR_EMAIL_KEY = "intervu_google_calendar_email";
export const GOOGLE_CALENDAR_INTERVIEWS_KEY = "intervu_google_calendar_interviews";
export const GOOGLE_CALENDAR_LAST_SYNC_KEY = "intervu_google_calendar_last_sync";

export interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  hangoutLink?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  organizer?: {
    email?: string;
    displayName?: string;
  };
  attendees?: Array<{
    email?: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
  }>;
}

const ACCENT_COLORS = ["#f0b94c", "#9f7aea", "#62b8a9", "#e57373", "#64b5f6", "#f48fb1"];

function inferInterviewType(text: string): InterviewType {
  const lower = text.toLowerCase();
  if (lower.includes("system design") || lower.includes("architecture")) return "system_design";
  if (lower.includes("coding") || lower.includes("technical") || lower.includes("algorithm") || lower.includes("dsa")) return "technical";
  if (lower.includes("behavioral") || lower.includes("culture") || lower.includes("leadership") || lower.includes("values")) return "behavioral";
  if (lower.includes("recruiter") || lower.includes("phone screen") || lower.includes("screening") || lower.includes("intro")) return "recruiter";
  if (lower.includes("hiring manager") || lower.includes("hm round") || lower.includes("team lead")) return "hiring_manager";
  return "technical";
}

function inferCompanyAndRole(summary: string, organizerName?: string, organizerEmail?: string): { company: string; role: string } {
  const cleanSummary = summary.trim();

  // Pattern: "[Role] Interview at/with [Company]"
  const withMatch = cleanSummary.match(/^(.*?)\s+(?:interview\s+)?(?:at|with|@)\s+(.*?)$/i);
  if (withMatch && withMatch[1] && withMatch[2]) {
    const rolePart = withMatch[1].replace(/interview/i, "").trim() || "Software Engineer";
    const companyPart = withMatch[2].replace(/round\s*\d+/i, "").trim() || "Company";
    return { company: companyPart, role: rolePart };
  }

  // Pattern: "[Company] - [Role]" or "[Company]: [Role]"
  const dashMatch = cleanSummary.match(/^(.*?)\s*[-:|]\s*(.*?)$/);
  if (dashMatch && dashMatch[1] && dashMatch[2]) {
    return { company: dashMatch[1].trim(), role: dashMatch[2].trim() };
  }

  // Pattern: "[Company] Technical Interview"
  const companyInterviewMatch = cleanSummary.match(/^(.*?)\s+(?:technical|system design|behavioral|coding|final)?\s*interview/i);
  if (companyInterviewMatch && companyInterviewMatch[1]) {
    return { company: companyInterviewMatch[1].trim(), role: "Software Engineer" };
  }

  // Fallback using organizer domain or name
  let company = organizerName || "Scheduled Meeting";
  if (organizerEmail && !organizerEmail.endsWith("@gmail.com") && !organizerEmail.endsWith("@googlemail.com")) {
    const domain = organizerEmail.split("@")[1];
    if (domain) {
      company = domain.split(".")[0] || company;
      company = company.charAt(0).toUpperCase() + company.slice(1);
    }
  }

  return { company, role: cleanSummary || "Interview" };
}

const NOISE_KEYWORDS = [
  /\b(?:recharge|mobile|top-up|prepaid|postpaid|bill|payment|rent|emi|installment|electricity|broadband|wifi|dth|subscription|salary)\b/i,
  /\b(?:movie|cinema|theatre|theater|tickets?|booking|bookmyshow|pvr|inox|imax)\b/i,
  /\b(?:flight|airline|boarding\s+pass|hotel\s+stay|hotel\s+booking|airbnb\s+stay|airbnb\s+booking|check-in|checkout|irctc\s+ticket)\b/i,
  /\b(?:dentist|doctor|clinic|hospital|prescription|dr\.|medicine|appointment)\b/i,
  /\b(?:birthday|anniversary|party|wedding|celebration|dinner|lunch|brunch)\b/i,
  /\b(?:gym|workout|yoga|fitness|swimming|running|match|game)\b/i,
  /\b(?:national\s+holiday|public\s+holiday|bank\s+holiday|festival|leave|pto|vacation)\b/i,
  /\b(?:daily\s+standup|team\s+sync|weekly\s+sync|internal\s+sync|1:1\s+with|catchup|sync-up|routine\s+check)\b/i,
];

const STRICT_INTERVIEW_KEYWORDS = [
  /\b(?:interview|screening|recruiter|technical\s+round|coding\s+round|system\s+design|hiring\s+manager|hm\s+round|onsite\s+loop|debrief|panel\s+interview|take-home|bar\s+raiser|talent\s+acquisition|virtual\s+interview|phone\s+screen|live\s+coding|architecture\s+round|behavioral\s+round|round\s*\d+)\b/i,
];

const RECRUITING_DOMAINS = [
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "workday.com",
  "smartrecruiters.com",
  "hirevue.com",
  "jobvite.com",
  "taleo.net",
  "breezy.hr",
  "pinpointhq.com",
];

export function isLegitimateInterviewEvent(event: GoogleCalendarEvent): boolean {
  const summary = (event.summary || "").trim();
  const description = (event.description || "").trim();
  const fullText = `${summary} ${description}`;

  if (!summary && !description) return false;

  // 1. If it matches any noise keywords, reject
  if (NOISE_KEYWORDS.some((re) => re.test(fullText))) {
    return false;
  }

  // 2. Check if organizer or attendees are from a recruiting platform/email
  const organizerEmail = (event.organizer?.email || "").toLowerCase();
  const hasRecruiterEmail =
    RECRUITING_DOMAINS.some((domain) => organizerEmail.includes(domain)) ||
    /\b(?:recruiting|talent|careers|hr|jobs|hiring)@/i.test(organizerEmail);

  // 3. Check for strict interview keywords in summary or description
  const hasStrictInterviewSignal = STRICT_INTERVIEW_KEYWORDS.some((re) => re.test(fullText));

  return hasStrictInterviewSignal || hasRecruiterEmail;
}

export function parseGoogleCalendarEventsToInterviews(
  events: GoogleCalendarEvent[],
  userEmail?: string,
): Interview[] {
  const now = Date.now();
  const maxFutureMs = now + 60 * 24 * 60 * 60_000; // Limit to next 60 days

  return events
    .filter((event) => {
      // Must have a start date/time
      if (!event.start?.dateTime && !event.start?.date) return false;

      const scheduledAt = event.start?.dateTime || `${event.start?.date}T10:00:00.000Z`;
      const startMs = Date.parse(scheduledAt);

      // Must be within recent past (-7 days) and reasonable future (+60 days)
      if (isNaN(startMs) || startMs > maxFutureMs || startMs < now - 7 * 24 * 60 * 60_000) {
        return false;
      }

      // Must satisfy strict interview criteria
      return isLegitimateInterviewEvent(event);
    })
    .map((event, index) => {
      const summary = event.summary || "Scheduled Interview";
      const description = event.description || "";
      const textToAnalyze = `${summary} ${description}`;
      const { company, role } = inferCompanyAndRole(
        summary,
        event.organizer?.displayName,
        event.organizer?.email,
      );
      const type = inferInterviewType(textToAnalyze);

      const scheduledAt = event.start?.dateTime || `${event.start?.date}T10:00:00.000Z`;
      const startMs = Date.parse(scheduledAt);
      const endMs = event.end?.dateTime ? Date.parse(event.end.dateTime) : startMs + 60 * 60_000;
      const durationMinutes = Math.max(15, Math.round((endMs - startMs) / 60_000)) || 60;

      const meetingUrl =
        event.hangoutLink ||
        (event.location?.startsWith("http") ? event.location : undefined) ||
        (description.match(/https:\/\/[^\s"]+/)?.[0] ?? undefined);

      const location = event.hangoutLink
        ? "Google Meet"
        : event.location && !event.location.startsWith("http")
        ? event.location
        : "Google Meet";

      const interviewers = event.attendees
        ?.filter((a) => a.email && a.email !== userEmail && !a.self)
        .map((a) => a.displayName || a.email || "Interviewer")
        .slice(0, 4);

      const recruiter = event.organizer?.displayName || event.organizer?.email || "Recruiter";

      const isPast = !isNaN(startMs) && startMs < (now - 15 * 60_000);
      const status: Interview["status"] = isPast ? "completed" : "upcoming";

      const round: InterviewRound = {
        id: `r-${event.id || index}`,
        name: type === "system_design" ? "System design" : type === "behavioral" ? "Behavioral" : "Technical deep dive",
        type,
        status: isPast ? "completed" : "current",
      };

      const accent = ACCENT_COLORS[index % ACCENT_COLORS.length] ?? "#f0b94c";

      return {
        id: `gcal-${event.id || index}`,
        company,
        companyMark: (company[0] || "I").toUpperCase(),
        role,
        type,
        round: round.name,
        roundNumber: 1,
        totalRounds: 3,
        scheduledAt: new Date(scheduledAt).toISOString(),
        timezone: event.start?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        durationMinutes,
        meetingUrl,
        recruiter,
        interviewers: interviewers && interviewers.length ? interviewers : ["Interviewer"],
        status,
        readiness: 75 + ((index * 7) % 20),
        preparationProgress: 35 + ((index * 13) % 45),
        location,
        accent,
        rounds: [round],
      };
    })
    .sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
}

export async function connectGoogleCalendarWithOAuth(): Promise<{
  accessToken: string;
  email: string | null;
  name: string | null;
  photoUrl: string | null;
} | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;

  await ensureLocalAuthPersistence(auth);
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/calendar.readonly");
  provider.addScope("https://www.googleapis.com/auth/calendar.events.readonly");
  provider.setCustomParameters({
    prompt: "consent select_account",
    access_type: "offline",
  });

  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = credential?.accessToken;

  if (!accessToken) {
    throw new Error("Could not retrieve Google Calendar access token from sign-in.");
  }

  const email = result.user.email;
  const name = result.user.displayName;
  const photoUrl = result.user.photoURL;

  // Persist token & email in localStorage
  if (typeof window !== "undefined") {
    window.localStorage.setItem(GOOGLE_CALENDAR_TOKEN_KEY, accessToken);
    if (email) window.localStorage.setItem(GOOGLE_CALENDAR_EMAIL_KEY, email);
    window.localStorage.setItem(GOOGLE_CALENDAR_LAST_SYNC_KEY, new Date().toISOString());
  }

  return { accessToken, email, name, photoUrl };
}

export async function fetchGoogleCalendarEvents(accessToken: string): Promise<GoogleCalendarEvent[]> {
  // Query from 30 days in the past to capture recent and upcoming interviews
  const timeMin = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
    timeMin,
  )}&singleEvents=true&orderBy=startTime&maxResults=100`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errBody = (await response.json().catch(() => null)) as {
        error?: { message?: string; status?: string };
      } | null;
      const detail = errBody?.error?.message || response.statusText;

      if (response.status === 401 || response.status === 403) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
        }
        console.warn(`Google Calendar API access issue (${response.status}): ${detail}`);
        return [];
      }

      console.warn(`Google Calendar API returned status ${response.status}: ${detail}`);
      return [];
    }

    const data = (await response.json()) as { items?: GoogleCalendarEvent[] };
    const items = data.items || [];
    console.info(`[Google Calendar] Retrieved ${items.length} calendar events from Google account.`);
    return items;
  } catch (netErr) {
    console.warn("Network error fetching Google Calendar events:", netErr);
    return [];
  }
}

export function getStoredGoogleCalendarToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GOOGLE_CALENDAR_TOKEN_KEY);
}

export function getStoredGoogleCalendarEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(GOOGLE_CALENDAR_EMAIL_KEY);
}

export function getStoredGoogleCalendarInterviews(): Interview[] | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(GOOGLE_CALENDAR_INTERVIEWS_KEY);
  if (!raw) return null;
  try {
    const list = JSON.parse(raw) as Interview[];
    if (!Array.isArray(list)) return null;

    // Filter out previously cached noise (e.g. recharge, Scheduled Meeting without interview signals)
    const sanitized = list.filter((i) => {
      const full = `${i.company} ${i.role} ${i.round}`.toLowerCase();
      const hasNoise = NOISE_KEYWORDS.some((re) => re.test(full));
      if (hasNoise) return false;
      if (i.company === "Scheduled Meeting" && !STRICT_INTERVIEW_KEYWORDS.some((re) => re.test(full))) {
        return false;
      }
      return true;
    });

    if (sanitized.length !== list.length) {
      window.localStorage.setItem(GOOGLE_CALENDAR_INTERVIEWS_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return null;
  }
}

export function saveStoredGoogleCalendarInterviews(interviews: Interview[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GOOGLE_CALENDAR_INTERVIEWS_KEY, JSON.stringify(interviews));
  window.localStorage.setItem(GOOGLE_CALENDAR_LAST_SYNC_KEY, new Date().toISOString());
}

export function clearStoredGoogleCalendar() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GOOGLE_CALENDAR_TOKEN_KEY);
  window.localStorage.removeItem(GOOGLE_CALENDAR_EMAIL_KEY);
  window.localStorage.removeItem(GOOGLE_CALENDAR_INTERVIEWS_KEY);
  window.localStorage.removeItem(GOOGLE_CALENDAR_LAST_SYNC_KEY);
}
