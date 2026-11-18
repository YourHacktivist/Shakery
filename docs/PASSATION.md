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

## État au 18 novembre 2026

Phases 0, 1 et 2 livrées. Phase 3 presque terminée, tout est committé.

Fait pour la phase 3 :

- `src/core/` : unités, dilution, composition, TAV (servi et méthode socle), allergènes, coût et prix de vente, avec leurs tests (`src/core/calculations.test.ts`).
- Dépôts ingrédients, bouteilles, recettes (`src/main/db/repositories/`) et IPC du catalogue (`src/main/ipc/catalog.ts`).
- Import `.shakery` : lecture protégée de l'archive (`src/main/services/archive.ts`), validation ligne à ligne, rapprochement, stratégies ignorer, remplacer, dupliquer (`src/main/services/import.ts`), IPC `import.choose` et `import.apply` (`src/main/ipc/import.ts`).
- Conversion des carnets MAF : `npm run maf:convert` écrit `imports/maf/maf-2025.shakery` (règles dans `docs/maf-mapping.md`). Contrôlé : 4 715 lignes, réimport sans doublon, coûts identiques au carnet à l'arrondi près.
- Écrans de la phase 3 (écrits par un sous-agent arrêté par la limite d'usage juste avant d'écrire leurs tests) : liste, fiche et éditeur de recettes, idée rapide réelle, Mon bar minimal (`src/renderer/src/features/recipes/`, `features/bar/`, `features/shared/`, `lib/queries.ts`, `lib/forms.ts`, composants `Checkbox`, `Select`, `Textarea`). Un utilitaire de test existe déjà : `src/renderer/src/test/shakery.tsx`.
- Paramètres : carte d'import d'un carnet `.shakery` (`src/renderer/src/features/settings/`).

Contrôles au moment de la passation : `npm run check` passe (types, lint, format, 248 tests unitaires), `npm run test:e2e` passe (14 tests).

## Reste à faire pour clore la phase 3

1. Écrire les tests des nouveaux écrans (recettes, éditeur, idée rapide, Mon bar, import des paramètres) et un test e2e « créer un Negroni complet en moins d'une minute » (critère de la phase).
2. Vérifier les écrans dans l'application (`npm run dev`) contre les maquettes `design/maquettes/png/` et le kit, corriger ce qui s'en écarte.
3. Importer `imports/maf/maf-2025.shakery` depuis les Paramètres dans l'application réelle et vérifier l'affichage des 36 recettes (les fiches de culture s'affichent aux phases suivantes).
4. Faire valider par l'utilisateur les valeurs par défaut de D-026 (dilution : shake 25 %, stir 20 %, build 10 %, autre 15 % ; unités : oz 30 ml d'affichage et 29,5735 ml exacts, trait 0,25 ml, goutte 0,05 ml, cuillère de bar et cuillère à café 5 ml). Sources dans `docs/DATA_SOURCES.md`. Ne pas bloquer la suite : présenter les valeurs et continuer.
5. Mettre `README.md` à jour (phase 3 livrée).

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
