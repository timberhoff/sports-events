import * as cheerio from "cheerio";
import db from "../db.js";
import fs from "fs/promises";
import crypto from "crypto";

const SCHEDULE_URL = "https://www.basket.ee/et/ajakava-ja-tulemused?action=schedule";

// Optional: keep only these leagues (Estonian fragments).
// Leave empty [] to store everything and filter later.
const LEAGUE_ALLOWLIST = [
/*   "Estonian-Latvian Basketball League", // matches basket.ee output
  "Korvpalli Meistriliiga",
  "Naiste Korvpalli Meistriliiga",
  "Meeste Karikavõistlused",
  "Koondis", */
];

function makeScheduleUrl(page) {
  // page 0 is the base URL (no page param)
  if (page === 0) return SCHEDULE_URL;
  return `${SCHEDULE_URL}&page=${page}`;
}

function normalizeWhitespace(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}
function findLeagueForTable($, $table) {
  const bad = (t) => {
    const s = normalizeWhitespace(t);
    if (!s) return true;
    if (s.length < 4 || s.length > 140) return true;
    if (/ajakava/i.test(s)) return true; // "Ajakava ja tulemused" etc.
    if (s.includes("var ") || s.includes("{") || s.includes(";")) return true;
    return false;
  };

  const looksLikeLeague = (t) =>
    /(liiga|meistriliiga|karikavõistl|koondis|eesti|läti|optibet|naiste|meeste)/i.test(t);

  // 1) search upward: parent containers often include the league title
  let cur = $table;
  for (let i = 0; i < 10; i++) {
    cur = cur.parent();
    if (!cur || !cur.length) break;

    const h = normalizeWhitespace(cur.find("h1,h2,h3,h4,strong").first().text());
    if (!bad(h) && looksLikeLeague(h)) return h;

    // sometimes it's in a div/span with title-ish class
    const titleish = normalizeWhitespace(
      cur.find("[class*='title'],[class*='header'],[class*='league'],[class*='competition']")
        .first()
        .text()
    );
    if (!bad(titleish) && looksLikeLeague(titleish)) return titleish;
  }

  // 2) fallback: nearest previous headings
  const prev = normalizeWhitespace($table.prevAll("h1,h2,h3,h4,strong").first().text());
  if (!bad(prev) && looksLikeLeague(prev)) return prev;

  return null;
}

// Common formats seen on Estonian sports sites:
// - dd.mm.yyyy
// - dd.mm.yyyy, HH:MM
// - dd.mm HH:MM (sometimes year missing)
function parseDateAndTime(text) {
  const t = normalizeWhitespace(text);

  // dd.mm.yyyy, HH:MM
  let m = t.match(/(\d{2})\.(\d{2})\.(\d{4}).*?(\d{2}:\d{2})/);
  if (m) {
    const [, dd, mm, yyyy, time] = m;
    return { date: `${yyyy}-${mm}-${dd}`, time };
  }

  // dd.mm.yyyy
  m = t.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return { date: `${yyyy}-${mm}-${dd}`, time: null };
  }

  // dd.mm HH:MM (assume current year)
  m = t.match(/(\d{2})\.(\d{2}).*?(\d{2}:\d{2})/);
  if (m) {
    const [, dd, mm, time] = m;
    const yyyy = new Date().getFullYear();
    return { date: `${yyyy}-${mm}-${dd}`, time };
  }

  return { date: null, time: null };
}

function extractTeamNameAndCode(s) {
  const text = normalizeWhitespace(s);
  if (!text) return { name: null, code: null };

  // Case A: space-separated code (best)
  let m = text.match(/^(.*?)(?:\s+([A-ZÕÄÖÜ]{2,6}))$/);
  if (m) {
    const name = normalizeWhitespace(m[1]);
    const code = normalizeWhitespace(m[2]);
    if (name.length >= 3) return { name, code };
  }

  // Case B: glued code: "...PärnuPRN" or "...CramoKAL"
  m = text.match(/^(.*?)([A-ZÕÄÖÜ]{2,6})$/);
  if (m) {
    const name = normalizeWhitespace(m[1]);
    const code = normalizeWhitespace(m[2]);
    if (name.length >= 3) return { name, code };
  }

  return { name: text, code: null };
}



function buildExternalId({ league, basketGameId, date, homeCode, awayCode, homeName, awayName }) {
  const base = [
    league || "unknown",
    basketGameId || "nogameid",
    date || "nodate",
    homeCode || homeName || "home",
    awayCode || awayName || "away",
  ].join("|");

  // 40 chars, deterministic, safe for UNIQUE
  return crypto.createHash("sha1").update(base, "utf8").digest("hex");
}


