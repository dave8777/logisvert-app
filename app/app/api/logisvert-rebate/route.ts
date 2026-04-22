import { chromium } from "playwright";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ahri = searchParams.get("ahri");

  if (!ahri) {
    return new Response(JSON.stringify({ error: "Missing AHRI" }), { status: 400 });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    await page.goto("https://www.hydroquebec.com/residentiel/mieux-consommer/aides-financieres/logisvert/recherche-themopompes-efficaces.html");

    // Accept cookies if needed
    try {
      await page.click("button:has-text('Accepter')", { timeout: 3000 });
    } catch {}

    // Fill AHRI
    await page.fill("input", ahri);

    // Click search
    await page.click("button:has-text('Rechercher')");

    await page.waitForTimeout(5000);

    const content = await page.content();

    return new Response(JSON.stringify({ success: true, raw: content.slice(0, 1000) }));
  } catch (e) {
    return new Response(JSON.stringify({ error: "Scrape failed" }), { status: 500 });
  } finally {
    await browser.close();
  }
}
