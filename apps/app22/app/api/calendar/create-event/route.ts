import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

type IncomingEvent = {
  id: string;
  name: string;
  daysOfWeek: string[]; // MO, TU, WE, TH, FR, SA, SU
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  startDate?: string; // YYYY-MM-DD
  location?: string;
  color?: string;
  notes?: string;
};

const DAY_MAP: Record<string, string> = {
  MO: "MO",
  TU: "TU",
  WE: "WE",
  TH: "TH",
  FR: "FR",
  SA: "SA",
  SU: "SU",
};

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("gcal_token");
  if (!tokenCookie?.value) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const token = JSON.parse(tokenCookie.value);

  try {
    const { events } = await req.json();
    if (!Array.isArray(events)) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Refresh token if needed (simplified; in production check expiry)
    const accessToken = await ensureAccessToken(token);

    let created = 0;
    for (const ev of events as IncomingEvent[]) {
      const rrule = `RRULE:FREQ=WEEKLY;BYDAY=${ev.daysOfWeek.map((d) => DAY_MAP[d] || d).join(",")}`;
      const startDate = ev.startDate || new Date().toISOString().slice(0, 10);
      const start = `${startDate}T${ev.startTime}:00`;
      const end = `${startDate}T${ev.endTime}:00`;

      const createRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: ev.name,
          location: ev.location || "",
          description: ev.notes || "",
          start: { dateTime: start },
          end: { dateTime: end },
          recurrence: [rrule],
        }),
      });
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err?.error?.message || "Failed to create event");
      }
      created += 1;
    }

    return NextResponse.json({ created });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to create" }, { status: 500 });
  }
}

async function ensureAccessToken(token: any): Promise<string> {
  if (token?.access_token && (!token.expires_in || token.expires_in > 60)) {
    return token.access_token;
  }
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const refreshToken = token?.refresh_token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error_description || "Token refresh failed");
  return json.access_token as string;
}


