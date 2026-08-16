import { describe, expect, it } from "vitest";
import {
  parseGoogleCalendarEventsToInterviews,
  type GoogleCalendarEvent,
} from "@/lib/google-calendar";

describe("Google Calendar Parser", () => {
  it("parses Google Calendar events into Interview records correctly", () => {
    const rawEvents: GoogleCalendarEvent[] = [
      {
        id: "event-1",
        summary: "Staff Platform Engineer Interview with Stripe",
        description: "Round 2: System Design deep dive. Please join: https://meet.google.com/xyz-abcd-efg",
        location: "Google Meet",
        hangoutLink: "https://meet.google.com/xyz-abcd-efg",
        start: {
          dateTime: "2026-08-20T14:30:00.000Z",
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: "2026-08-20T15:30:00.000Z",
        },
        organizer: {
          email: "recruiting@stripe.com",
          displayName: "Stripe Talent",
        },
        attendees: [
          { email: "candidate@gmail.com", displayName: "Candidate User", self: true },
          { email: "eng-lead@stripe.com", displayName: "Alex Chen" },
        ],
      },
      {
        id: "event-2",
        summary: "Datadog - Senior Software Engineer Technical Screen",
        description: "Coding & Algorithms with Sarah",
        start: {
          dateTime: "2026-08-18T10:00:00.000Z",
        },
        end: {
          dateTime: "2026-08-18T10:45:00.000Z",
        },
        organizer: {
          email: "talent@datadoghq.com",
          displayName: "Datadog Recruiting",
        },
      },
    ];

    const interviews = parseGoogleCalendarEventsToInterviews(rawEvents, "candidate@gmail.com");

    expect(interviews).toHaveLength(2);

    // Sorted by scheduledAt (event-2 is Aug 18, event-1 is Aug 20)
    const [first, second] = interviews;

    expect(first?.company).toBe("Datadog");
    expect(first?.role).toBe("Senior Software Engineer Technical Screen");
    expect(first?.type).toBe("technical");
    expect(first?.durationMinutes).toBe(45);

    expect(second?.company).toBe("Stripe");
    expect(second?.role).toBe("Staff Platform Engineer");
    expect(second?.type).toBe("system_design");
    expect(second?.meetingUrl).toBe("https://meet.google.com/xyz-abcd-efg");
    expect(second?.interviewers).toContain("Alex Chen");
  });
});
