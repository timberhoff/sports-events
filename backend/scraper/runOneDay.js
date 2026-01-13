import { scrapeJalgpallCalendarDay } from "./jalgpallCalendar.js";

const dateStr = process.argv[2] || "25.01.2026";

const events = await scrapeJalgpallCalendarDay(dateStr);
console.log(JSON.stringify(events, null, 2));
console.log("Count:", events.length);