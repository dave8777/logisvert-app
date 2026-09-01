# Site d'estimation DPSD (app.dpsdair.ca)

Next.js déployé sur Cloudflare Workers via OpenNext. Stockage : R2 (`UPLOADS`).

## Mise en ligne

**Pousser du code ne met rien en ligne par lui-même.** Le site ne change
qu'une fois wrangler exécuté.

Deux façons :

1. **Automatique (recommandé)** — `.github/workflows/deploy.yml` déploie à
   chaque fusion dans `main`. Réglage unique, décrit plus bas.
2. **À la main** — double-cliquer `deploy.bat` sur le poste Windows.

### Réglage unique de l'automatisation

À faire une seule fois par le propriétaire du compte Cloudflare ; ensuite
tout se déploie sans intervention.

1. Cloudflare → **My Profile** → **API Tokens** → *Create Token* →
   modèle **Edit Cloudflare Workers**. Copier le jeton (affiché une fois).
2. GitHub → le dépôt → **Settings** → **Secrets and variables** →
   **Actions** → *New repository secret* :
   - nom : `CLOUDFLARE_API_TOKEN`, valeur : le jeton copié.
   - si le compte Cloudflare en contient plusieurs, ajouter aussi
     `CLOUDFLARE_ACCOUNT_ID`.

Le jeton vit uniquement dans les secrets GitHub : il n'apparaît ni dans le
code, ni dans les journaux de déploiement.

Le workflow refuse de déployer si le code ne compile pas — le site en
ligne n'est jamais remplacé par une version cassée. L'onglet **Actions**
du dépôt montre chaque déploiement et son résultat.

## Configuration (Cloudflare)

| Clé | Où | Rôle |
| --- | --- | --- |
| `SALES_SYNC_URL` | `vars` | app de vente à prévenir |
| `SALES_LEAD_KEY` | secret | clé partagée avec l'app de vente |
| `ADMIN_KEY` | secret | protège `/api/admin/*` |
| `RESEND_API_KEY` | secret | envoi des courriels |
| `GOOGLE_PLACES_API_KEY` | secret | avis Google |

Secrets : `npx wrangler secret put NOM`.

## Lien avec l'app de vente

Les demandes d'estimation (`submissions/`) et les rendez-vous virtuels
(`virtual/`) sont servis ensemble par `/api/admin/virtual-list`, sous une
forme unique. L'app de vente les importe dans ses **estimations
virtuelles** avec photos et OCR ; le site la réveille via
`/api/leads/sync-cloud` après chaque demande.
