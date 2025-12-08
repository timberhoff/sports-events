import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto("https://www.estlatbl.com/et/mangud", {
    waitUntil: "networkidle2",
    timeout: 60000
  });

  const rows = await page.$$eval(
    "table.standings.scheduleAndResults tbody tr",
    trs => trs.map(tr => tr.innerText.split("\n"))
  );

  console.log("=== RAW ROWS ===");
  console.log(rows.slice(0, 5));   // just print first 5 rows

  await browser.close();
})();
