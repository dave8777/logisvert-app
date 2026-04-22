import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEARCH_URL =
  "https://www.hydroquebec.com/residentiel/mieux-consommer/aides-financieres/logisvert/recherche-themopompes-efficaces.html";

function todayLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

function normalizeAhri(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

function extractMoney(text: string): string | null {
  const patterns = [
    /Aide financière\s*[:\-]?\s*([0-9\s]+,?[0-9]*\s*\$)/i,
    /([0-9\s]+,?[0-9]*\s*\$)\s*(?:d’aide financière|aide financière)/i,
    /\b([0-9\s]{2,},[0-9]{2}\s*\$)\b/,
    /\b([0-9\s]{2,}\s*\$)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\s+/g, " ").trim();
    }
  }

  return null;
}

function extractAfterLabel(lines: string[], label: string): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith(label)) {
      const remainder = line.slice(label.length).trim().replace(/^[:\s]+/, "");
      if (remainder) return remainder;
      if (lines[i + 1]) return lines[i + 1];
    }
  }
  return null;
}

function parseVisibleText(ahri: string, installationDate: string, text: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return {
    ahri,
    installation_date: installationDate,
    found: !/aucun résultat|aucune thermopompe|introuvable/i.test(text),
    subsidy_amount: extractMoney(text),
    brand: extractAfterLabel(lines, "Marque"),
    outdoor_model:
      extractAfterLabel(lines, "Modèle de l’appareil extérieur") ||
      extractAfterLabel(lines, "Modèle de l'appareil extérieur"),
    indoor_model: extractAfterLabel(lines, "Modèle intérieur"),
    furnace_model: extractAfterLabel(lines, "Modèle de la fournaise"),
    heating_capacity_minus8c: extractAfterLabel(lines, "Puissance de chauffage (-8 °C)"),
    energy_star_unique_model: extractAfterLabel(lines, "Numéro de modèle unique ENERGY STAR"),
    raw_text: text.slice(0, 4000),
  };
}

async function dismissCookieBanner(page: any) {
  const selectors = [
    "button:has-text('Accepter')",
    "button:has-text('Tout accepter')",
    "button:has-text('J’accepte')",
    "button:has-text('OK')",
  ];

  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1200 })) {
        await el.click();
        return;
      }
    } catch {}
  }
}

async function fillFirstVisible(page: any, selectors: string[], value: string) {
  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if ((await el.count()) > 0 && (await el.isVisible({ timeout: 1200 }))) {
        await el.fill(value);
        return true;
      }
    } catch {}
  }
  return false;
}

async function clickFirstVisible(page: any, selectors: string[]) {
  for (const selector of selectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1500 })) {
        await el.click();
        return true;
      }
    } catch {}
  }
  return false;
}

async function collectResultText(page: any) {
  const selectors = ["main", "section", "article", "body"];
  const texts: string[] = [];

  for (const selector of selectors) {
    try {
      const text = await page.locator(selector).first().innerText({ timeout: 2000 });
      if (text) texts.push(text);
    } catch {}
  }

  const best = texts.sort((a, b) => b.length - a.length)[0] || "";
  const markers = ["Aide financière", "Numéro AHRI", "Marque"];

  for (const marker of markers) {
    const index = best.indexOf(marker);
    if (index !== -1) {
      return best.slice(Math.max(0, index - 300), index + 2500);
    }
  }

  return best.slice(0, 3000);
}

async function lookupAhri(ahri: string, installationDate: string) {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({ locale: "fr-CA" });
    page.setDefaultTimeout(20000);

    await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded" });
    await dismissCookieBanner(page);

    const dateFilled = await fillFirstVisible(
      page,
      [
        "input[type='date']",
        "input[aria-label*='Date d\\'installation']",
        "input[placeholder*='AAAA']",
      ],
      installationDate
    );

    if (!dateFilled) {
      return {
        ahri,
        installation_date: installationDate,
        found: false,
        error: "Could not find installation date input.",
      };
    }

    const selectedSituation = await clickFirstVisible(page, [
      "text=Propriétaire Habitation existante",
      "label:has-text('Propriétaire Habitation existante')",
    ]);

    if (!selectedSituation) {
      return {
        ahri,
        installation_date: installationDate,
        found: false,
        error: "Could not select existing home situation.",
      };
    }

    const opened = await clickFirstVisible(page, [
      "button:has-text('Afficher la liste')",
      "text=Afficher la liste",
    ]);

    if (!opened) {
      return {
        ahri,
        installation_date: installationDate,
        found: false,
        error: "Could not open search list.",
      };
    }

    await Promise.race([
      page.locator("text=Numéro AHRI du modèle").first().waitFor({ timeout: 15000 }),
      page.locator("text=Recherche par").first().waitFor({ timeout: 15000 }),
    ]);

    try {
      await page.getByText("Numéro AHRI du modèle", { exact: true }).click();
    } catch {}

    const ahriFilled = await fillFirstVisible(
      page,
      [
        "input[inputmode='numeric']",
        "input[aria-label*='AHRI']",
        "input[placeholder*='7 chiffres']",
        "input[type='text']",
      ],
      ahri
    );

    if (!ahriFilled) {
      return {
        ahri,
        installation_date: installationDate,
        found: false,
        error: "Could not find AHRI input.",
      };
    }

    const submitted = await clickFirstVisible(page, [
      "button:has-text('Rechercher ce numéro')",
      "text=Rechercher ce numéro",
    ]);

    if (!submitted) {
      return {
        ahri,
        installation_date: installationDate,
        found: false,
        error: "Could not submit AHRI search.",
      };
    }

    await Promise.race([
      page.locator("text=Aide financière").first().waitFor({ timeout: 12000 }),
      page.locator("text=Marque").first().waitFor({ timeout: 12000 }),
      page.locator("text=Aucun résultat").first().waitFor({ timeout: 12000 }),
      page.locator("text=Aucune thermopompe").first().waitFor({ timeout: 12000 }),
    ]);

    const rawText = await collectResultText(page);
    return parseVisibleText(ahri, installationDate, rawText);
  } catch (error) {
    return {
      ahri,
      installation_date: installationDate,
      found: false,
      error: error instanceof Error ? error.message : "Unknown lookup error",
    };
  } finally {
    await browser.close();
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ahri = normalizeAhri(url.searchParams.get("ahri") || "");
  const installationDate = url.searchParams.get("date") || todayLocal();

  if (!ahri) {
    return Response.json({ error: "Missing ahri parameter." }, { status: 400 });
  }

  const result = await lookupAhri(ahri, installationDate);

  return Response.json(result, {
    status: result.error ? 502 : 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
