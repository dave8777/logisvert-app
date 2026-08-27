// Degrés-jours base 18 °C pour le secteur desservi (West Island, Vaudreuil,
// Lachine) — station de référence Montréal-Trudeau, au centre du territoire.
//
// Les normales ci-dessous servent de fond de carte : elles décrivent une
// année « ordinaire ». Quand on connaît l'année facturée du client, la route
// /api/degree-days va chercher la météo réellement observée et on ramène sa
// consommation de chauffage à une année normale — sinon un hiver froid ferait
// gonfler les économies annoncées.

export const DEGREE_DAY_BASE = 18;

export const STATION = {
  lat: 45.47,
  lon: -73.74,
  label: "Montréal-Trudeau",
  timezone: "America/Toronto",
};

// Normales mensuelles (°C-jours), janvier → décembre.
export const MONTHLY_HDD_NORMAL = [
  820, 715, 590, 345, 145, 35, 5, 10, 75, 260, 460, 730,
];
export const MONTHLY_CDD_NORMAL = [0, 0, 0, 0, 5, 40, 95, 75, 15, 0, 0, 0];

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export type DegreeDays = {
  monthlyHdd: number[];
  monthlyCdd: number[];
  annualHdd: number;
  annualCdd: number;
  source: "normals" | "observed";
  year: number | null;
};

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function normalDegreeDays(): DegreeDays {
  return {
    monthlyHdd: [...MONTHLY_HDD_NORMAL],
    monthlyCdd: [...MONTHLY_CDD_NORMAL],
    annualHdd: sum(MONTHLY_HDD_NORMAL),
    annualCdd: sum(MONTHLY_CDD_NORMAL),
    source: "normals",
    year: null,
  };
}

export const ANNUAL_HDD_NORMAL = sum(MONTHLY_HDD_NORMAL);
export const ANNUAL_CDD_NORMAL = sum(MONTHLY_CDD_NORMAL);

/**
 * Températures moyennes quotidiennes (ISO « 2025-01-31 » + °C) → degrés-jours
 * mensuels. Une année incomplète (l'année en cours) est complétée par les
 * normales des mois manquants, sinon elle paraîtrait douce.
 */
export function degreeDaysFromDailyMeans(
  dates: string[],
  means: (number | null)[],
  year: number
): DegreeDays {
  const monthlyHdd = new Array(12).fill(0);
  const monthlyCdd = new Array(12).fill(0);
  const daysSeen = new Array(12).fill(0);

  for (let i = 0; i < dates.length; i += 1) {
    const mean = means[i];
    if (mean === null || mean === undefined || !Number.isFinite(mean)) continue;
    const month = Number.parseInt(dates[i].slice(5, 7), 10) - 1;
    if (month < 0 || month > 11) continue;
    daysSeen[month] += 1;
    if (mean < DEGREE_DAY_BASE) monthlyHdd[month] += DEGREE_DAY_BASE - mean;
    else monthlyCdd[month] += mean - DEGREE_DAY_BASE;
  }

  for (let m = 0; m < 12; m += 1) {
    if (daysSeen[m] === 0) {
      // Mois absent des données : on prend la normale.
      monthlyHdd[m] = MONTHLY_HDD_NORMAL[m];
      monthlyCdd[m] = MONTHLY_CDD_NORMAL[m];
    } else if (daysSeen[m] < DAYS_IN_MONTH[m]) {
      // Mois partiel : on l'étire au mois complet.
      const factor = DAYS_IN_MONTH[m] / daysSeen[m];
      monthlyHdd[m] *= factor;
      monthlyCdd[m] *= factor;
    }
    monthlyHdd[m] = Math.round(monthlyHdd[m]);
    monthlyCdd[m] = Math.round(monthlyCdd[m]);
  }

  return {
    monthlyHdd,
    monthlyCdd,
    annualHdd: sum(monthlyHdd),
    annualCdd: sum(monthlyCdd),
    source: "observed",
    year,
  };
}

/** Écart de l'année observée par rapport à une année normale. */
export function weatherRatio(degreeDays: DegreeDays): number {
  if (degreeDays.annualHdd <= 0) return 1;
  return ANNUAL_HDD_NORMAL / degreeDays.annualHdd;
}
