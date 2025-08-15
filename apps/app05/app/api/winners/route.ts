import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { chromium, Browser, Page } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Give the function enough time on Vercel Pro to finish scraping
export const maxDuration = 60;

type WinnerResult = {
  raceName: string;
  raceUrl: string;
  editionYear: number;
  date: string; // ISO date string
  winner: string;
  winnerUrl?: string;
  categoryT: number;
};

const FIRSTCYCLING_BASE = "https://firstcycling.com";

function getMonthDayFromISO(iso: string): { month: number; day: number } {
  const d = new Date(iso);
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function looksBlocked(text: string): boolean {
  const lowered = text.toLowerCase();
  return (
    lowered.includes("forbidden") ||
    lowered.includes("access denied") ||
    lowered.includes("blocked") ||
    lowered.includes("captcha") ||
    lowered.includes("cloudflare")
  );
}

async function fetchDirectHtml(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
      referer: FIRSTCYCLING_BASE + "/",
      "upgrade-insecure-requests": "1",
    },
    cache: "no-store",
    redirect: "follow",
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function fetchViaProxy(url: string): Promise<{ ok: boolean; status: number; text: string }> {
  const withoutProtocol = url.replace(/^https?:\/\//, "");
  const proxyUrl = `https://r.jina.ai/http://${withoutProtocol}`;
  const res = await fetch(proxyUrl, { cache: "no-store" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function fetchHtmlSmart(url: string): Promise<{ ok: boolean; status: number; text: string; viaProxy: boolean }> {
  try {
    const direct = await fetchDirectHtml(url);
    if (direct.ok && !looksBlocked(direct.text)) {
      return { ...direct, viaProxy: false };
    }
    const proxy = await fetchViaProxy(url);
    return { ...proxy, viaProxy: true };
  } catch {
    const proxy = await fetchViaProxy(url);
    return { ...proxy, viaProxy: true };
  }
}

async function withBrowser<T>(fn: (page: Page, browser: Browser) => Promise<T>): Promise<T> {
  const isVercel = !!process.env.VERCEL;
  const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;

  // Prefer connecting to a remote browser (e.g. Browserless) when endpoint is provided
  if (wsEndpoint) {
    const browser = await chromium.connectOverCDP(wsEndpoint);
    const existing = browser.contexts();
    const context = existing.length
      ? existing[0]
      : await browser.newContext({
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          viewport: { width: 1366, height: 900 },
          locale: "en-US",
        });
    const page = await context.newPage();
    try {
      return await fn(page, browser);
    } finally {
      try { await page.close(); } catch {}
      // Intentionally do not close the remote browser; it may be shared
    }
  }

  // Local Chromium only when not on Vercel serverless
  if (!isVercel) {
    const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 900 },
      locale: "en-US",
    });
    const page = await context.newPage();
    try {
      return await fn(page, browser);
    } finally {
      await context.close();
      await browser.close();
    }
  }

  throw new Error(
    "Playwright is not available in this deployment. Provide PLAYWRIGHT_WS_ENDPOINT to use a remote browser."
  );
}

function isRaceDetailHref(href: string): boolean {
  // Normalize
  const h = href.trim();
  if (!h) return false;
  if (!h.includes("race.php")) return false;
  // Exclude calendar/listing navigations
  if (/(^|[?&])y=\d{4}(&|$)/.test(h) && /(^|[?&])t=\d{1,2}(&|$)/.test(h)) return false;
  // Accept if it has an id-like parameter or not just empty
  if (/[?&](raceid|id|race|r)=/i.test(h)) return true;
  // Fallback: race.php without y/t looks like a detail page
  if (!/[?&](y|t)=/i.test(h)) return true;
  return false;
}

function absolutize(href: string): string {
  return href.startsWith("http") ? href : `${FIRSTCYCLING_BASE}/${href.replace(/^\//, "")}`;
}

function parseRaceCalendar(html: string) {
  const $ = cheerio.load(html);
  // Gather anchors that look like race detail pages
  const links = new Set<string>();
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (isRaceDetailHref(href)) links.add(absolutize(href));
  });
  return Array.from(links);
}

