# Passation

## Reprendre ici (22 novembre 2026, fin de session)

D-039 à D-048 sont codées, en local, pas encore poussées. macOS est mis de côté. Reste à faire :

1. Aide (D-048) : test de couverture des libellés de chaque écran, relecture en image, corrections.
2. `npm run check`, e2e complet deux fois, `npm run screens`, `npm run perf`, `npx tsx scripts/seed/check-seed.ts`.
3. README, `docs/ARCHITECTURE.md`, reste de cette passation, puis installeur Windows (celui de `dist/` date de la phase 11).
4. Relire le diff (données personnelles), puis pousser sur main.

Écarts connus, non corrigés : retrait d'une collection sans « Annuler », Ctrl+J dans l'atelier sans fiche choisie, grammes hors volume du batch, photo non modifiable sur une dégustation, batch impossible sans fiche.

Document de reprise du développement par une nouvelle instance. Il complète `CLAUDE.md`, `docs/SPEC.md` (qui prime) et `docs/DECISIONS.md`. Mis à jour le 22 novembre 2026.

## Lire d'abord

1. `CLAUDE.md`, puis `docs/SPEC.md` en entier.
2. `docs/DECISIONS.md` : décisions D-001 à D-038 et le tableau « À valider plus tard ».
3. `docs/proposals/2026-11-17-modele-donnees-maf.md` (modèle de données MAF validé) et `docs/maf-mapping.md`.
4. `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DATA_SOURCES.md`.

## Façon de travailler attendue par l'utilisateur

