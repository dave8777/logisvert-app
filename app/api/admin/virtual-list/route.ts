import { getCloudflareContext } from "@opennextjs/cloudflare";

// Liste que l'app de vente importe dans ses « estimations virtuelles ».
//
// Deux sources, une seule sortie :
//   virtual/     — rendez-vous virtuels réservés en ligne (avec créneau)
//   submissions/ — demandes d'estimation du site (sans créneau)
//
// Les deux sont normalisées à la MÊME forme, celle que _import_cloud_lead
// attend déjà côté app de vente (id, contact, photos, notes, lang,
// submittedAt, unitType). L'app de vente n'a donc RIEN à changer : les
// demandes d'estimation arrivent d'elles-mêmes dans la liste, au lieu de
// dormir dans le tableau de bord admin.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";

  const { env } = getCloudflareContext();

  if (!env.ADMIN_KEY) {
    return Response.json(
      { ok: false, error: "ADMIN_KEY non configurée sur le worker." },
      { status: 500 }
    );
  }
  if (key !== env.ADMIN_KEY) {
    return Response.json({ ok: false, error: "Accès refusé." }, { status: 403 });
  }
  if (!env.UPLOADS) {
    return Response.json(
      { ok: false, error: "Stockage non configuré." },
      { status: 500 }
    );
  }

  // Les 200 derniers record.json d'un préfixe, du plus récent au plus ancien.
  async function recentRecords(prefix: string): Promise<CloudRecord[]> {
    const recordKeys: string[] = [];
    let cursor: string | undefined = undefined;
    do {
      const page = await env.UPLOADS.list({ prefix, limit: 1000, cursor });
      for (const obj of page.objects) {
        if (obj.key.endsWith("/record.json")) recordKeys.push(obj.key);
      }
      cursor = page.truncated ? page.cursor : undefined;
    } while (cursor);

    recordKeys.sort().reverse();
    const out: CloudRecord[] = [];
    for (const keyName of recordKeys.slice(0, 200)) {
      const obj = await env.UPLOADS.get(keyName);
      if (!obj) continue;
      try {
        out.push(JSON.parse(await obj.text()) as CloudRecord);
      } catch {
        // ignore malformed records
      }
    }
    return out;
  }

  const booked = await recentRecords("virtual/");
  const requests = (await recentRecords("submissions/")).map(asVirtualShape);

  // Rendez-vous réservés en tête (prochain créneau d'abord), puis les
  // demandes sans créneau, de la plus récente à la plus ancienne.
  booked.sort((a, b) =>
    `${a.slot?.date ?? ""} ${a.slot?.time ?? ""}`.localeCompare(
      `${b.slot?.date ?? ""} ${b.slot?.time ?? ""}`
    )
  );
  requests.sort((a, b) =>
    (b.submittedAt ?? "").localeCompare(a.submittedAt ?? "")
  );

  const records = [...booked, ...requests];
  return Response.json({ ok: true, count: records.length, records });
}

type CloudRecord = {
  id?: string;
  submittedAt?: string;
  lang?: string;
  notes?: string | null;
  unitType?: string;
  source?: string;
  slot?: { date?: string; time?: string };
  selection?: {
    systemType?: string;
    label?: string;
    installationType?: string;
  };
};

// Une demande d'estimation prend la forme d'un rendez-vous virtuel SANS
// créneau. L'importateur de l'app de vente lit alors une réunion vide et
// n'essaie pas de créer de lien Meet — exactement ce qu'on veut, puisqu'il
// n'y a pas encore de rendez-vous fixé.
function asVirtualShape(rec: CloudRecord): CloudRecord {
  const bits = [
    "Demande d'estimation du site (aucun rendez-vous fixé).",
    rec.selection?.label,
    rec.selection?.installationType,
    rec.notes,
  ].filter(Boolean);

  return {
    ...rec,
    // « murale » / « centrale » : même vocabulaire que les rendez-vous.
    unitType: rec.selection?.systemType ?? "murale",
    notes: bits.join(" · "),
    source: "estimate-request",
  };
}
