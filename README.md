# Shakery

Carnet de création personnel du barman, installé sur son propre PC. Shakery conserve les fiches, fait évoluer les recettes de l'idée à la version finale, note les dégustations, simule l'équilibre d'un mélange et aide à réviser une carte ou un concours. Tout est local et hors ligne : pas de compte, pas de serveur, pas de télémétrie.

Application de bureau Electron, React, Tailwind CSS v4 et TypeScript. Le cahier des charges complet est dans [`docs/SPEC.md`](docs/SPEC.md).

## État d'avancement

| Phase  | Contenu                                                                                                    | État                                   |
| ------ | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 0      | Fondations : projet, durcissement Electron, contrat IPC, CI, instance unique, journaux                     | livrée, validée                        |
| 1      | Données et sauvegarde : SQLite, schéma complet avec l'extension MAF, migrations, référentiels, sauvegardes | livrée                                 |
| 2      | Design system : composants, coquille, raccourcis, palette, accueil vide, icônes, page /dev/kit             | livrée                                 |
| 3      | Ingrédients, bouteilles et fiches : éditeur, versions, variantes, idée rapide, calculs, import `.shakery`  | livrée                                 |
| 4      | Base de départ : 308 ingrédients (Wikidata, Ciqual, rédaction), 102 cocktails IBA, 10 préparations         | livrée, relecture à faire              |
| 5      | Recherche Ctrl+K (plein texte et approchée), fiches réalisables, mode préparation                          | livrée                                 |
| 6 à 11 | Atelier, journal, bar, accueil, export, finitions                                                          | à venir, dans l'ordre de la section 14 |

L'application gère les ingrédients, les bouteilles et les fiches (création, édition, statuts, versions, variantes, idée rapide), calcule volume, degré, sucre, acidité, coût et allergènes, et importe un carnet `.shakery` depuis les paramètres.

## Prérequis

- Node.js 22.12 ou plus récent (testé avec Node 24).
- Windows 10 ou 11 en 64 bits (cible principale) ou macOS.

## Installation

```bash
npm install
```

Si le binaire Electron n'a pas été téléchargé (dossier `node_modules/electron/dist` absent, erreur « Electron failed to install correctly »), lance son installation à la main :

```bash
node node_modules/electron/install.js
```

## Scripts

| Commande              | Rôle                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`         | Lance l'application avec rechargement à chaud. F12 ouvre les outils de développement.                                       |
| `npm run build`       | Construit main, preload et renderer dans `out/`.                                                                            |
| `npm run typecheck`   | Vérifie les types des quatre projets TypeScript (main, renderer, code pur, tests e2e).                                      |
| `npm run lint`        | ESLint avec règles typées et règles de frontière entre processus.                                                           |
| `npm run format`      | Formate le code avec Prettier (`format:check` pour vérifier sans modifier).                                                 |
| `npm test`            | Tests unitaires Vitest.                                                                                                     |
| `npm run test:e2e`    | Construit l'application puis lance les tests Playwright sur Electron.                                                       |
| `npm run check`       | Typage, lint, formatage et tests unitaires, comme la CI.                                                                    |
| `npm run screens`     | Construit l'application puis capture ses écrans principaux dans `test-results/screens`.                                     |
| `npm run perf`        | Génère une base de 5 000 ingrédients, 2 000 fiches et 10 000 notes, puis mesure recherche, ouverture et calcul d'une fiche. |
| `npm run maf:convert` | Convertit les carnets MAF de `imports/maf/` en archive `.shakery` (données personnelles).                                   |
| `npm run dist:win`    | Construit l'installeur NSIS Windows dans `dist/`.                                                                           |
| `npm run dist:mac`    | Construit les DMG macOS (arm64 et x64) dans `dist/`.                                                                        |

Les installeurs ne sont pas signés : Windows SmartScreen affiche un avertissement et macOS bloque une application non notarisée. La signature reste à décider avant toute diffusion publique.

## Architecture en bref

- `src/main/` : processus principal. Fenêtre, sécurité, IPC, et plus tard base SQLite, sauvegardes, export.
- `src/preload/` : expose `window.shakery`, une liste fermée de fonctions dérivée du contrat IPC.
- `src/shared/` : contrat IPC (noms, schémas Zod, types), partagé par tous les processus.
- `src/core/` : logique métier pure, sans Electron, Node ni DOM, réutilisable par la future version téléphone.
- `src/renderer/` : interface React. Toutes les chaînes françaises sont dans `src/renderer/src/i18n/fr.ts`.

Détails : [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Sécurité, point par point : [`docs/SECURITY.md`](docs/SECURITY.md). Décisions prises hors de la spec : [`docs/DECISIONS.md`](docs/DECISIONS.md). Sources des données : [`docs/DATA_SOURCES.md`](docs/DATA_SOURCES.md).

## Dossiers de référence

- `design/` : maquettes de l'accueil et du kit de composants, tokens, logo et police Manrope (licence OFL). Les noms et valeurs visibles dans les maquettes sont fictifs et ne doivent pas se retrouver dans l'application.
- `CLAUDE.md` : consignes de travail pour l'agent de développement.
- `imports/` : fichiers extraits des carnets personnels de l'utilisateur, exclus de git.

## Données et confidentialité

Le carnet sera un fichier SQLite dans le dossier de données de l'application (`userData`), à partir de la phase 1. Aucune donnée ne quitte le PC. La seule fonction réseau prévue, la recherche facultative d'une bouteille par code-barres sur Open Food Facts, sera désactivable.