function parseRaceWinnerForDate(
  html: string,
  birthdayIso: string,
  fallbackRaceUrl?: string
): Omit<WinnerResult, "categoryT"> | null {
  const { month, day } = getMonthDayFromISO(birthdayIso);
  const $ = cheerio.load(html);

  // Try to get race name and year
  const title = $("title").text().trim();
  const heading = $("h1").first().text().trim() || title;
  let raceName = heading.replace(/\s*\|.*$/, "");

  // Find table rows that include dates and winners
  // FirstCycling race pages often have a results table with date in first column
  // We'll scan for rows that contain the birthday (month-day) and read winner column
  let match: Omit<WinnerResult, "categoryT"> | null = null;

  const monthNames: Record<string, number> = {
    jan: 1,
    january: 1,
    feb: 2,
    february: 2,
    mar: 3,
    march: 3,
    apr: 4,
    april: 4,
    may: 5,
    jun: 6,
    june: 6,
    jul: 7,
    july: 7,
    aug: 8,
    august: 8,
    sep: 9,
    sept: 9,
    september: 9,
    oct: 10,
    october: 10,
    nov: 11,
    november: 11,
    dec: 12,
    december: 12,
  };

  $("table tr").each((_, tr) => {
    if (match) return;
    const tds = $(tr).find("td");
    if (tds.length < 1) return;

    // Search the whole row text for a date that matches the birthday
    const rowText = $(tr).text().trim().replace(/\s+/g, " ");

    let rowMonth = -1;
    let rowDay = -1;

    // 1) Numeric: 12/04 or 12.04 or 2025-04-12
    let m = rowText
      .replace(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/, "$2/$3")
      .replace(/(\d{1,2})[.](\d{1,2})/, "$1/$2")
      .match(/(\d{1,2})\/(\d{1,2})/);
    if (m) {
      rowMonth = parseInt(m[1], 10);
      rowDay = parseInt(m[2], 10);
    }

    // 2) Textual month formats like "1 May" or "May 1"
    if (rowMonth === -1 || rowDay === -1) {
      const m1 = rowText.match(/\b(\d{1,2})\s*([A-Za-z]{3,9})\b/);
      if (m1) {
        const d = parseInt(m1[1], 10);
        const monName = m1[2].toLowerCase();
        const mon = monthNames[monName as keyof typeof monthNames];
        if (mon) {
          rowMonth = mon;
          rowDay = d;
        }
      }
    }

    if (rowMonth === -1 || rowDay === -1) {
      const m2 = rowText.match(/\b([A-Za-z]{3,9})\s*(\d{1,2})\b/);
      if (m2) {
        const monName = m2[1].toLowerCase();
        const mon = monthNames[monName as keyof typeof monthNames];
        const d = parseInt(m2[2], 10);
        if (mon) {
          rowMonth = mon;
          rowDay = d;
        }
      }
    }

    if (rowMonth === month && rowDay === day) {
      // Try to locate a rider link in this row
      const riderLink = $(tr).find('a[href*="rider.php"]').first();
      const winnerHref = riderLink.attr("href");
      const winner = (riderLink.text().trim() || $(tds[1] || tds[0]).text().trim()).replace(/\s+/g, " ");

      // Attempt to deduce year from context
      let editionYear = new Date().getUTCFullYear();
      const yearMatch = $("h1, h2, .season, .year").text().match(/(19|20)\d{2}/);
      if (yearMatch) editionYear = parseInt(yearMatch[0], 10);

      // Try to build canonical race URL
      const canonical = $("link[rel='canonical']").attr("href");
      const raceUrl = canonical || fallbackRaceUrl || FIRSTCYCLING_BASE + "/" + ("" + $("base").attr("href") || "");

      match = {
        raceName: raceName || "Race",
        raceUrl: raceUrl || "",
        editionYear,
        date: new Date(new Date(birthdayIso).setUTCFullYear(editionYear))
          .toISOString()
          .slice(0, 10),
        winner,
        winnerUrl: winnerHref
          ? winnerHref.startsWith("http")
            ? winnerHref
            : `${FIRSTCYCLING_BASE}/${winnerHref.replace(/^\//, "")}`
          : undefined,
      };
    }
  });

  return match;
}

