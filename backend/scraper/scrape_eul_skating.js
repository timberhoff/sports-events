// backend/scraper/scrape_eul_skating.js
import db from "../db.js";
import * as cheerio from "cheerio";
import crypto from "crypto";

const PAGE_URL =
  "https://www.uisuliit.ee/iluuisutamine/voistlused/eul-kalenderplaan-2025-2026";

const SOURCE = "uisuliit_eul_skating";
const FEDERATION_LINK = "https://www.uisuliit.ee/";

const LEAGUE = "EUL kalenderplaan";
const FEDERATION_NAME = "EUL";
function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function sha1(str) {
  return crypto.createHash("sha1").update(str).digest("hex");
}

function parseDateRange(input) {
  const s = String(input || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Single date: DD.MM.YYYY
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yyyy = Number(m[3]);
    const d = new Date(yyyy, mm - 1, dd);
    return { start: toYMD(d), end: null };
  }

  // Range: "DD.MM.-DD.MM.YYYY"  e.g. 31.01.-01.02.2026
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d1 = Number(m[1]);
    const m1 = Number(m[2]);
    const d2 = Number(m[3]);
    const m2 = Number(m[4]);
    const yyyy = Number(m[5]);

    const start = new Date(yyyy, m1 - 1, d1);
    const end = new Date(yyyy, m2 - 1, d2);

    return { start: toYMD(start), end: toYMD(end) };
  }

  // Range: "DD.-DD.MM.YYYY" or "DD-DD.MM.YYYY"
  m = s.match(/^(\d{1,2})(?:\.)?\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d1 = Number(m[1]);
    const d2 = Number(m[2]);
    const mm = Number(m[3]);
    const yyyy = Number(m[4]);

    const start = new Date(yyyy, mm - 1, d1);
    const end = new Date(yyyy, mm - 1, d2);

    return { start: toYMD(start), end: toYMD(end) };
  }

  // Range: "DD.MM-DD.MM.YYYY"
  m = s.match(/^(\d{1,2})\.(\d{1,2})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d1 = Number(m[1]);
    const m1 = Number(m[2]);
    const d2 = Number(m[3]);
    const m2 = Number(m[4]);
    const yyyy = Number(m[5]);

    const start = new Date(yyyy, m1 - 1, d1);
    const end = new Date(yyyy, m2 - 1, d2);

    return { start: toYMD(start), end: toYMD(end) };
  }

  return { start: null, end: null };
}


function cleanText($el) {
  return $el
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

async function upsertRow(row) {
  await db.query(
    `
    INSERT INTO raw_skating_events
      (
        source,
        league,
        external_id,
        title,
        subtitle,
        raw_venue,
        raw_city,
        organizer,
        date_start,
        date_end,
        federation_link,
        federation_name,
        raw_payload
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      scraped_at = CURRENT_TIMESTAMP,
      title = VALUES(title),
      subtitle = VALUES(subtitle),
      raw_venue = VALUES(raw_venue),
      raw_city = VALUES(raw_city),
      organizer = VALUES(organizer),
      date_start = VALUES(date_start),
      date_end = VALUES(date_end),
      federation_link = VALUES(federation_link),
      federation_name = VALUES(federation_name),
      raw_payload = VALUES(raw_payload)
    `,
    [
      row.source,
      row.league,
      row.external_id,
      row.title,
      row.subtitle,
      row.raw_venue,
      row.raw_city,
      row.organizer,
      row.date_start,
      row.date_end,
      row.federation_link,
      row.federation_name,
      JSON.stringify(row.raw_payload),
    ]
  );
}

async function scrapeEulSkating() {
  const html = await fetchHtml(PAGE_URL);
  const $ = cheerio.load(html);

  const $table =
    $(".table-holder table").first().length > 0
      ? $(".table-holder table").first()
      : $("table").first();

  const $rows = $table.find("tr");

  const scraped = [];
  let skipped = 0;

  $rows.each((_, tr) => {
  const $tds = $(tr).find("td");
  if ($tds.length < 3) return;

  const dateText = cleanText($($tds[0]));

  // ✅ add it RIGHT HERE
  const isHeaderish = !/\d/.test(dateText); // no digits -> not a real date
  if (isHeaderish) return;

  const $titleCell = $($tds[1]);

  const titleLink = $titleCell.find("a").first();
  const title = titleLink.length ? cleanText(titleLink) : cleanText($titleCell);

  const hrefRaw = titleLink.length ? titleLink.attr("href") : null;
  const federationLink = hrefRaw
    ? new globalThis.URL(hrefRaw, PAGE_URL).toString()
    : null;

  const rawVenue = $tds[2] ? cleanText($($tds[2])) : null;
  const organizer = $tds[3] ? cleanText($($tds[3])) : null;
  const subtitle = $tds[4] ? cleanText($($tds[4])) : null;

  const { start, end } = parseDateRange(dateText);

  if (!start) {
    skipped++;
    console.log("BAD DATE:", dateText, "| title:", title);
    return;
  }


    const externalId = federationLink
      ? sha1(`${SOURCE}|${federationLink}`)
      : sha1(
          `${SOURCE}|${dateText}|${title}|${rawVenue || ""}|${organizer || ""}|${subtitle || ""}`
        );

    scraped.push({
      source: SOURCE,
      league: LEAGUE,
      external_id: externalId,
      title,
      subtitle: subtitle || null,
      raw_venue: rawVenue || null,
      raw_city: null,
      organizer: organizer || null,
      date_start: start,
      date_end: end,
      federation_link: FEDERATION_LINK,
      federation_name: FEDERATION_NAME,
      raw_payload: { dateText, title, detailLink: federationLink, rawVenue, organizer, subtitle },
    });
  });

  console.log("Scraped:", scraped.length, "| Skipped:", skipped);

  let upserted = 0;
  for (const row of scraped) {
    await upsertRow(row);
    upserted++;
    console.log(
      "✔",
      row.date_start,
      row.date_end ? `→ ${row.date_end}` : "",
      "|",
      row.title,
      row.subtitle ? `(${row.subtitle})` : ""
    );
  }

  console.log("DONE. Inserted/updated:", upserted);

  if (typeof db.end === "function") await db.end();
}

scrapeEulSkating().catch(async (err) => {
  console.error(err);
  try {
    if (typeof db.end === "function") await db.end();
  } catch {}
  process.exitCode = 1;
});
