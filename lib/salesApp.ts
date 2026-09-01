// Liaison avec l'app de vente (sales.dpsdair.ca) :
//  - salesBusySlots : les créneaux où Matt est déjà occupé (calendrier GHL,
//    calendrier Google partagé et rendez-vous déjà importés) — pour que le
//    site ne propose JAMAIS un créneau en conflit (double réservation =
//    perte de crédibilité).
//  - pushLeadToSales : dépose une demande d'estimation directement dans les
//    « Web leads » de l'app de vente, au lieu de vivre seulement ici.
// Tout est best-effort : une panne de l'app de vente ne bloque jamais un
// client. Config : SALES_SYNC_URL (vars) + SALES_LEAD_KEY (secret).

type SalesEnv = {
  SALES_SYNC_URL?: string;
  SALES_LEAD_KEY?: string;
};

function salesConfig(env: SalesEnv): { url: string; key: string } {
  return {
    url: (env.SALES_SYNC_URL ?? "").trim().replace(/\/+$/, ""),
    key: (env.SALES_LEAD_KEY ?? "").trim(),
  };
}

export async function salesBusySlots(
  env: SalesEnv,
  days = 14
): Promise<{ busy: Set<string>; error: string }> {
  const { url, key } = salesConfig(env);
  if (!url || !key) {
    return { busy: new Set(), error: "sales app not configured" };
  }
  try {
    const r = await fetch(`${url}/api/virtual/busy?days=${days}`, {
      headers: { "x-lead-key": key },
      signal: AbortSignal.timeout(6000),
    });
    const data = (await r.json()) as { ok?: boolean; busy?: string[] };
    if (!data.ok || !Array.isArray(data.busy)) {
      return { busy: new Set(), error: "busy feed refused" };
    }
    // entrées « YYYY-MM-DD HH:MM » — début de chaque créneau occupé de 30 min
    return { busy: new Set(data.busy), error: "" };
  } catch (e) {
    return { busy: new Set(), error: String(e).slice(0, 120) };
  }
}

export async function pushLeadToSales(
  env: SalesEnv,
  lead: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    postal?: string;
    notes?: string;
    source?: string;
  }
): Promise<void> {
  const { url, key } = salesConfig(env);
  if (!url || !key || !lead.name) return;
  try {
    await fetch(`${url}/api/leads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-lead-key": key,
      },
      body: JSON.stringify({
        name: lead.name,
        phone: lead.phone ?? "",
        email: lead.email ?? "",
        address: lead.address ?? "",
        city: lead.city ?? "",
        postal: lead.postal ?? "",
        message: lead.notes ?? "",
        source: lead.source ?? "logisvert-app",
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    // best-effort : la demande est déjà stockée ici et envoyée par courriel
  }
}
