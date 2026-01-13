// backend/scraper/jalgpallCalendar.js
import axios from "axios";
import * as cheerio from "cheerio";

const BASE = "https://jalgpall.ee";

function extractExternalId(matchUrl, dateStr, time, home, away, league) {
  if (matchUrl) {
    const m1 = matchUrl.match(/match_info\/(\d+)/);
    if (m1) return `jalgpall:match_info:${m1[1]}`;

    const m2 = matchUrl.match(/matchinfo\/match\/(\d+)/);
    if (m2) return `jalgpall:koondis_match:${m2[1]}`;

    return `jalgpall:url:${matchUrl}`;
  }

  return `jalgpall:fallback:${dateStr}|${time || ""}|${league || ""}|${home || ""}|${away || ""}`;
}

function absUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return "https:" + href;
  return BASE + href;
}

function clean(s) {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

function parseTime(s) {
  const t = clean(s);
  return /^\d{1,2}:\d{2}$/.test(t) ? t : null;
}

function extractTeamName($team) {
  const a = $team.find("p a").first();
  if (a.length) return clean(a.text());
  const p = $team.find("p").first();
  return clean(p.text()) || null;
}

export async function scrapeJalgpallCalendarDay(dateStr /* "25.01.2026" */) {
  const url = `${BASE}/voistlused/calendar?date=${encodeURIComponent(dateStr)}`;
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      Accept: "text/html,application/xhtml+xml",
    },
    timeout: 30000,
  });

  const $ = cheerio.load(html);
  const events = [];

  $(".calendar-events .block.block-01").each((_, block) => {
    const $block = $(block);

    const leagueName = clean($block.find(".head p a").first().text()) || null;
    const leagueUrl = absUrl($block.find(".head p a").first().attr("href"));
    const roundTag = clean($block.find(".head .tag").first().text()) || null;

    $block.find(".events-list .event-single").each((__, ev) => {
      const $ev = $(ev);
const infoTitles = $ev.find(".info p.title");

const first = infoTitles.eq(0);
const second = infoTitles.eq(1);

const firstText = clean(first.text());
const secondText = clean(second.text());

let time = null;
let venueName = null;
let venueUrl = null;

// If the first title is a time -> venue is second
const maybeTime = parseTime(firstText);

if (maybeTime) {
  time = maybeTime;

  const venueLink = second.find("a").first();
  venueName = clean(venueLink.text()) || secondText || null;
  venueUrl = absUrl(venueLink.attr("href"));
} else {
  // No time shown -> venue is the first title
  time = null;

  const venueLink = first.find("a").first();
  venueName = clean(venueLink.text()) || firstText || null;
  venueUrl = absUrl(venueLink.attr("href"));
}

if (!venueName) venueName = clean($ev.attr("data-field")) || null;


      const teams = $ev.find(".teams .team");
      const homeTeam = extractTeamName(teams.eq(0));
      const awayTeam = extractTeamName(teams.eq(1));

      const matchInfoHref = $ev.find(".actions a.info").attr("href");
      const matchInfoUrl = absUrl(matchInfoHref);

      const ticketHref = $ev.find(".actions a.ticket").attr("href");
      const ticketUrl = absUrl(ticketHref);

      const external_id = extractExternalId(
        matchInfoUrl,
        dateStr,
        time,
        homeTeam,
        awayTeam,
        leagueName
      );

      if (homeTeam || awayTeam) {
        events.push({
          source: "jalgpall.ee",
          sport: "football",
          external_id,
          date: dateStr,
          time,
          league: leagueName,
          round: roundTag,
          home_team: homeTeam,
          away_team: awayTeam,
          venue: venueName,
          venue_url: venueUrl,
          match_url: matchInfoUrl,
          ticket_url: ticketUrl,
          league_url: leagueUrl,
        });
      }
    });
  });

  return events;
}