function extractSingleDayFromInfo(html: string): { day: number; month: number; year?: number } | null {
  const $ = cheerio.load(html);
  const infoText = $("body").text().replace(/\s+/g, " ");
  // Match dd.mm or d.m
  let m = infoText.match(/\b(\d{1,2})[.](\d{1,2})(?:[.](\d{2,4}))?\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = m[3] ? parseInt(m[3], 10) : undefined;
    return { day, month, year };
  }
  // Match formats like 16th January 2024 or 28 Jan 2025
  const months = {
    january: 1, jan: 1,
    february: 2, feb: 2,
    march: 3, mar: 3,
    april: 4, apr: 4,
    may: 5,
    june: 6, jun: 6,
    july: 7, jul: 7,
    august: 8, aug: 8,
    september: 9, sept: 9, sep: 9,
    october: 10, oct: 10,
    november: 11, nov: 11,
    december: 12, dec: 12,
  } as Record<string, number>;
  m = infoText.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?\b/);
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = months[m[2].toLowerCase()];
    const year = m[3] ? parseInt(m[3], 10) : undefined;
    if (mon) return { day, month: mon, year };
  }
  return null;
}

function findFirstPlaceWinner(html: string): { name: string; url?: string } | null {
  const $ = cheerio.load(html);
  // Try explicit POS column
  let row: cheerio.Cheerio<any> | null = null;
  $("table tr").each((_, tr) => {
    const tds = $(tr).find("td");
    const posText = $(tds[0]).text().trim();
    if (posText === "1" && !row) {
      row = $(tr);
    }
  });
  if (!row) {
    row = $("table tr").eq(1); // header + first data row
  }
  if (!row || row.length === 0) return null;
  const link = row.find('a[href*="rider.php"]').first();
  const name = link.text().trim() || row.text().trim().split("\n")[0];
  const url = link.attr("href");
  return { name, url: url ? (url.startsWith("http") ? url : `${FIRSTCYCLING_BASE}/${url.replace(/^\//, "")}`) : undefined };
}

