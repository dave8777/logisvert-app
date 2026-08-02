// Prix de base installé (par appareil), indexé par l'id de GREE_OPTIONS
// (voir lib/gree-options.ts). L'outil affiche une fourchette de
// base ± RANGE_MARGIN, confirmée ensuite par une visite sur place.
//
// TODO: remplir avec les prix réels de Groupe DPSD. Tant qu'un id n'est pas
// listé ici, l'outil répond « estimation à confirmer » et l'équipe rappelle
// le client.
//
// Exemple :
//   "charmo-murale-12": 5000,   // affichera 4 500 $ – 5 500 $
export const BASE_PRICES: Record<string, number> = {};

// Marge appliquée de part et d'autre du prix de base, en dollars.
export const RANGE_MARGIN = 500;
