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
          dateTime: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString(),
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: new Date(Date.now() + 2 * 24 * 60 * 60_000 + 3600_000).toISOString(),
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
          dateTime: new Date(Date.now() + 1 * 24 * 60 * 60_000).toISOString(),
        },
        end: {
          dateTime: new Date(Date.now() + 1 * 24 * 60 * 60_000 + 2700_000).toISOString(),
        },
        organizer: {
          email: "talent@datadoghq.com",
          displayName: "Datadog Recruiting",
        },
      },
    ];

    const interviews = parseGoogleCalendarEventsToInterviews(rawEvents, "candidate@gmail.com");

    expect(interviews).toHaveLength(2);

    // Sorted by scheduledAt (event-2 is earlier than event-1)
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

  it("filters out non-interview noise like movie tickets and personal bookings", () => {
    const mixedEvents: GoogleCalendarEvent[] = [
      {
        id: "movie-1",
        summary: "Spider Man: Brand New Day (UA13+)",
        description: "BookMyShow Ticket Booking: PVR Inox Audi 4",
        start: { dateTime: new Date(Date.now() + 1 * 24 * 60 * 60_000).toISOString() },
      },
      {
        id: "flight-1",
        summary: "Flight to Seattle - Delta Airlines DL1234",
        description: "Terminal 2 Boarding Pass",
        start: { dateTime: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString() },
      },
      {
        id: "interview-1",
        summary: "Google - Staff Software Engineer Technical Interview",
        description: "System Design with Staff Eng",
        start: { dateTime: new Date(Date.now() + 3 * 24 * 60 * 60_000).toISOString() },
      },
    ];

    const parsed = parseGoogleCalendarEventsToInterviews(mixedEvents);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.company).toBe("Google");
  });

  it("filters out recurring personal reminders like mobile recharge and bill payments", () => {
    const reminderEvents: GoogleCalendarEvent[] = [
      {
        id: "recharge-1",
        summary: "recharge",
        description: "Airtel Prepaid Mobile recharge reminder",
        start: { dateTime: new Date(Date.now() + 2 * 24 * 60 * 60_000).toISOString() },
      },
      {
        id: "bill-1",
        summary: "Electricity bill payment",
        description: "Pay BESCOM monthly power bill",
        start: { dateTime: new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString() },
      },
      {
        id: "interview-real",
        summary: "Amazon - Software Dev Engineer Technical Screen",
        description: "Live coding with bar raiser",
        start: { dateTime: new Date(Date.now() + 3 * 24 * 60 * 60_000).toISOString() },
      },
    ];

    const parsed = parseGoogleCalendarEventsToInterviews(reminderEvents);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.company).toBe("Amazon");
  });

  it("assigns completed status to past events and upcoming to future events", () => {
    const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString();
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString();

    const events: GoogleCalendarEvent[] = [
      {
        id: "past-1",
        summary: "Uber - Phone Screening",
        start: { dateTime: pastDate },
      },
      {
        id: "future-1",
        summary: "Airbnb - System Design Round",
        start: { dateTime: futureDate },
      },
    ];

    const parsed = parseGoogleCalendarEventsToInterviews(events);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.status).toBe("completed");
    expect(parsed[1]?.status).toBe("upcoming");
  });
});