function tryRaceSingleDayWinner(html: string, birthdayIso: string, raceUrl?: string): Omit<WinnerResult, "categoryT"> | null {
  const info = extractSingleDayFromInfo(html);
  if (!info) return null;
  const { month, day } = getMonthDayFromISO(birthdayIso);
  if (info.month === month && info.day === day) {
    const winner = findFirstPlaceWinner(html);
    if (winner) {
      // Year may be the info.year or parsed elsewhere
      let editionYear = info.year ?? new Date(birthdayIso).getUTCFullYear();
      return {
        raceName: cheerio.load(html)("h1").first().text().trim() || "Race",
        raceUrl: raceUrl || "",
        editionYear,
        date: new Date(new Date(birthdayIso).setUTCFullYear(editionYear)).toISOString().slice(0, 10),
        winner: winner.name,
        winnerUrl: winner.url,
      };
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const birthday = searchParams.get("birthday");
  const debug = searchParams.get("debug") === "1";
  const isVercel = !!process.env.VERCEL;
  const hasWsEndpoint = !!process.env.PLAYWRIGHT_WS_ENDPOINT;

  if (!birthday) {
    return NextResponse.json({ error: "Missing birthday" }, { status: 400 });
  }

  // Choose season year: explicit ?year=YYYY or fall back to the birthday's year
  const yearParam = searchParams.get("year");
  const birthdayYear = new Date(birthday).getUTCFullYear();
  const targetYear = yearParam && /^\d{4}$/.test(yearParam) ? parseInt(yearParam, 10) : birthdayYear;
  const ts = Array.from({ length: 24 }, (_, i) => i + 1);

  const results: WinnerResult[] = [];
  const raceLinksByCategory: Record<number, string[]> = {};
  let racePagesVisited = 0;
  const visitedRaceUrls: string[] = [];
  const calendarLog: Array<{ t: number; status: number; ok: boolean; viaProxy: boolean; linkCount: number }> = [];
  const raceFetchLog: Array<{ url: string; status: number; ok: boolean; viaProxy: boolean }> = [];

  // If on Vercel and no remote browser endpoint is configured, fail fast with guidance
  if (isVercel && !hasWsEndpoint) {
    return NextResponse.json(
      {
        error: "Playwright remote browser not configured",
        hint: "Set PLAYWRIGHT_WS_ENDPOINT in Vercel env to a remote Chrome/CDP endpoint (e.g. Browserless)",
      },
      { status: 503 }
    );
  }

  // Use the helper to run the whole scrape inside a single browser session
  try {
    await withBrowser(async (sharedPage) => {
      for (const t of ts) {
        const url = `${FIRSTCYCLING_BASE}/race.php?y=${targetYear}&t=${t}`;
        try {
          let raceLinks: string[] = [];
          await sharedPage.goto(url, { waitUntil: "domcontentloaded" });
          await sharedPage.waitForTimeout(300);
          const hrefs = await sharedPage.$$eval("a", (as) =>
            as.map((a) => (a as HTMLAnchorElement).getAttribute("href") || "").filter(Boolean)
          );
          raceLinks = hrefs.filter((h) => isRaceDetailHref(h)).map((h) => absolutize(h));

          // Fallback to HTTP/proxy if empty
          let status = 200;
          let ok = true;
          let viaProxy = false;
          if (!raceLinks.length) {
            const cal = await fetchHtmlSmart(url);
            status = cal.status;
            ok = cal.ok;
            viaProxy = cal.viaProxy;
            let parsed = cal.ok ? parseRaceCalendar(cal.text) : [];
            if (!parsed.length) {
              const rx = /href=\"([^\"]*race\.php[^\"]*)\"/gi;
              const found = new Set<string>();
              let m: RegExpExecArray | null;
              while ((m = rx.exec(cal.text))) {
                const href = m[1];
                if (isRaceDetailHref(href)) found.add(absolutize(href));
              }
              parsed = Array.from(found);
            }
            raceLinks = parsed;
          }

          raceLinks = raceLinks.slice(0, 50);
          raceLinksByCategory[t] = raceLinks;
          calendarLog.push({ t, status, ok, viaProxy, linkCount: raceLinks.length });

          for (const raceUrl of raceLinks) {
            try {
              visitedRaceUrls.push(raceUrl);
              await sharedPage.goto(raceUrl, { waitUntil: "domcontentloaded" });
              await sharedPage.waitForTimeout(300);
              const html = await sharedPage.content();
              raceFetchLog.push({ url: raceUrl, status: 200, ok: true, viaProxy: false });
              let parsed = parseRaceWinnerForDate(html, birthday, raceUrl);
              if (!parsed) parsed = tryRaceSingleDayWinner(html, birthday, raceUrl);
              racePagesVisited += 1;
              if (parsed) {
                results.push({ ...parsed, categoryT: t });
              }
              await sleep(80);
            } catch (e) {
              const resp = await fetchHtmlSmart(raceUrl);
              raceFetchLog.push({ url: raceUrl, status: resp.status, ok: resp.ok, viaProxy: resp.viaProxy });
              if (resp.ok && !looksBlocked(resp.text)) {
                let parsed = parseRaceWinnerForDate(resp.text, birthday, raceUrl);
                if (!parsed) parsed = tryRaceSingleDayWinner(resp.text, birthday, raceUrl);
                racePagesVisited += 1;
                if (parsed) results.push({ ...parsed, categoryT: t });
              }
            }
          }
        } catch (e) {
          // ignore category errors
        }
        await sleep(120);
      }
    });
  } catch (err: any) {
    const message = err?.message || String(err);
    const body: Record<string, unknown> = { error: "Internal error" };
    if (debug) {
      body.details = message;
      body.flags = { isVercel, hasWsEndpoint };
    }
    return NextResponse.json(body, { status: 500 });
  }

  // Deduplicate by raceUrl + date + winner
  const key = (r: WinnerResult) => `${r.raceUrl}|${r.date}|${r.winner}`;
  const dedup = Array.from(new Map(results.map((r) => [key(r), r])).values());

  // Sort by category then race name
  dedup.sort((a, b) => a.categoryT - b.categoryT || a.raceName.localeCompare(b.raceName));

  return NextResponse.json({
    results: dedup,
    meta: {
      year: targetYear,
      categoriesTried: ts.length,
      racePagesVisited,
      raceLinksByCategory,
      visitedRaceUrls,
      calendarUrlsTried: ts.map((cat) => `${FIRSTCYCLING_BASE}/race.php?y=${targetYear}&t=${cat}`),
      calendarLog,
      raceFetchLog,
      flags: { isVercel, hasWsEndpoint },
    },
  });
}


