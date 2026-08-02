import { GREE_OPTIONS } from "../../../lib/gree-options";

// Montant de subvention LogisVert par unité, indexé par numéro AHRI.
// TODO: remplir avec les montants réels du barème LogisVert.
// Tant qu'un AHRI n'est pas listé ici, l'API répond `pending: true` et le
// calculateur affiche « montant à confirmer » plutôt qu'un faux 0 $.
const REBATES: Record<string, number> = {
  // "215386290": 0,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const ahri = searchParams.get("ahri");
  const installationDate =
    searchParams.get("installationDate") ??
    new Date().toISOString().slice(0, 10);
  const quantity = Math.max(1, Number(searchParams.get("quantity") ?? "1") || 1);

  if (!ahri) {
    return Response.json(
      { ok: false, error: "Paramètre 'ahri' manquant." },
      { status: 400 }
    );
  }

  const option = GREE_OPTIONS.find((item) => item.ahri === ahri);

  if (!option) {
    return Response.json(
      { ok: false, error: `Aucun système trouvé pour l'AHRI ${ahri}.` },
      { status: 404 }
    );
  }

  const perUnit = REBATES[ahri];

  if (perUnit === undefined) {
    return Response.json({
      ok: true,
      pending: true,
      amount: null,
      ahri,
      quantity,
      installationDate,
      source: "Barème Groupe DPSD",
    });
  }

  return Response.json({
    ok: true,
    pending: false,
    amount: perUnit * quantity,
    perUnit,
    ahri,
    quantity,
    installationDate,
    source: "Barème Groupe DPSD",
  });
}
