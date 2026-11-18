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