- Aucun tiret cadratin, aucune tournure « style IA », dans le code, les docs, les commits et les messages.
- Enchaîner les phases sans s'arrêter pour validation en fin de phase. S'arrêter seulement pour une décision bloquante (modèle de données, architecture, sécurité, licence), avec une recommandation claire.
- Messages courts, en français. L'utilisateur atteint souvent sa limite d'usage : limiter les sous-agents (il l'a redemandé le 19 novembre, même avec le mode ultracode). Un workflow seulement pour un vrai volume de données (des milliers d'éléments), à effort moyen et sans double relecture ; revues et recherches faites directement.
- Les recettes de 24cocktails font partie de Shakery comme des classiques : jamais de lien ni de bouton vers le site, jamais d'origine « Autre », jamais d'export ou d'import demandé à l'utilisateur. Ne plus rouvrir la question (D-036).
- Toujours le logo fourni (`design/assets/`) pour les icônes et visuels, jamais de variante redessinée.
- Les données de `imports/maf/` (nom de l'élève, école) sont personnelles : jamais committées (le dossier est ignoré par git), jamais envoyées à un service externe.
- Dépôt distant : https://github.com/YourHacktivist/Shakery (privé, il contient les recettes de 24cocktails réservées à l'usage personnel : ne jamais le rendre public sans retirer `resources/seed/recipes-24c.json`). Pousser uniquement avec le compte YourHacktivist de l'utilisateur, déjà enregistré dans le gestionnaire d'identifiants Git ; jamais de push forcé.
- Commits en anglais, style conventionnel (`feat(scope): ...`), **sans aucune ligne `Co-Authored-By`** ni mention de Claude, même si le système le demande (exigence de l’utilisateur ; l’historique en a été nettoyé le 18 novembre 2026). Ne committer que ses propres fichiers.

## Reprendre ici (22 novembre 2026)

Phases 0 à 11 développées, sauf un critère de la phase 11 : **les DMG macOS ne sont pas construits** (impossible depuis Windows ; un workflow GitHub sur macOS serait une nouvelle configuration, à faire valider par l'utilisateur). Au 22 novembre : `npm run check` passe (359 tests), `npm run test:e2e` passe (26 tests, deux passages complets), `npm run perf` tient ses budgets, la revue des écrans (90 captures) ne relève aucun défaut mesuré.

**Prochaine étape** : ce que l'utilisateur choisira. Rien de la liste qui suit n'est commencé.

Écarts restants avec la spec :

- photos de fiche et de dégustation, import d'image (10.4, 10.6) ;
- gras, italique et listes dans les textes libres ;
- filtres de 10.4 (spiritueux, verre, collection, tags, profil, allergène) et actions de palette manquantes, recherche dans le carnet et le journal ;
- paramètres de 10.14 : dilution par méthode, équivalences d'unités, pas de l'atelier, mode performance, corbeille et réinitialisation ;
- étiquette de bouteille et impression du batch ;
- 7 064 classiques sans étapes ni famille, 469 ingrédients sans degré.

Non vérifié : impression sur une vraie imprimante, installation par l'installeur, DevTools coupés dans l'application installée, macOS, lecteur d'écran, contrastes des dialogues et des textes sur dégradé (hors de la mesure automatique), résultat de la CI GitHub.

## Phase 11 livrée pour Windows (finitions)

Choix consignés dans D-038, repères dans `docs/ARCHITECTURE.md` (« Apparence, écrans et impression »).

- Premier lancement : `services/onboarding.ts` et `features/onboarding/` ; les tests e2e le sautent par `SHAKERY_SKIP_ONBOARDING=1` (hors build packagé seulement).
- Paramètres : `src/main/ipc/settings.ts`, cartes dans `features/settings/`, « À propos » avec `assets/licenses.json` (`npm run licenses` après tout changement de dépendance). Guide : `/guide`.
- Fiche imprimée : Ctrl+P, `print/RecipeSheet.tsx`, une seule page (`fitSheet.ts`), test e2e sur les classiques les plus longs.
- Recherche : Entrée tapée avant les résultats les attend (`resultsFor` de `CommandPalette`, même règle pour « @ » dans le carnet). Toute nouvelle recherche asynchrone validée par Entrée doit faire de même.
- Audit des écrans : `tests/e2e/page-audit.ts`, revue complète par `tests/screens/review.spec.ts`.
- Installeur Windows sans téléchargement : `npm run build` puis `npx electron-builder --win --publish never -c.electronDist=node_modules/electron/dist`. Pour l'essayer sans créer de carnet dans le profil de l'utilisateur, lancer `app.asar` avec l'Electron de `node_modules` et `SHAKERY_USER_DATA_DIR` : l'exécutable packagé ignore cette variable.

## Phase 10 livrée (export, partage, import, Open Food Facts)

Choix consignés dans D-037.

- Export : `src/main/services/export.ts` (complet : toutes les tables de l'import, lignes supprimées et photos WebP comprises ; partiel : fiches, préparations utilisées, ingrédients, référentiels, et sur demande dégustations, carnet, bouteilles). IPC `export.notebook`, `export.csv`, `export.saveFile`, `export.copyText` dans `src/main/ipc/share.ts` : le main demande toujours où enregistrer.
- Import (`import.ts`) : classiques et ingrédients de départ reconnus par `seed_key` ; repris s'ils ont changé dans l'archive et pas ici, conflit sinon ; instantanés de versions convertis ; alias déjà présents sautés ; seules les lignes écrites sont réindexées ; l'aperçu compte comme l'import.
- CSV (`services/csv.ts`) : fiches, journal, ingrédients ; point-virgule, BOM, formules neutralisées.
- Fiche : bouton « Partager » (`ShareRecipeDialog`, `share.ts`) : copie Markdown, fichier `.md`, image PNG dessinée sur un canvas avec le logo, export `.shakery` pour un collègue. Collection : bouton « Partager » (`ShareCollectionDialog`).
- Paramètres : `ExportCard` (export complet, CSV) et `OffCard` (réglage `off.enabled`).
- Open Food Facts : `services/off.ts` (tests dans `off.test.ts`), `OffLookup.tsx` dans le formulaire de bouteille (Entrée dans le champ code-barres lance la recherche), mention ODbL sur les bouteilles `source = 'off'`.
- Palette : à chaque nouvelle liste de résultats, la sélection revient sur le premier (sinon Entrée ouvrait une variante restée sélectionnée pendant la frappe).
- Tests : `export.test.ts` (aller-retour d'un carnet dans une installation neuve, classiques modifiés, photos, conflits, export partiel), `csv.test.ts`, `off.test.ts`, `share.test.tsx`, `CommandPalette.test.tsx`, e2e `tests/e2e/share.spec.ts`.

## Recettes de 24cocktails (19 et 20 novembre 2026)

Les recettes de 24cocktails.com sont intégrées (D-036, spec sections 2 et 9, `docs/DATA_SOURCES.md`).

- Pipeline : `scripts/seed/cocktails24-fetch.ts` (export en cache), `cocktails24.ts` (lecture des lignes, assemblage), `24c-map.json` (unités, verres, méthodes, noms réparés, 2 404 libellés vers le référentiel), `24c-ingredients.json` (469 ingrédients nouveaux), `24c-garnish-fr.json` (2 517 décorations traduites). `build.ts` écrit `resources/seed/recipes-24c.json` : 7 064 cocktails (90 écartés car portant le nom d'un classique IBA ou en double).
- Application : `bundled.ts` lit ce fichier au démarrage (`withClassics`, `seedFolder()`). `load.ts` charge les cocktails en bloc (`bulkCocktailWriter`, requêtes préparées une fois, instantané construit par `recipeDetailFromRows` comme `get`), le tout dans une transaction : environ 3 à 5 s au premier lancement, 0,1 à 0,3 s ensuite. Toutes les fiches sont `origin = 'classic'`, sans crédit ni lien.
- Index de recherche : `indexEntity(..., { fresh: true })` évite le parcours complet de la table FTS5 pour une entrée neuve (c'était quadratique : 181 s de chargement). La recherche cherche aussi la saisie entière comme une expression (« My Tie », « AT&T », « Daisy No.2 »), la recherche approchée classe à distance égale le nom de longueur la plus proche et ne détaille que 100 candidats, et la distance est calculée en bande diagonale (`core/fuzzy.ts`). La liste déroulante (`Combobox`) met le nom exact en tête puis les noms les plus courts.
- Contrôle complet : `npx tsx scripts/seed/check-seed.ts` charge tout dans une base neuve et vérifie chaque cocktail (chargé, ouvert, calculé, premier résultat quand on tape son nom). Dernier passage : 7 166 cocktails sur 7 166, recherche la plus lente 19 ms.
- La décoration accepte 1 000 caractères (fiche, éditeur, base de départ).
- Revue des phases 7 à 9 faite à la main sur les points signalés : rien de grave (le `setState` d'`AbvCalculator` est le schéma documenté par React ; boucle de `listCollections` simplifiée).

**Limites connues** : l'export ne donne ni étapes ni famille, ces champs restent vides sur les 7 064 fiches (les zones d'équilibre ne s'appuient donc que sur les fiches qui ont une famille) ; 469 ingrédients nouveaux sans degré ni composition ; la fenêtre n'apparaît qu'après le premier chargement (3 à 5 s, une seule fois).

## État au 18 novembre 2026 (soir)

Phases 0 à 9 livrées, tout est committé. `npm run check` passe (322 tests), `npm run test:e2e` passe (20 tests, dont « Negroni complet en moins d'une minute » dans `tests/e2e/recipes.spec.ts` et « note de dégustation puis testée » dans `tests/e2e/journal.spec.ts`).

Changements de la dernière session :

- L'utilisateur a validé la masse volumique (D-031), l'arbre des catégories et les ingrédients de départ, et les valeurs de D-026. Plus rien n'attend de réponse pour les phases 3 et 4.
- Refonte visuelle demandée par l'utilisateur (D-032) : halos cuivrés fixes, dégradé cuivré sur l'action principale et les contrôles cochés, cartes éclairées par le haut, case à cocher dessinée, `<select>` natifs redessinés (`shk-select` dans `index.css`, `appearance: base-select`), entrée animée des écrans (`usePageEntrance` dans `App.tsx`), curseurs glissants (barre latérale, `SegmentedControl`), barre latérale repliable avec animation de largeur et Ctrl+B. Toute nouvelle vue reprend ces classes (`bg-card`, `shadow-card`, `bg-accent-gradient`, `shadow-glow`, `animate-rise` avec `--rise-index`) et reste à la densité de D-028.
- `npm run screens` capture les écrans principaux (`tests/screens/`, configuration `playwright.screens.config.ts`) : à utiliser pour vérifier un écran au lieu de lancer `npm run dev`. `tests/screens/maf-import.spec.ts` importe `imports/maf/maf-2025.shakery` dans une base neuve (36 fiches, 4 715 éléments, contrôlé).

## Phase 4 livrée (données de départ)

Pipeline dans `scripts/seed/` (TypeScript, `npx tsx`, jamais exécuté par l'application). Réponses réseau en cache dans `scripts/seed/.cache/` (ignoré par git ; `--refresh` pour retélécharger). Ordre :

```bash
npx tsx scripts/seed/wikidata.ts
```

```bash
npx tsx scripts/seed/ciqual.ts
```

```bash
npx tsx scripts/seed/iba.ts
```

```bash
npx tsx scripts/seed/build.ts
```

- `wikidata.ts` : une requête SPARQL par classe racine, sortie `review/wikidata-candidates.json`. Le service limite parfois à une requête par minute (attente gérée dans `lib.ts`). `Q193291` est « esprit » (surnaturel) : ne jamais le reprendre.
- `review/decisions.json` : relecture (liste blanche, renommages, `keepAbv` pour les seuls produits uniques).
- `hand-ingredients.json` : 63 ingrédients rédigés à la main. `ciqual-map.json` et `ciqual.ts` : sucre et acidité de 19 jus et sodas (Ciqual 2020 via la copie Wayback, D-029).
- `iba.ts` : relevé du site de l'IBA (102 cocktails). `iba-map.json` : libellés et lignes lues à la main. `iba-fr.json` : textes français écrits à la main. `recipes.ts` : assemblage.
- `preps.json` : 10 préparations classiques sans durée ni rendement.
- `build.ts` écrit `data/seed/ingredients.json` (308) et `data/seed/recipes.json` (10 préparations puis 102 cocktails) ; il échoue sur une ligne IBA non lue, un doublon, une catégorie qui n'est pas une feuille.
- Chargement : `src/main/seed/load.ts` (ingrédients avec alias et index de recherche dans la transaction principale ; fiches ensuite par `RecipeRepository`, une transaction par fiche, statut `final`, origine `classic`). N'ajoute que les `seed_key` absentes, ne recrée jamais une entrée supprimée, laisse un ingrédient que l'utilisateur a déjà sous le même nom. Les tests de dépôts et l'archive MAF chargent la base sans ingrédients ni fiches (`{ ...BUNDLED_SEED, ingredients: [], recipes: [] }`).
- Le test e2e du Negroni choisit les ingrédients de départ et crée un seul nouvel ingrédient.

Masse volumique (D-031) : colonne `density_g_per_ml` (migration `0002`, ajout de colonne écrit à la main, car drizzle-kit voulait recréer la table). Une ligne en grammes compte `g / masse volumique` ml dans `core/composition.ts` et dans le volume d'une préparation sans rendement (`core/cost.ts`). Valeurs de départ dans `scripts/seed/hand-compositions.json` (eau, sucres, miels, sucre de Ciqual converti). `load.ts` complète au démarrage un ingrédient de départ qui n'a encore aucune composition (`fillComposition`). Le sirop simple ressort à 61,3 g de sucre pour 100 ml.

## Phase 5 livrée (recherche et mode préparation)

- `src/core/fuzzy.ts` : Damerau-Levenshtein bornée, tolérance selon la longueur (0 sous 4 lettres, 1 jusqu'à 6, puis 2).
- `src/main/db/repositories/search.ts` : FTS5 trigramme sur `search_index` (termes normalisés, mis entre guillemets, syntaxe FTS5 neutralisée), préfixe sous 3 lettres, classement (exact, préfixe, alias, contenu, approché) avec bonus favoris, fiches en cours et vues récentes (`recent_views`, 500 dernières). Repli approché si rien n'est trouvé. IPC `search.query` et `recentViews.record`.
- Palette (`src/renderer/src/app/PaletteHost.tsx`) : fiches, ingrédients, bouteilles, action « Préparer… », écrans. `CommandPalette` ne filtre plus avec cmdk (`shouldFilter={false}`) : les écrans sont filtrés localement, les résultats de recherche arrivent filtrés (`preFiltered`).
- Mode préparation : route `/prepare/:id` hors de la coquille (`features/prepare/PrepModePage.tsx`), F11 depuis une fiche, bouton sur la fiche, `?ids=a,b,c` pour enchaîner les fiches d'une collection avec les flèches, IPC `app.setPrepMode` (plein écran et `powerSaveBlocker`).
- `src/core/availability.ts` : disponibilité, ingrédients manquants, ingrédients qui débloquent le plus de fiches (`unlockers`, pour la liste d'achats de la phase 8). Chaque `RecipeSummary` porte `missingIngredientIds`. Liste des fiches : vue « Réalisables », filtre par méthode.
- `npm run perf` : budgets mesurés le 18 novembre 2026 (recherche 35 ms au pire, ouverture 1 ms, calcul 4 ms, liste de 2 000 fiches 27 ms).

Reste de la section 10.4 non fait (à reprendre avec les phases concernées) : filtres par spiritueux de base, verre, collection, tags, profil aromatique et exclusion d'un allergène ; actions de palette « Ouvrir dans l'atelier », « Noter une dégustation », « Comparer avec… » (phases 6 et 7). Démarrage en moins de 3 s et défilement à 60 images par seconde non mesurés automatiquement.

## Phase 6 livrée (atelier)

- `src/core/compare.ts` (diff de deux versions : lignes rapprochées par ingrédient dans l'ordre, écarts de dose, méthode, verre, réordonnancement seul sans changement) et `src/core/balance.ts` (zones P25 à P75 par famille, fiches `final` ou classiques, valeur complète, à partir de 5 fiches, liste des fiches). Tests dans `src/core/lab.test.ts`.
- IPC `recipes.getVersion` (instantané d'une version) et `recipes.referenceZones` (calcul dans `src/main/services/zones.ts`, mis en cache tant que recettes, lignes, ingrédients et bouteilles n'ont pas changé).
- Écran `features/lab/` : `/lab` choix d'une fiche ou départ de zéro, `/lab/:id` et `/lab/new`. Copie en mémoire (`labState.ts`, annuler et rétablir illimités, Ctrl+Z, Ctrl+Y), lignes désactivables (non enregistrées), réglage par pas (2,5 ml, 1/4 oz…), indicateurs en direct avec jauge, zone de la famille (infobulle des fiches) et repère de la version enregistrée, enregistrement en nouvelle version (nom facultatif) ou en variante, abandon, confirmation en quittant. Mode comparaison (`CompareView.tsx`) : jusqu'à trois versions dont le brouillon, écarts chiffrés, `VersionDiff`.
- Ctrl+E ouvre la fiche affichée dans l'atelier ; le bouton « Atelier » de la fiche est actif.
- E2e `tests/e2e/lab.spec.ts` : dose modifiée, volume recalculé, annuler et rétablir, rien en base avant l'enregistrement, version 2 enregistrée, comparaison.

Limites connues : les zones n'apparaissent qu'une fois les degrés et compositions renseignés (les spiritueux génériques de départ n'ont pas de degré, voir D-030) ; « Noter une dégustation » attend la phase 7.

## Phase 7 livrée (journal et carnet)

- Domaine `src/shared/domain/journal.ts`, dépôt `src/main/db/repositories/journal.ts`, IPC `tastingNotes.*` et `notebook.*` (`src/main/ipc/journal.ts`).
- `app/TastingDialog.tsx` (Ctrl+J partout, fiche et version proposées depuis une fiche ou l'atelier) : fiche, version, note globale en étoiles (`components/StarRating.tsx`), 8 `RatingScale`, commentaire, prochaine étape, contexte.
- `features/journal/JournalPage.tsx` : liste chronologique, filtres fiche, note minimale, « À retester », case « Testée » avec état optimiste (une étape cochée reste affichée jusqu'au changement de vue), suppression avec « Annuler » (la note est réécrite à l'identique). `TastingCard` est réutilisée par la fiche.
- Fiche : bouton « Noter une dégustation », note moyenne par version sous « Versions », courbe des moyennes dès deux versions notées, trois dernières dégustations.
- Atelier : « Noter une dégustation » enregistre d'abord une nouvelle version si le brouillon a changé (une nouvelle fiche est créée d'abord sous son nom).
- Barre latérale : bloc « À retester » (trois prochaines étapes, lien vers le journal).
- `features/notebook/NotebookPage.tsx` : épinglées d'abord, filtre, éditeur à enregistrement automatique (600 ms après la dernière frappe et à la fermeture), « @ » ouvre `search.query` et ajoute le lien, liens affichés avec leur nom actuel, « Transformer en idée de fiche » (`recipes.create`, statut `idea`), suppression avec « Annuler ».
- Tests : `JournalPage.test.tsx` (dialogue et journal), `NotebookPage.test.tsx`, e2e `tests/e2e/journal.spec.ts`.

Reste hors phase 7 : la palette ne cherche pas encore dans le carnet et le journal (section 10.1), ses actions « Noter une dégustation » et « Comparer avec… » ne sont pas proposées ; photo facultative d'une dégustation (section 10.6) non faite.

## Phase 8 livrée (Mon bar, préparations, collections, révision, calculateurs)

- Cœur : `core/shelf-life.ts` (date limite à la dernière milliseconde du jour local, en jours calendaires ; tests aux changements d'heure dans `core/phase8.test.ts`), `core/batch.ts` (multiplication, eau de dilution facultative, part ajoutée au service selon le `batch_hint` de la catégorie), `core/practice.ts` (générateurs de questions, D-034).
- Main : `db/repositories/workshop.ts` (préparations et fabrications, collections, corpus de révision, journal `practice_answers`), IPC `preps.*`, `batches.*`, `collections.*`, `practice.*` (`ipc/workshop.ts`), impression PDF (`services/print.ts`, D-033). Test `workshop.test.ts` : disponibilité sur les recettes de départ, fabrication, collection, révision.
- Écrans : `features/preps/PrepsPage.tsx`, `features/collections/CollectionsPage.tsx` (+ `AddToCollection.tsx` sur la fiche), `features/practice/PracticePage.tsx` (+ `corpus.ts` qui écrit les libellés français), `features/calculators/CalculatorsPage.tsx`, gabarit `print/CollectionPrint.tsx` (route `/print/collection/:id` hors coquille). Mon bar : liste d'achats et bascule « je l'ai » (D-035). Barre latérale : préparations à surveiller et carte « Ce soir » réelles (`features/shared/tonight.ts`).
- E2e `tests/e2e/workshop.spec.ts` : collection, export PDF réel (boîte d'enregistrement remplacée dans le main), révision complète, fabrication.

Reste : étiquette de bouteille et impression du batch (le gabarit de collection montre la voie), générateurs de révision restants (D-034), glisser-déposer dans une collection (les flèches suffisent au clavier).

## Phase 9 livrée (accueil)

- `features/home/HomePage.tsx` sur les vraies données : trois créations (statut idée, brouillon ou en test, par dernière activité, fiche ou dégustation) avec la note moyenne de la dernière version goûtée, l'écart avec la précédente et la courbe des notes ; « En cours » ou « Favoris », filtre par famille ; emplacements vides qui ouvrent l'idée rapide ; carte héros ; création en focus (la plus récente en test) avec ses quatre indicateurs, l'écart avec la version précédente, la zone de sa famille et sa dernière prochaine étape. L'accueil vide de la maquette reste tel quel sans création.
- Test `features/home/HomePage.test.tsx`. Capture `npm run screens` : `home.png`.

## Phases suivantes (section 14 de la spec)

- Phase 8 (livrée) : Mon bar complet, préparations maison, collections, révision (pratique MAF), calculateurs.
- Phase 9 (livrée) : accueil sur données réelles (cible : `design/maquettes/png/Main.png`).
- Phase 10 (livrée) : export et partage, Open Food Facts.
- Phase 11 (livrée pour Windows, DMG macOS à construire) : finitions, packaging, documentation.

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
npx tsx scripts/seed/check-seed.ts
```

```bash
npx electron scripts/icons/generate.mjs
```

## Pièges connus

- L'outil d'écriture de fichiers transforme les séquences `\uXXXX` en caractères réels : pour une espace insécable ou un tiret spécial dans le code, utiliser `String.fromCharCode`.
- Les heredocs Bash contenant des apostrophes échouent : écrire le script Python dans un fichier du dossier temporaire avec l'outil d'écriture, puis `python -I fichier.py`. `python -I` ignore `PYTHONIOENCODING` : pour afficher de l'UTF-8, `sys.stdout.reconfigure(encoding='utf-8')`.
- Prettier reformate les fichiers après coup : relire un fichier avant un remplacement par motif, sinon le motif ne correspond plus.
- Un test e2e qui change `location.hash` doit attendre `main[data-scene]` avant de lire l'écran : la route est rendue un instant après.
- Windows verrouille les fichiers ouverts : toujours fermer une base SQLite avant de la supprimer, y compris dans les `catch`.
- Les scripts lancés avec `tsx` sont en CommonJS : pas de `await` au niveau supérieur, envelopper dans une fonction `main`.
- `better-sqlite3` est en Node-API : pas de recompilation pour Electron (D-021), `npmRebuild: false`.
- TypeScript reste en 6.x tant que typescript-eslint ne prend pas en charge la 7 (D-005).
- Les transactions Drizzle n'exposent pas `$client` : utiliser `this.db.$client`.
- Zod 4 : `.finite()` est obsolète, ne pas l'utiliser.
- Python sous Windows : `write_text` écrit des fins de ligne CRLF ; passer `newline='
'`, sinon Prettier échoue.
- Testing Library lit les espaces insécables des chaînes françaises comme des espaces simples : comparer avec `text.replaceAll(String.fromCharCode(0xa0), ' ')`. Pas de jest-dom : `toBeDefined()`, `toBeNull()`.
