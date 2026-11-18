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

Phases 0 à 3 et 5 livrées, phase 4 livrée sous réserve des validations ci-dessous, tout est committé. `npm run check` passe (260 tests), `npm run test:e2e` passe (16 tests, dont « Negroni complet en moins d'une minute » et « idée rapide puis brouillon » dans `tests/e2e/recipes.spec.ts`).

Changements de cette session :

- Interface compacte demandée par l'utilisateur (D-028) : corps à 13 px, contrôles de 32 px, cartes à 16 px de marge, panneau « Calculs » en lignes. Toute nouvelle vue suit cette densité, pas les valeurs d'origine de la section 11.
- `npm run screens` capture les écrans principaux (`tests/screens/`, configuration `playwright.screens.config.ts`) : à utiliser pour vérifier un écran au lieu de lancer `npm run dev`. `tests/screens/maf-import.spec.ts` importe `imports/maf/maf-2025.shakery` dans une base neuve (36 fiches, 4 715 éléments, contrôlé).
- Tests d'écrans : fiche (`RecipeDetailPage.test.tsx`), Mon bar (`BarPage.test.tsx`), import (`ImportCard.test.tsx`).

Reste ouvert de la phase 3 : validation par l'utilisateur des valeurs de D-026 (présentées, sans réponse pour l'instant ; ne pas bloquer).

## Phase 4 livrée (données de départ), trois points attendent l'utilisateur

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

En attente de l'utilisateur (ne pas bloquer la suite) :

1. **Décision de modèle** (« À valider plus tard » dans `DECISIONS.md`) : colonne `density_g_per_ml` pour compter les lignes en grammes. Sans elle, la composition des sirops maison ne se calcule pas (critère « sirops de base calculés » non tenu). Si validée : migration drizzle, `core/units.ts` (ligne en g avec masse volumique = volume), sucre blanc 1,59 g/ml, sucre roux et miel à sourcer, tests, puis sirops recalculés.
2. Relecture de l'arbre des catégories et d'un échantillon d'ingrédients (critère de la phase 4).
3. Valeurs de D-026 (dilution et unités).

## Phase 5 livrée (recherche et mode préparation)

- `src/core/fuzzy.ts` : Damerau-Levenshtein bornée, tolérance selon la longueur (0 sous 4 lettres, 1 jusqu'à 6, puis 2).
- `src/main/db/repositories/search.ts` : FTS5 trigramme sur `search_index` (termes normalisés, mis entre guillemets, syntaxe FTS5 neutralisée), préfixe sous 3 lettres, classement (exact, préfixe, alias, contenu, approché) avec bonus favoris, fiches en cours et vues récentes (`recent_views`, 500 dernières). Repli approché si rien n'est trouvé. IPC `search.query` et `recentViews.record`.
- Palette (`src/renderer/src/app/PaletteHost.tsx`) : fiches, ingrédients, bouteilles, action « Préparer… », écrans. `CommandPalette` ne filtre plus avec cmdk (`shouldFilter={false}`) : les écrans sont filtrés localement, les résultats de recherche arrivent filtrés (`preFiltered`).
- Mode préparation : route `/prepare/:id` hors de la coquille (`features/prepare/PrepModePage.tsx`), F11 depuis une fiche, bouton sur la fiche, `?ids=a,b,c` pour enchaîner les fiches d'une collection avec les flèches, IPC `app.setPrepMode` (plein écran et `powerSaveBlocker`).
- `src/core/availability.ts` : disponibilité, ingrédients manquants, ingrédients qui débloquent le plus de fiches (`unlockers`, pour la liste d'achats de la phase 8). Chaque `RecipeSummary` porte `missingIngredientIds`. Liste des fiches : vue « Réalisables », filtre par méthode.
- `npm run perf` : budgets mesurés le 18 novembre 2026 (recherche 35 ms au pire, ouverture 1 ms, calcul 4 ms, liste de 2 000 fiches 27 ms).

Reste de la section 10.4 non fait (à reprendre avec les phases concernées) : filtres par spiritueux de base, verre, collection, tags, profil aromatique et exclusion d'un allergène ; actions de palette « Ouvrir dans l'atelier », « Noter une dégustation », « Comparer avec… » (phases 6 et 7). Démarrage en moins de 3 s et défilement à 60 images par seconde non mesurés automatiquement.

## Phases suivantes (section 14 de la spec)

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
- Les heredocs Bash contenant des apostrophes échouent : écrire le script Python dans un fichier du dossier temporaire avec l'outil d'écriture, puis `python -I fichier.py`. `python -I` ignore `PYTHONIOENCODING` : pour afficher de l'UTF-8, `sys.stdout.reconfigure(encoding='utf-8')`.
- Prettier reformate les fichiers après coup : relire un fichier avant un remplacement par motif, sinon le motif ne correspond plus.
- Windows verrouille les fichiers ouverts : toujours fermer une base SQLite avant de la supprimer, y compris dans les `catch`.
- Les scripts lancés avec `tsx` sont en CommonJS : pas de `await` au niveau supérieur, envelopper dans une fonction `main`.
- `better-sqlite3` est en Node-API : pas de recompilation pour Electron (D-021), `npmRebuild: false`.
- TypeScript reste en 6.x tant que typescript-eslint ne prend pas en charge la 7 (D-005).
- Les transactions Drizzle n'exposent pas `$client` : utiliser `this.db.$client`.
- Zod 4 : `.finite()` est obsolète, ne pas l'utiliser.
- Python sous Windows : `write_text` écrit des fins de ligne CRLF ; passer `newline='
'`, sinon Prettier échoue.
- Testing Library lit les espaces insécables des chaînes françaises comme des espaces simples : comparer avec `text.replaceAll(String.fromCharCode(0xa0), ' ')`. Pas de jest-dom : `toBeDefined()`, `toBeNull()`.
