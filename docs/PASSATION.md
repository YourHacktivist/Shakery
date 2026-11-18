# Passation

Document de reprise du développement par une nouvelle instance. Il complète `CLAUDE.md`, `docs/SPEC.md` (qui prime) et `docs/DECISIONS.md`. Mis à jour le 18 novembre 2026.

## Lire d'abord

1. `CLAUDE.md`, puis `docs/SPEC.md` en entier.
2. `docs/DECISIONS.md` : décisions D-001 à D-027 et le tableau « À valider plus tard ».
3. `docs/proposals/2026-11-17-modele-donnees-maf.md` (modèle de données MAF validé) et `docs/maf-mapping.md`.
4. `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DATA_SOURCES.md`.

## Façon de travailler attendue par l'utilisateur

- Aucun tiret cadratin, aucune tournure « style IA », dans le code, les docs, les commits et les messages.
- Enchaîner les phases sans s'arrêter pour validation en fin de phase. S'arrêter seulement pour une décision bloquante (modèle de données, architecture, sécurité, licence), avec une recommandation claire.
- Messages courts. L'utilisateur atteint souvent sa limite d'usage : pas de relectures multi-agents ni de panels sans risque réel, un seul sous-agent à la fois pour un gros bloc.
- Toujours le logo fourni (`design/assets/`) pour les icônes et visuels, jamais de variante redessinée.
- Les données de `imports/maf/` (nom de l'élève, école) sont personnelles : jamais committées (le dossier est ignoré par git), jamais envoyées à un service externe.
- Commits en anglais, style conventionnel (`feat(scope): ...`), terminés par la ligne `Co-Authored-By` indiquée par le système. Ne committer que ses propres fichiers.

## État au 18 novembre 2026 (fin de journée)

Phases 0 à 3 livrées, tout est committé. `npm run check` passe (260 tests), `npm run test:e2e` passe (16 tests, dont « Negroni complet en moins d'une minute » et « idée rapide puis brouillon » dans `tests/e2e/recipes.spec.ts`).

Changements de cette session :

- Interface compacte demandée par l'utilisateur (D-028) : corps à 13 px, contrôles de 32 px, cartes à 16 px de marge, panneau « Calculs » en lignes. Toute nouvelle vue suit cette densité, pas les valeurs d'origine de la section 11.
- `npm run screens` capture les écrans principaux (`tests/screens/`, configuration `playwright.screens.config.ts`) : à utiliser pour vérifier un écran au lieu de lancer `npm run dev`. `tests/screens/maf-import.spec.ts` importe `imports/maf/maf-2025.shakery` dans une base neuve (36 fiches, 4 715 éléments, contrôlé).
- Tests d'écrans : fiche (`RecipeDetailPage.test.tsx`), Mon bar (`BarPage.test.tsx`), import (`ImportCard.test.tsx`).

Reste ouvert de la phase 3 : validation par l'utilisateur des valeurs de D-026 (présentées, sans réponse pour l'instant ; ne pas bloquer).

## Phase 4 en cours (données de départ)

Pipeline dans `scripts/seed/` (TypeScript, lancé avec `npx tsx`, jamais exécuté par l'application). Réponses réseau en cache dans `scripts/seed/.cache/` (ignoré par git, rejouable hors ligne, `--refresh` pour retélécharger).

Fait :

- `lib.ts` : cache, User-Agent descriptif sans donnée personnelle, attente sur 429 (le service SPARQL de Wikidata limite parfois à une requête par minute).
- `wikidata.ts` : une requête SPARQL par classe racine (sous-classes P279 avec libellé français, donc sans les marques qui sont des instances), placement dans une feuille de `data/seed/categories.json` par racine et mots-clés. Sortie : `scripts/seed/review/wikidata-candidates.json` (1 131 candidats). Attention : `Q193291` est « esprit » (surnaturel), pas un spiritueux ; retiré.
- `review/decisions.json` : relecture faite par l'agent. Liste blanche des candidats retenus (avec catégorie et renommage éventuel) ; les racines `autoAccept` (fruits filtrés, compléments) sont retenues sauf rejet. Tout le reste est écarté.
- Ciqual 2020 (XML) téléchargé dans le cache depuis la copie Wayback du fichier officiel (`https://web.archive.org/web/20250727022008id_/https://ciqual.anses.fr/cms/sites/default/files/inline-files/XML_2020_07_07.zip`), le site Ciqual étant en maintenance le 18 novembre 2026. Licence Ouverte (Etalab). Constituants : sucres 32000, acides organiques 65000 (g/100 g). Conversion en g/L avec une masse volumique de 1 kg/L (à documenter dans `DATA_SOURCES.md` et `DECISIONS.md`).
- Jeu IBA : `https://raw.githubusercontent.com/ahcombs/iba-cocktails/main/iba-web/iba-cocktails-web.json` (90 cocktails relevés sur le site de l'IBA en mars 2023, code sous licence MIT ; doses et ingrédients repris comme des faits), dans le cache `iba/`.

Reste à faire :

1. `ciqual.ts` : table de correspondance écrite à la main (clé d'ingrédient vers code Ciqual) et valeurs. Codes repérés : citron (maison) 2007 (sucres 2,06, acides 4,8), citron vert pur jus 2031 (1,24 / 5), orange pur jus 2070 (9,61 / 1), pamplemousse pur jus 2027 (8,89 / 1,3), ananas pur jus 2073 (12,1 / 0,6), pomme pur jus 2074 (10,9 / 0,6), raisin 2016 (16 / 0,8), tomate 2053 (3,72 / 0,4), canneberge absent, sirop d'agave 31089, sirop d'érable 31034, miel 31008, sucre blanc 31016, cola sucré 18018, tonic sucré 18344, limonade 18010, lait de coco 18041, crème de cassis 1021.
2. Ingrédients écrits à la main (absents de Wikidata ou introuvables) : Campari, Vermouth rouge, Gin London Dry, Prosecco, Ginger beer, Crème de violette, Falernum, Curaçao bleu, Bitters Peychaud, Aquavit (Q178899 relevé dans une réponse antérieure), eau plate, sucre blanc, sucre roux, blanc et jaune d'œuf, crème liquide, lait, café expresso, sel, noix de muscade, fruits manquants (fruit de la passion, noix de coco, rhubarbe, yuzu, mandarine).
3. `iba.ts` : correspondance des 168 libellés IBA vers les clés d'ingrédients, familles, méthodes, verres, étapes réécrites en français (jamais traduites mot à mot).
4. Préparations classiques (sirop simple, sirop riche, miel, grenadine, orgeat, oleo saccharum, cordial citron vert, gingembre) : **bloqué par une décision de modèle**. Le cœur exclut les lignes en grammes, donc la composition d'un sirop fait de sucre en grammes ne se calcule pas. Recommandation à faire valider : colonne facultative `density_g_per_ml` sur `ingredients` ; une ligne en grammes d'un ingrédient qui a une masse volumique devient volumique (ml = g / masse volumique). Le saccharose cristallisé (1,59 g/ml) donne alors le bon volume dissous (500 g de sucre et 500 ml d'eau donnent environ 815 ml) et le bon sucre.
5. `build.ts` : fusion vers `data/seed/ingredients.json`, `recipes.json`, `preps.json`, refus de tout `needs_review`, puis chargeur dans `src/main/seed/load.ts` (même règle : n'ajouter que les `seed_key` absentes), tests, `DATA_SOURCES.md` complet.
6. Relecture par l'utilisateur de l'arbre des catégories et d'un échantillon d'ingrédients (critère de la phase) : à lui présenter sans bloquer.

## Phases suivantes (section 14 de la spec)

- Phase 4 : données de départ (pipeline `scripts/seed/` : Wikidata, Ciqual, cocktails IBA réécrits, préparations classiques, relecture, `needs_review` bloquant au build). Voir la section 9 de la spec. Ne jamais inventer de valeur de composition.
- Phase 5 : recherche, palette, mode préparation.
- Phase 6 : atelier.
- Phase 7 : journal de dégustation et carnet.
- Phase 8 : Mon bar complet, préparations maison, collections, révision (pratique MAF), calculateurs.
- Phase 9 : accueil sur données réelles (cible : `design/maquettes/png/Main.png`).
- Phase 10 : export et partage, Open Food Facts.
- Phase 11 : finitions, packaging, documentation.

## Commandes utiles

```bash
npm run check
```

```bash
npx vitest run --project node
```

```bash
npm run test:e2e
```

```bash
npm run maf:convert
```

```bash
npx electron scripts/icons/generate.mjs
```

## Pièges connus

- L'outil d'écriture de fichiers transforme les séquences `\uXXXX` en caractères réels : pour une espace insécable ou un tiret spécial dans le code, utiliser `String.fromCharCode`.
- Les heredocs Bash contenant des apostrophes échouent : écrire les scripts avec l'outil d'écriture ou en Python (`python -I`).
- Windows verrouille les fichiers ouverts : toujours fermer une base SQLite avant de la supprimer, y compris dans les `catch`.
- Les scripts lancés avec `tsx` sont en CommonJS : pas de `await` au niveau supérieur, envelopper dans une fonction `main`.
- `better-sqlite3` est en Node-API : pas de recompilation pour Electron (D-021), `npmRebuild: false`.
- TypeScript reste en 6.x tant que typescript-eslint ne prend pas en charge la 7 (D-005).
- Les transactions Drizzle n'exposent pas `$client` : utiliser `this.db.$client`.
- Zod 4 : `.finite()` est obsolète, ne pas l'utiliser.
- Python sous Windows : `write_text` écrit des fins de ligne CRLF ; passer `newline='
'`, sinon Prettier échoue.
- Testing Library lit les espaces insécables des chaînes françaises comme des espaces simples : comparer avec `text.replaceAll(String.fromCharCode(0xa0), ' ')`. Pas de jest-dom : `toBeDefined()`, `toBeNull()`.