function allowedLeague(league) {
  if (!LEAGUE_ALLOWLIST.length) return true;
  const l = (league || "").toLowerCase();
  return LEAGUE_ALLOWLIST.some((frag) => l.includes(frag.toLowerCase()));
}
function toDb(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string" || typeof v === "number") return v;
  return String(v);
}


async function scrapeBasketEeSchedule() {
  const MAX_PAGE = 6;

  let inserted = 0;
  let skipped = 0;

  for (let page = 0; page <= MAX_PAGE; page++) {
    const url = makeScheduleUrl(page);
    console.log("Fetching page:", page, url);

    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        "Accept-Language": "et-EE,et;q=0.9,en;q=0.8",
      },
    });

    if (!res.ok) {
      console.log(`Skipping page ${page} due to HTTP ${res.status}`);
      continue;
    }

    const html = await res.text();

    if (page === 0) {
      await fs.writeFile("./basketee_schedule_snapshot.html", html, "utf-8");
      console.log("Saved HTML snapshot: basketee_schedule_snapshot.html");
    }

    const $ = cheerio.load(html);
    const tables = $("table").toArray();

    console.log("Found tables on page", page, ":", tables.length);

    for (const table of tables) {
      const $table = $(table);
      const league = findLeagueForTable($, $table);

      const rows = $table.find("tbody tr").toArray();
      for (const tr of rows) {
        const $tr = $(tr);

        const gidTitle = normalizeWhitespace($tr.find("td.gameID").attr("title")) || null;
        const basketGameId =
          gidTitle ||
          (normalizeWhitespace($tr.find("td.gameID").text()).match(/\d+/) || [null])[0];

        const dateText = normalizeWhitespace(
          $tr.find("td.dateAndTimeTd .dateAndTime").text()
        );
        const { date, time } = parseDateAndTime(dateText);

        const venueRaw =
          normalizeWhitespace($tr.find("td.dateAndTimeTd .arena").text()) || null;

        const homeName =
          normalizeWhitespace($tr.find("td.homeTeam .homeTeamNameDesktop").text()) || null;
        const homeCode =
          normalizeWhitespace($tr.find("td.homeTeam .homeTeamNameMobile").text()) || null;

        const awayName =
          normalizeWhitespace($tr.find("td.awayTeam .visitorTeamNameDesktop").text()) || null;
        const awayCode =
          normalizeWhitespace($tr.find("td.awayTeam .visitorTeamNameMobile").text()) || null;

        const finalLeague =
          normalizeWhitespace($tr.find("td.competition").text()) || league || null;

        const broadcast =
          normalizeWhitespace($tr.find("td.broadcast img").attr("title")) || null;

        const onclick = $tr.find("td.gameID").attr("onclick") || "";
        const mm = onclick.match(/doRedirectGame\('([^']+)'\)/);
        const federation_link = mm ? mm[1] : SCHEDULE_URL;

        if (!allowedLeague(finalLeague)) {
  if (skipped < 20) console.log("SKIP league:", finalLeague);
  skipped++;
  continue;
}

if (!homeName || !awayName || !date) {
  if (skipped < 20) console.log("SKIP missing:", { homeName, awayName, dateText });
  skipped++;
  continue;
}


        const external_id = buildExternalId({
          league: finalLeague,
          basketGameId,
          date,
          homeCode,
          awayCode,
          homeName,
          awayName,
        });

        try {
          await db.query(
            `
            INSERT INTO raw_basketball_events2
              (source, league, basket_game_id, external_id, date, time,
               raw_venue, raw_city,
               home_team_name, home_team_code,
               away_team_name, away_team_code,
               federation_link, federation_name, broadcast)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              scraped_at = CURRENT_TIMESTAMP,
              league = VALUES(league),
              basket_game_id = VALUES(basket_game_id),
              raw_venue = VALUES(raw_venue),
              home_team_name = VALUES(home_team_name),
              home_team_code = VALUES(home_team_code),
              away_team_name = VALUES(away_team_name),
              away_team_code = VALUES(away_team_code),
              federation_link = VALUES(federation_link),
              broadcast = VALUES(broadcast)
            `,
            [
              "basketee",
              toDb(finalLeague),
              toDb(basketGameId),
              toDb(external_id),
              toDb(date),
              toDb(time),
              toDb(venueRaw),
              null,
              toDb(homeName),
              toDb(homeCode),
              toDb(awayName),
              toDb(awayCode),
              toDb(federation_link),
              "Eesti Korvpalliliit",
              toDb(broadcast),
            ]
          );

          inserted++;
        } catch (err) {
          console.error("DB insert error:", err?.code || err);
          skipped++;
        }
      }
    }
  }

  console.log(`DONE. Inserted=${inserted}, Skipped=${skipped}`);
}





scrapeBasketEeSchedule().catch((err) => {
  console.error("SCRAPE FAILED:", err);
  process.exit(1);
});
