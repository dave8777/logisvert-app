import { NextRequest, NextResponse } from "next/server";
import { chromium } from "playwright";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type LookupSuccess = {
  ok: true;
  ahri: string;
  installationDate: string;
  amount: number;
  amountLabel: string;
  rawText: string;
};

type LookupFailure = {
  ok: false;
  ahri: string;
  installationDate: string;
  error: string;
};

const LOGISVERT_URL =
  "https://www.hydroquebec.com/residentiel/mieux-consommer/aides-financieres/logisvert/recherche-themopompes-efficaces.html";

function normalizeMoneyToNumber(text: string): number | null {
  const match = text.match(/(\d{1,3}(?:[ \u00A0]\d{3})*(?:,\d{2})?)\s*\$/);
  if (!match) return null;

  const normalized = match[1]
    .replace(/\u00A0/g, " ")
    .replace(/\s/g, "")
    .replace(",", ".");

  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function extractLikelyAmount(rawText: string): { amount: number | null; amountLabel: string | null } {
  const moneyMatches = [...rawText.matchAll(/(\d{1,3}(?:[ \u00A0]\d{3})*(?:,\d{2})?)\s*\$/g)];

  if (moneyMatches.length === 0) {
    return { amount: null, amountLabel: null };
  }

  // Usually after an AHRI search there is one main assistance amount on the page.
  // We take the highest visible amount in the result zone to avoid grabbing tiny unrelated values.
  const parsed = moneyMatches
    .map((m) => ({
      label: `${m[1]} $`,
      value: Number(m[1].replace(/\u00A0/g, " ").replace(/\s/g, "").replace(",", ".")),
    }))
    .filter((x) => Number.isFinite(x.value))
    .sort((a, b) => b.value - a.value);

  if (parsed.length === 0) {
    return { amount: null, amountLabel: null };
  }

  return {
    amount: parsed[0].value,
    amountLabel: parsed[0].label,
  };
}

async function tryDismissCookieBanner(page: any) {
  const candidates = [
    page.getByRole("button", { name: /accepter/i }),
    page.getByRole("button", { name: /tout accepter/i }),
    page.getByRole("button", { name: /j'accepte/i }),
    page.getByRole("button", { name: /allow all/i }),
  ];

  for (const locator of candidates) {
    try {
      if (await locator.first().isVisible({ timeout: 1200 })) {
        await locator.first().click({ timeout: 1200 });
        return;
      }
    } catch {
      // ignore
    }
  }
}

async function setInstallationCriteria(page: any, installationDate: string) {
  // Best-effort selectors because Hydro may change markup.
  // We explicitly set:
  // - installation date
  // - "Propriétaire Habitation existante"
  // Then click "Afficher la liste"
  const dateInputs = page.locator('input[type="date"], input[placeholder*="date"], input[name*="date"], input[id*="date"]');
  const count = await dateInputs.count();

  if (count > 0) {
    await dateInputs.first().fill(installationDate);
  }

  const ownerExistingText = page.getByText(/Propriétaire\s+Habitation existante/i).first();
  try {
    await ownerExistingText.click({ timeout: 2500 });
  } catch {
    // Sometimes already selected or rendered differently.
  }

  const showListButton = page.getByRole("button", { name: /Afficher la liste/i }).first();
  await showListButton.click({ timeout: 5000 });
}

async function searchByAhri(page: any, ahri: string) {
  // Switch to AHRI mode if needed.
  try {
    await page.getByText(/Numéro AHRI du modèle/i).first().click({ timeout: 3000 });
  } catch {
    // ignore if already visible
  }

  const inputs = page.locator('input[type="text"], input[type="search"], input[inputmode="numeric"]');
  const inputCount = await inputs.count();

  if (inputCount === 0) {
    throw new Error("Impossible de trouver le champ de recherche AHRI sur la page LogisVert.");
  }

  let filled = false;
  for (let i = 0; i < inputCount; i++) {
    const input = inputs.nth(i);
    try {
      await input.fill(ahri, { timeout: 1500 });
      const value = await input.inputValue();
      if (value === ahri) {
        filled = true;
        break;
      }
    } catch {
      // continue
    }
  }

  if (!filled) {
    throw new Error("Impossible de remplir le champ AHRI sur la page LogisVert.");
  }

  const searchButton = page.getByRole("button", { name: /Rechercher ce numéro/i }).first();
  await searchButton.click({ timeout: 5000 });
}

export async function GET(req: NextRequest) {
  const ahri = req.nextUrl.searchParams.get("ahri")?.trim();
  const installationDate =
    req.nextUrl.searchParams.get("installationDate")?.trim() ||
    new Date().toISOString().slice(0, 10);

  if (!ahri) {
    return NextResponse.json<LookupFailure>(
      {
        ok: false,
        ahri: "",
        installationDate,
        error: "Numéro AHRI manquant.",
      },
      { status: 400 }
    );
  }

  let browser: any;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage({
      locale: "fr-CA",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
    });

    await page.goto(LOGISVERT_URL, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    await tryDismissCookieBanner(page);

    await page.getByText(/Outil de recherche de thermopompes/i).waitFor({
      timeout: 15000,
    });

    await setInstallationCriteria(page, installationDate);
    await searchByAhri(page, ahri);

    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);

    const bodyText = await page.locator("body").innerText();

    if (/Aucun résultat|aucune thermopompe|introuvable/i.test(bodyText)) {
      return NextResponse.json<LookupFailure>(
        {
          ok: false,
          ahri,
          installationDate,
          error: `Aucun résultat admissible trouvé pour l'AHRI ${ahri} dans l'outil LogisVert.`,
        },
        { status: 404 }
      );
    }

    const { amount, amountLabel } = extractLikelyAmount(bodyText);

    if (amount == null || !amountLabel) {
      return NextResponse.json<LookupFailure>(
        {
          ok: false,
          ahri,
          installationDate,
          error:
            "La page LogisVert a répondu, mais le montant d'aide financière n'a pas pu être extrait. Aucun montant PDF n'a été utilisé.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json<LookupSuccess>({
      ok: true,
      ahri,
      installationDate,
      amount,
      amountLabel,
      rawText: bodyText.slice(0, 4000),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inconnue durant la recherche LogisVert.";

    return NextResponse.json<LookupFailure>(
      {
        ok: false,
        ahri,
        installationDate,
        error: `Échec de la lecture en direct de LogisVert: ${message}`,
      },
      { status: 502 }
    );
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}
