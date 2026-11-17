# Proposition : extension du modèle de données pour les carnets MAF

17 novembre 2026. Statut : **validée par l'utilisateur le 17 novembre 2026** (décisions D-016 à D-020 de `docs/DECISIONS.md`) (règle 3 de la section 1 de la spec : toute décision qui touche au modèle de données exige une validation préalable).

Conçue par trois propositions indépendantes (sobriété, normalisation, usages d'abord), puis arbitrée et vérifiée contre `docs/SPEC.md`, `docs/DECISIONS.md` et les fichiers extraits dans `imports/maf/`. Les tables de la section 7 de la spec sont reprises telles quelles ; ce document ne décrit que l'extension.

## Proposition

**Principes**

1. **Chaque fait imprimé a une colonne.** Aucun JSON libre pour le contenu et aucune archive de secours. Seules les listes de chaînes sont en JSON.
2. **Le socle reste figé, la recette évolue.** Le carnet imprime une version du cocktail, avec ses libellés, ses doses, ses TAV retenus et ses coûts. Elle est copiée dans `reference_specs`. La recette de travail (`recipes`) est créée à partir d'elle et l'utilisateur la fait évoluer librement.
3. **On stocke ce qui est imprimé et non reproductible.** Ce qui se recalcule à l'identique à partir de données figées n'est pas stocké, et l'import le vérifie.
4. **Le texte imprimé est toujours gardé.** Le lien vers une autre table est facultatif et reste NULL tant que le rapprochement n'est pas confirmé.
5. **Aucun code propre au MAF dans l'application.** Un script de développement convertit `imports/maf/` en archive `.shakery`. L'import standard de la section 12.4 fait le reste : aperçu, rapprochement, transaction.

### 1. Schéma

**Conventions**

- Toute table nouvelle a les colonnes communes : `id` UUIDv7, `created_at`, `updated_at` et `deleted_at`.
- Énumérations en TEXT avec `CHECK` (`inList` du brouillon).
- Booléens en INTEGER `NOT NULL DEFAULT 0`. `sort_order INTEGER NOT NULL DEFAULT 0`.
- Montants en centimes entiers. Taux de TVA en points de base entiers (2000 = 20 %) : ce n'est pas un montant, mais on évite ainsi tout flottant dans le calcul du prix.
- « unique vivant » désigne un index unique partiel `WHERE deleted_at IS NULL`.
- Toute clé étrangère est indexée.

#### 1.1 Tables existantes modifiées

```
recipes (+)
  drink_length ('short' | 'long') NULL
  serving_moment ('before_dinner' | 'all_day' | 'after_dinner') NULL
  profile TEXT NULL                        -- « Floral, acidulé et fruité »
  garnish_cost_ht_cents INTEGER NULL       -- coût forfaitaire HT de la décoration, par verre ; CHECK >= 0

products (+)
  brand TEXT NULL                          -- déjà nullable dans le brouillon
  pack_quantity REAL NULL                  -- contenance d'un article compté : 10 (feuilles), 0.5 (citron vert)
  pack_unit ('piece' | 'leaf' | 'slice' | 'wedge' | 'barspoon' | 'tsp' | 'g' | 'serving') NULL
  purchase_price_basis ('ht' | 'ttc') NULL
  reference_guide_id -> study_guides NULL  -- produit de référence d'un carnet (non possédé)
  CHECK ((pack_quantity IS NULL) = (pack_unit IS NULL))
  CHECK (volume_ml IS NULL OR pack_quantity IS NULL)
  CHECK (purchase_price_cents IS NULL OR purchase_price_basis IS NOT NULL)
  CHECK (pack_quantity IS NULL OR pack_quantity > 0)
  INDEX (reference_guide_id)

collection_items (modifiée)
  recipe_id -> recipes NULL                -- implicitement obligatoire dans la spec
  sheet_id -> knowledge_sheets NULL
  sale_price_cents INTEGER NULL            -- précisé : prix carte TTC (D-002)
  vat_rate_bp INTEGER NULL                 -- remplace le taux réglé (boisson sans alcool servie sur place)
  CHECK ((recipe_id IS NULL) <> (sheet_id IS NULL))
  INDEX (sheet_id)

practice_sessions (+)
  mode ('quiz' | 'flashcards' | 'calc') NOT NULL DEFAULT 'quiz'
  question_types TEXT NULL                 -- JSON string[] : générateurs retenus
  -- mistakes est conservé comme résumé écrit en fin de session ; le détail est dans practice_answers

notebook_links.entity_type   + 'sheet'
recent_views.entity_type     + 'sheet'
search_index.entity_type     + 'sheet' | 'brand_entry' | 'study_table'

settings (clés, sans changement de schéma)
  pricing.multiplier = 5
  pricing.vat_rate_bp = 2000
  pricing.menu_rounding_step_cents = 50
  pricing.menu_rounding = 'up'
  units.dash_ml                            -- valeur par défaut à valider en fin de phase 3
```

Pourquoi ces changements :

- **`drink_length`, `serving_moment`, `profile`.** Ce sont des données déclarées par le socle : 18 short et 18 long ; 7 before_dinner, 28 all_day et 1 after_dinner. Le volume ne permet pas de les déduire : les définitions du carnet se recouvrent à 100 ml. Elles servent de filtres (10.4) et de questions, y compris pour les créations de l'utilisateur.
- **`garnish_cost_ht_cents`.** Les 30 coûts de garniture portent sur des garnitures composées (« 1/2 tranche de citron, 2 mûres, paille courte » à 35 c). Les découper en lignes obligerait à inventer des prix unitaires.
- **`pack_*`.** `products` ne connaît que `volume_ml`, alors que 9 cocktails utilisent des articles vendus à la pièce. Règle de coût :
  - quantité de la ligne / `pack_quantity` × prix, si l'unité de la ligne est égale à `pack_unit` ;
  - `serving` est un forfait par verre, pour la ligne `to_taste` de l'assaisonnement du Bloody Mary (10 c) ;
  - `serving` n'est pas une unité de recette : l'énumération de `recipe_lines.unit` ne change pas.
- **`purchase_price_basis`.** Les prix du carnet sont HT, ceux d'une bouteille achetée en magasin sont TTC. `cost.ts` ne convertit jamais, car le taux de TVA à l'achat varie selon le produit. Si les bases sont mélangées, le coût HT est marqué incomplet et les lignes en cause sont nommées (règle de la section 8).
- **`reference_guide_id`.** Il distingue les 63 produits de référence (`owned = 0`) des bouteilles de l'utilisateur. Il permet la vue « base produits du carnet » et un avertissement avant de modifier un produit utilisé par les calculs du carnet (le vermouth rouge à 14,5 %).
- **`collection_items.sheet_id`.** Une collection d'examen contient aussi les 48 fiches produits : ordre, note, export PDF et révision. La contrainte `CHECK` garantit une seule cible et de vraies clés étrangères.
- **`vat_rate_bp`.** En France, les boissons sans alcool servies sur place n'ont pas le même taux que les boissons alcoolisées. NULL signifie que le réglage global s'applique.

#### 1.2 Nouvelles tables

```
study_guides                     -- un carnet importé : provenance, sources, règles de calcul
  title TEXT NOT NULL
  kind ('cocktails' | 'products' | 'other') NOT NULL
  edition_label TEXT NULL          -- « Référentiel : Socle des cocktails de référence, édition 2025 »
  edition_year INTEGER NULL
  sources_intro TEXT NULL, sources_limits TEXT NULL
  price_multiplier REAL NULL       -- 5
  vat_rate_bp INTEGER NULL         -- 2000
  menu_rounding_step_cents INTEGER NULL   -- 50
  menu_rounding ('up' | 'nearest') NULL
  dash_ml REAL NULL                -- 0.25
  abv_method ('served' | 'socle') NULL
  import_key TEXT NULL             -- 'maf-2025-cocktails'
  UNIQUE vivant (import_key) WHERE import_key IS NOT NULL
```

Les règles de calcul du carnet ne doivent pas imposer leur trait à 0,25 ml ni leur coefficient aux créations de l'utilisateur. Elles sont portées par le carnet, qui se synchronise ; `settings` ne se synchronise pas, faute de `updated_at`. Les réglages globaux restent dans `settings`.

```
guide_sources
  guide_id -> study_guides NOT NULL
  number INTEGER NOT NULL          -- [1] à [23] (cocktails), [1] à [25] (produits)
  text TEXT NOT NULL               -- affiché comme texte, jamais comme lien (section 6)
  UNIQUE vivant (guide_id, number)

source_citations
  source_id -> guide_sources NOT NULL
  sheet_id -> knowledge_sheets NULL
  table_row_id -> study_table_rows NULL
  sort_order                       -- ordre imprimé : [17, 16, 25]
  CHECK ((sheet_id IS NULL) <> (table_row_id IS NULL))
  UNIQUE vivant (source_id, sheet_id) ; UNIQUE vivant (source_id, table_row_id)
  INDEX (sheet_id), INDEX (table_row_id)
```

Une fiche cite par numéro, mais la citation pointe vers l'identifiant de la source. Le repository refuse une citation dont la source et la fiche n'appartiennent pas au même carnet. Le [5] du carnet cocktails (règlement UE 2019/787) n'est pas le [5] du carnet produits, d'où cette règle, couverte par un test.

```
reference_specs                  -- version publiée d'un cocktail : socle 2025, IBA, autre livre
  recipe_id -> recipes NOT NULL
  guide_id -> study_guides NULL
  kind ('socle' | 'iba' | 'other') NOT NULL
  label TEXT NOT NULL              -- « Socle 2025 », « Spécification IBA »
  spec_text TEXT NULL              -- texte libre (IBA) ; NULL pour Bamboo et Rum Swizzle
  note TEXT NULL                   -- iba_note
  linked_recipe_id -> recipes NULL -- fiche structurée de cette référence (IBA de la base de départ)
  family_label TEXT NULL           -- « Sour (gin sour à la liqueur) »
  family_short_label TEXT NULL     -- « Sour »
  method_label TEXT NULL           -- « Verre à mélange (ou cuban roll) »
  glass_label TEXT NULL            -- « Coupe givrée au sel »
  garnish TEXT NULL
  steps TEXT NULL                  -- JSON string[], même forme que recipes.steps
  stated_abv_pct REAL NULL         -- TAV annoncé par le socle (28 pour l'Aviation)
  abv_gap_explanation TEXT NULL    -- explication longue (fiche)
  abv_gap_summary TEXT NULL        -- explication courte (tableau de synthèse)
  garnish_cost_ht_cents INTEGER NULL
  material_cost_ht_cents INTEGER NULL    -- 183, tel qu'imprimé
  sale_price_ttc_cents INTEGER NULL      -- 914, tel qu'imprimé
  cost_ratio_pct REAL NULL               -- 23, tel qu'imprimé
  sort_order
  UNIQUE vivant (recipe_id, guide_id, kind)
  INDEX (recipe_id, kind), INDEX (guide_id), INDEX (linked_recipe_id)

reference_spec_lines
  spec_id -> reference_specs NOT NULL
  label TEXT NOT NULL              -- « Eau-de-vie (ici gin) »
  short_label TEXT NULL            -- libellé de la carte mentale : « Maraschino »
  dose_text TEXT NULL              -- « 2 traits », « 1 »
  quantity REAL NULL
  unit (énumération de recipe_lines.unit) NOT NULL
  ingredient_id -> ingredients NULL
  product_id -> products NULL      -- produit de référence utilisé par le carnet
  reference_label TEXT NULL        -- « pressé minute », « Beefeater »
  abv_pct REAL NULL                -- TAV retenu par le carnet
  counted_in_abv INTEGER NOT NULL  -- donnée d'entrée du calcul imprimé
  cost_ht_cents INTEGER NULL       -- coût imprimé (3 lignes sur 130 ne se recalculent pas)
  note TEXT NULL
  sort_order
  INDEX (spec_id, sort_order), INDEX (ingredient_id), INDEX (product_id)
```

`reference_specs` porte le socle figé, la spécification IBA et toute autre version de référence d'un même cocktail. Les libellés de famille, de méthode et de verre y restent mot pour mot : c'est la réponse attendue par le jury. Pendant ce temps, `recipes.family`, `method` et `glass_id` reçoivent la valeur d'énumération correspondante, utile aux filtres, aux zones de référence et à la dilution. `compare.ts` compare le socle et la recette de travail, et le texte IBA avec le socle.

```
knowledge_sheets                 -- fiche culture : un cocktail, une catégorie de boissons, ou une page de carnet
  guide_id -> study_guides NULL    -- NULL : fiche rédigée par l'utilisateur
  kind ('recipe' | 'category' | 'guide') NOT NULL
  recipe_id -> recipes NULL
  number INTEGER NULL              -- numéro dans le carnet
  title TEXT NULL, title_normalized TEXT NULL   -- NULL pour 'recipe' : on affiche le nom de la recette
  subtitle TEXT NULL               -- « Bourbon, rye, Tennessee »
  group_key TEXT NULL              -- lot du carnet : 'spirits', 'liqueurs_bitters'…
  subgroup_label TEXT NULL         -- pied de carte : « Céréales », « Agave »
  class_label TEXT NULL            -- « Eau-de-vie de céréales »
  min_abv_label TEXT NULL          -- « 15 % minimum (UE), pastis 40 % »
  min_abv_pct REAL NULL            -- seulement pour un minimum chiffré
  origin_label TEXT NULL
  center_label TEXT NULL           -- étiquette centrale : « Verre rocks », « Pressé minute »
  glass_id -> glasses NULL         -- renseigné quand l'étiquette centrale est un verre
  header_badges TEXT NOT NULL DEFAULT '[]'   -- JSON string[], texte brut des pastilles
  key_takeaway TEXT NULL           -- « À retenir »
  CHECK ((kind = 'recipe') = (recipe_id IS NOT NULL))
  CHECK (kind = 'recipe' OR title IS NOT NULL)
  UNIQUE vivant (guide_id, number) ; UNIQUE vivant (guide_id, recipe_id)
  INDEX (recipe_id), INDEX (glass_id), INDEX (title_normalized)
```

La culture d'un cocktail est séparée de `recipes`. Modifier une réponse de jury ne crée donc pas de version, et `recipe_history` ne transporte pas l'histoire du cocktail à chaque instantané. Les en-têtes des fiches produits sont typés, car ils alimentent les questions « classe, TAV minimum, origine, verre ».

```
knowledge_sections               -- un bloc de la carte
  sheet_id -> knowledge_sheets NOT NULL
  key TEXT NOT NULL                -- CHECK sur la liste ci-dessous
  title TEXT NULL                  -- titre imprimé (« LE PRINCIPE », « GRANDES RÉGIONS »)
  is_ordered INTEGER               -- l'ordre des éléments compte (fabrication)
  source_code TEXT NULL, source_title TEXT NULL, source_page INTEGER NULL   -- « M1 », « Spiritueux (1/3) », 52
  sort_order
  INDEX (sheet_id, sort_order)
```

Valeurs de `key` :

- fiche `recipe` : `technique`, `pro_tips`, `history`, `variants`, `products`, `jury` ;
- fiche `category` : `fabrication`, `history`, `regulation`, `types_styles`, `tasting`, `service`, `cocktails_jury`, `brands`, `brand_directory`, `other` (cette dernière est répétable) ;
- fiche `guide` : `method`, `synthesis`, `reference_products`, `directory_legend`, `owner_groups`.

Une section vide garde son titre (fiche 1).

```
knowledge_items                  -- un fait, une puce, une question : l'unité de révision et de synchronisation
  section_id -> knowledge_sections NOT NULL
  kind ('text' | 'bullet' | 'labeled' | 'event' | 'origin' | 'qa' | 'variant' | 'brand' | 'list') NOT NULL
  attr TEXT NULL                   -- clé machine : eye, nose, mouth, in_socle, other_classics,
                                   -- version (variante non nommée), subtitle, jury_note
  label TEXT NULL                  -- étiquette de date, nom de variante, type, groupe, marque
  prompt TEXT NULL                 -- question
  body TEXT NULL                   -- paragraphe, puce, réponse, description, note de marque
  actor TEXT NULL                  -- qui : personne, ou propriétaire d'une marque
  place TEXT NULL                  -- où : lieu, origine, pays
  date_kind ('year' | 'circa' | 'range' | 'decade' | 'century' | 'after' | 'before'
             | 'alternatives' | 'relative' | 'undated') NULL
  year_from INTEGER NULL, year_to INTEGER NULL      -- années signées (« - 4000 » donne -4000)
  list_values TEXT NULL            -- JSON string[] (kind 'list')
  linked_recipe_id -> recipes NULL -- variante qui a sa fiche
  origin_doc ('notebook' | 'mind_map' | 'mind_map_short' | 'user') NULL
  in_socle INTEGER                 -- marque citée au socle
  raw_text TEXT NULL               -- ligne grise imprimée du répertoire (details_raw)
  review_note TEXT NULL, review_resolution TEXT NULL
  sort_order
  CHECK (kind <> 'qa' OR (prompt IS NOT NULL AND body IS NOT NULL))
  CHECK (kind NOT IN ('event', 'origin') OR (label IS NOT NULL AND date_kind IS NOT NULL))
  CHECK (date_kind IS NULL OR kind IN ('event', 'origin'))
  CHECK (kind <> 'list' OR (label IS NOT NULL AND list_values IS NOT NULL))
  CHECK (kind <> 'brand' OR (label IS NOT NULL AND raw_text IS NOT NULL))
  CHECK (linked_recipe_id IS NULL OR kind = 'variant')
  CHECK (year_from IS NULL OR year_to IS NULL OR year_to >= year_from)
  INDEX (section_id, sort_order), INDEX (linked_recipe_id)
```

| kind      | Colonnes                                                | Contenu MAF                                                                                                                 |
| --------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `text`    | body, attr                                              | paragraphes, notes de méthode, introductions, légende                                                                       |
| `bullet`  | body                                                    | fabrication, réglementation, service, puces produits, trucs du pro, blocs libres (texte « Libellé : texte » gardé tel quel) |
| `labeled` | label ou attr, body                                     | types et styles, dégustation (attr `eye`, `nose`, `mouth`), « Au socle », « Autres classiques », libellés `extra`           |
| `event`   | label, body, date_kind, years                           | frises                                                                                                                      |
| `origin`  | label, actor, place, body, date_kind, years             | résumé « Qui / Où »                                                                                                         |
| `qa`      | prompt, body, origin_doc                                | questions jury                                                                                                              |
| `variant` | label, body, attr, linked_recipe_id                     | variantes                                                                                                                   |
| `brand`   | label, place, actor, body, raw_text, in_socle, review_* | répertoire des marques                                                                                                      |
| `list`    | label, place, list_values, review_*                     | groupes de marques des cartes, groupes propriétaires                                                                        |

Zod applique une union discriminée sur `kind`, et les `CHECK` doublent cette validation. Ajouter un `kind` exige un générateur de questions et un test.

```
knowledge_links                  -- liens d'une fiche vers le reste du carnet, avec de vraies clés étrangères
  sheet_id -> knowledge_sheets NOT NULL
  item_id -> knowledge_items NULL  -- quand le lien naît d'un élément (marque vers bouteille)
  recipe_id -> recipes NULL
  category_id -> categories NULL
  ingredient_id -> ingredients NULL
  product_id -> products NULL
  role ('about' | 'mentions' | 'brand_of' | 'lists') NOT NULL
  is_suggested INTEGER             -- proposé par l'import, à confirmer dans l'aperçu
  sort_order
  CHECK ((recipe_id IS NOT NULL) + (category_id IS NOT NULL) + (ingredient_id IS NOT NULL) + (product_id IS NOT NULL) = 1)
  UNIQUE vivant (sheet_id, role, <cible>) : un index partiel par colonne cible
  INDEX sur chaque clé étrangère
```

Une fiche produit porte sur une catégorie (« Whiskeys américains ») et parfois sur plusieurs ingrédients (la fiche 21 couvre marasquin, cerise et violette). La fiche ingrédient de « Mon bar » affiche sa fiche culture grâce à ce lien. `lists` conserve l'ordre de la base produits du carnet. Contrairement à `notebook_links`, il n'y a pas de couple polymorphe : une purge ne laisse pas d'orphelin.

```
study_tables                     -- tableaux récapitulatifs à apprendre par cœur
  guide_id -> study_guides NOT NULL
  title TEXT NOT NULL, description TEXT NULL
  columns TEXT NOT NULL            -- JSON string[]
  quiz_columns TEXT NOT NULL       -- JSON int[] : colonnes interrogeables (pas « Réf. »)
  sort_order
  INDEX (guide_id)

study_table_rows
  table_id -> study_tables NOT NULL
  cells TEXT NOT NULL              -- JSON (string | null)[], aligné sur columns, texte imprimé
  sort_order
  INDEX (table_id, sort_order)

practice_answers                 -- journal de révision, en ajout seul
  session_id -> practice_sessions NOT NULL
  question_key TEXT NOT NULL       -- '<générateur>:<id source>[:<sous-clé>]', stable entre appareils
  generator TEXT NOT NULL
  subject_type ('recipe' | 'reference_spec' | 'sheet' | 'item' | 'table_row') NOT NULL
  subject_id TEXT NOT NULL
  expected TEXT NOT NULL           -- réponse attendue figée, lisible même si la donnée change
  response TEXT NULL
  is_correct INTEGER, self_graded INTEGER
  answered_at INTEGER NOT NULL
  INDEX (session_id), INDEX (question_key, answered_at), INDEX (subject_type, subject_id)
```

`practice_answers` alimente la liste des erreurs à revoir entre les sessions (10.11). Comme le journal ne fait qu'ajouter des lignes, la fusion entre le PC et le téléphone se réduit à une union. Sa référence polymorphe est volontaire : c'est un journal, et `expected` garde la réponse lisible même si la cible est purgée.

**Côté Drizzle**

Tout s'écrit avec les fonctions déjà utilisées dans le brouillon : `commonColumns()`, `inList`, `check`, `index` et `uniqueIndex(...).where(live(t))`. Les colonnes JSON utilisent `text(..., { mode: 'json' }).$type<string[]>()`. Exemple :

```ts
check('collection_items_target_ck', sql`(${t.recipeId} IS NULL) <> (${t.sheetId} IS NULL)`)
uniqueIndex('guide_sources_number_uq').on(t.guideId, t.number).where(live(t))
```

Bilan : 12 tables nouvelles, sans clé étrangère composite ni table virtuelle supplémentaire.

**Règles de calcul (`core/`, sans colonne)**

- **TAV méthode socle** (`abv.ts`). On compte les lignes en ml, cl ou oz, sans dilution, avec le TAV de la ligne de référence, sinon celui du produit préféré, sinon celui de l'ingrédient. Le résultat est arrondi au dixième et retrouve les 36 valeurs du carnet sur les lignes figées. Le TAV servi de la spec, avec dilution, reste affiché à côté. C'est le point « TAV méthode socle » de `DECISIONS.md`, à valider en fin de phase 3.
- **Coût** (`cost.ts`).
  - Les coûts s'additionnent en fractions de centime et ne sont arrondis qu'à la fin.
  - Le trait est converti en ml selon `dash_ml` du carnet, sinon selon le réglage global.
  - Le prix de vente au coefficient se calcule sur le coût non arrondi, puis le prix carte est arrondi selon le pas.
  - Ratio = coût HT / (prix carte TTC / (1 + TVA)).
  - Dans le contexte d'un carnet, ce sont les règles du carnet qui s'appliquent, sinon les réglages globaux.

**Contenu après import**

| Table                              | Lignes                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------ |
| `study_guides`                     | 2                                                                                                |
| `guide_sources`                    | 48 (23 + 25)                                                                                     |
| `recipes`, `recipe_history`        | 36 et 36 (version 1, libellé « Socle 2025 »)                                                     |
| `recipe_lines`                     | 130                                                                                              |
| `reference_specs`                  | 72 (36 socle, 36 IBA, dont 2 sans texte)                                                         |
| `reference_spec_lines`             | 130                                                                                              |
| `products`                         | 63 (`owned = 0`, base HT)                                                                        |
| `knowledge_sheets`                 | 86 (36 cocktails, 48 produits, 2 pages de carnet)                                                |
| `knowledge_sections`               | 657                                                                                              |
| `knowledge_items`                  | environ 2 720 (792 pour les cocktails, 1 907 pour les produits, 25 pour les pages de carnet)     |
| `source_citations`                 | 238 pour les fiches et 44 pour les lignes de tableau                                             |
| `study_tables`, `study_table_rows` | 2 et 44                                                                                          |
| `knowledge_links`                  | 63 `lists`, puis des liens `about`, `mentions` et `brand_of` proposés et confirmés dans l'aperçu |

### 2. Correspondance champ par champ

« Dérivé » signifie non stocké, recalculé par `core/` et contrôlé à l'identique par le test d'import. L'import refuse un fichier en écart.

#### `cocktails.json`

| Champ                                                                        | Destination                                                                                                                         | Remarque                                                                                                                                                                                            |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `number`                                                                     | `knowledge_sheets.number`, `collection_items.sort_order`                                                                            |                                                                                                                                                                                                     |
| `name`                                                                       | `recipes.name`, `name_normalized`                                                                                                   | `origin` 'classic', `status` 'final', `credit` = référentiel, `source` 'user'                                                                                                                       |
| `name_socle`                                                                 | dérivé                                                                                                                              | égal au nom en capitales (36/36)                                                                                                                                                                    |
| `profile`, `size`, `moment`                                                  | `recipes.profile`, `drink_length`, `serving_moment`                                                                                 |                                                                                                                                                                                                     |
| `family_label`, `family_short`                                               | `reference_specs.family_label`, `family_short_label` ; `recipes.family` par correspondance relue                                    |                                                                                                                                                                                                     |
| `method_label`                                                               | `reference_specs.method_label` ; `recipes.method` par correspondance                                                                |                                                                                                                                                                                                     |
| `glass`                                                                      | `reference_specs.glass_label` ; `recipes.glass_id`, et `ice_id` seulement si le libellé de verre ou de méthode nomme la glace pilée | « Coupe givrée au sel » donne Coupe ; timbales créées dans `glasses` si elles manquent                                                                                                              |
| `garnish`                                                                    | `recipes.garnish`, `reference_specs.garnish`                                                                                        |                                                                                                                                                                                                     |
| `ingredients[].name`                                                         | `reference_spec_lines.label` ; ingrédient résolu dans `recipe_lines.ingredient_id` et `reference_spec_lines.ingredient_id`          | « Morceau de sucre brun » et « blanc » : un seul ingrédient, la précision dans `recipe_lines.note`                                                                                                  |
| `.card_label`                                                                | `reference_spec_lines.short_label`                                                                                                  | « Maraschino » devient aussi un alias de l'ingrédient                                                                                                                                               |
| `.raw_dose`                                                                  | `reference_spec_lines.dose_text`                                                                                                    |                                                                                                                                                                                                     |
| `.quantity`, `.unit`                                                         | `recipe_lines` et `reference_spec_lines`, tels quels                                                                                |                                                                                                                                                                                                     |
| `.reference_product`                                                         | `reference_spec_lines.reference_label` et `product_id` ; `recipe_lines.preferred_product_id`                                        | les 12 lignes sans référence pointent vers le produit « à l'unité » de leur catégorie                                                                                                               |
| `.abv_pct`                                                                   | `reference_spec_lines.abv_pct`                                                                                                      | égal au `products.abv` du produit (128/128 lignes rattachées)                                                                                                                                       |
| `.counted_in_abv`                                                            | `reference_spec_lines.counted_in_abv`                                                                                               |                                                                                                                                                                                                     |
| `.volume_x_abv`                                                              | dérivé                                                                                                                              | 109/109                                                                                                                                                                                             |
| `.cost_ht_cents`                                                             | `reference_spec_lines.cost_ht_cents`                                                                                                |                                                                                                                                                                                                     |
| `.note`                                                                      | `reference_spec_lines.note`, `recipe_lines.note`                                                                                    |                                                                                                                                                                                                     |
| `garnish_cost_ht_cents`                                                      | `reference_specs.garnish_cost_ht_cents`, `recipes.garnish_cost_ht_cents`                                                            |                                                                                                                                                                                                     |
| `total_counted_volume_ml`, `total_volume_x_abv`                              | dérivés                                                                                                                             | 36/36                                                                                                                                                                                               |
| `abv.computed_pct`                                                           | dérivé des lignes figées                                                                                                            | 36/36                                                                                                                                                                                               |
| `abv.socle_pct`                                                              | `reference_specs.stated_abv_pct`                                                                                                    |                                                                                                                                                                                                     |
| `abv.explanation`                                                            | `reference_specs.abv_gap_explanation`                                                                                               |                                                                                                                                                                                                     |
| `cost.material_ht_cents`, `cost.sale_ttc_coef5_cents`, `cost.cost_ratio_pct` | `reference_specs.material_cost_ht_cents`, `sale_price_ttc_cents`, `cost_ratio_pct`                                                  | gardés tels qu'imprimés (35/36 seulement reproductibles pour les deux premiers)                                                                                                                     |
| `cost.menu_price_cents`                                                      | `collection_items.sale_price_cents` (TTC)                                                                                           | égal au PV arrondi au 0,50 € supérieur (36/36)                                                                                                                                                      |
| `technique_points`                                                           | section `technique`, élément `text`, origin_doc `notebook`                                                                          |                                                                                                                                                                                                     |
| `jury_questions[]`                                                           | section `jury`, éléments `qa` (prompt, body)                                                                                        | `carnet` donne `notebook`, `carte_mentale` donne `mind_map`                                                                                                                                         |
| `history_text`                                                               | section `history`, élément `text`                                                                                                   |                                                                                                                                                                                                     |
| `history_timeline[]`                                                         | éléments `event` (label = `date_label`, body), années analysées                                                                     | origin_doc `mind_map`                                                                                                                                                                               |
| `history_quick`                                                              | élément `origin` (label, actor = `who`, place = `where`, body = `text`)                                                             | origin_doc `mind_map_short`                                                                                                                                                                         |
| `variants[]`                                                                 | section `variants`, éléments `variant` (label, body)                                                                                | `attr` 'version' pour « Version Savoy », « Sans alcool », « Au rhum »… ; `linked_recipe_id` pour les 5 variantes qui sont des fiches du socle (Mojito, Negroni, French 75, Moscow Mule, Mint Julep) |
| `variants_text`                                                              | section `variants`, élément `text`                                                                                                  |                                                                                                                                                                                                     |
| `products_notes`, `products_card[]`                                          | section `products` : un élément `text` et des éléments `bullet`                                                                     |                                                                                                                                                                                                     |
| `iba_spec`, `iba_note`                                                       | `reference_specs` kind `iba` : `spec_text`, `note`                                                                                  |                                                                                                                                                                                                     |
| `socle_steps[]`                                                              | `recipes.steps`, `reference_specs.steps`                                                                                            |                                                                                                                                                                                                     |
| `pro_tips[]`                                                                 | section `pro_tips`, éléments `bullet`                                                                                               |                                                                                                                                                                                                     |
| `key_takeaway`                                                               | `knowledge_sheets.key_takeaway`                                                                                                     |                                                                                                                                                                                                     |
| `sources[]`                                                                  | `source_citations` (sheet_id, sort_order)                                                                                           | vers les sources du carnet cocktails                                                                                                                                                                |
| `needs_review`                                                               | non stocké                                                                                                                          | faux partout ; une valeur vraie bloque l'import (section 9)                                                                                                                                         |

#### `reference_products.json`

| Champ                                                             | Destination                                                                                     | Remarque                                                                                                                                                                               |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `source`                                                          | titre de la section `reference_products` de la fiche « page » du carnet cocktails               |                                                                                                                                                                                        |
| `intro[]`                                                         | éléments `text` de cette section                                                                |                                                                                                                                                                                        |
| `products[].category`                                             | ingrédient (`products.ingredient_id`), rapproché par `name_normalized` et les alias, sinon créé |                                                                                                                                                                                        |
| `.reference`                                                      | `products.name`, tel quel                                                                       | `brand` renseigné seulement après relecture (« Luxardo »), sinon NULL                                                                                                                  |
| `.abv_pct`, `.volume_ml`                                          | `products.abv`, `volume_ml`                                                                     |                                                                                                                                                                                        |
| `.volume_raw`                                                     | dérivé                                                                                          | de `volume_ml` (« 42,5 cl »), ou « 1 unité » pour un article compté                                                                                                                    |
| `.price_ht_cents`                                                 | `products.purchase_price_cents`, avec `purchase_price_basis` 'ht' et `reference_guide_id`       |                                                                                                                                                                                        |
| `.price_ht_per_cl_cents`                                          | dérivé                                                                                          | 57/57                                                                                                                                                                                  |
| `.note`                                                           | `products.personal_notes`                                                                       |                                                                                                                                                                                        |
| articles « à l'unité »                                            | `pack_quantity`, `pack_unit`                                                                    | menthe et basilic : 10 `leaf` ; citron vert : 0,5 `piece` ; sucre en poudre : 1 `barspoon` ; morceau de sucre : 1 `piece` ; assaisonnement : 1 `serving`                               |
| ordre de la liste                                                 | `knowledge_links` role `lists`, `sort_order`                                                    |                                                                                                                                                                                        |
| `garnishes[]` (`garnish`, `unit`, `cost_ht_cents`, `cocktails[]`) | dérivé                                                                                          | regroupement de `reference_specs` par (garniture, coût), trié par premier cocktail : 30/30, y compris la demi-tranche d'orange à 10 c et à 8 c ; `unit` vaut toujours « par cocktail » |

#### `cocktail_sources.json`

| Champ                                                                 | Destination                                                             | Remarque                                                                                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `referential`                                                         | `study_guides.edition_label`                                            |                                                                                                                        |
| `sources_intro`, `limits`                                             | `study_guides.sources_intro`, `sources_limits`                          |                                                                                                                        |
| `sources[]`                                                           | `guide_sources`                                                         |                                                                                                                        |
| `synthesis.title`, `synthesis.note[]`                                 | section `synthesis` de la page de carnet : titre et élément `text`      | le tableau est une vue calculée                                                                                        |
| `synthesis.rows[].number`, `.cocktail`, `.socle_pct`, `.computed_pct` | contrôles d'égalité                                                     | avec la fiche et la référence socle (36/36)                                                                            |
| `.gap_points`, `.highlighted`                                         | dérivés                                                                 | 36/36                                                                                                                  |
| `.explanation`                                                        | `reference_specs.abv_gap_summary`                                       |                                                                                                                        |
| `method_notes[]`                                                      | une section `method` par note (titre), un élément `text` par paragraphe | 5 sections, 8 paragraphes ; coefficient, TVA, pas d'arrondi et trait relevés aussi dans les colonnes de `study_guides` |

#### `products.json`

| Champ                                                         | Destination                                                                                      | Remarque                                                                                                                                   |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `number`, `name`, `subtitle`                                  | `knowledge_sheets.number`, `title`, `subtitle` (kind `category`) ; `collection_items.sort_order` |                                                                                                                                            |
| `family`, `footer_category`                                   | `group_key`, `subgroup_label`                                                                    |                                                                                                                                            |
| `class_label`, `min_abv_label`, `min_abv_pct`, `origin`       | colonnes de même nom (`origin_label`)                                                            |                                                                                                                                            |
| `center_label`                                                | `center_label`, avec `glass_id` résolu quand c'est un verre                                      |                                                                                                                                            |
| `glass_label`                                                 | dérivé                                                                                           | égal à `center_label` quand `glass_id` est renseigné (48/48)                                                                               |
| `header_badges`                                               | `header_badges`                                                                                  |                                                                                                                                            |
| `section_titles.*`                                            | `knowledge_sections.title` de chaque section                                                     | `jury_questions` est égal à `cocktails` (48/48), d'où une seule section `cocktails_jury` ; un titre `tasting` NULL signifie pas de section |
| `sections.fabrication[]`                                      | éléments `bullet`, section `is_ordered`                                                          |                                                                                                                                            |
| `.history_timeline[]` (et `review_note`, `review_resolution`) | éléments `event`, colonnes `review_*`                                                            | McIlhenny (fiche 48)                                                                                                                       |
| `.regulation[]`, `.service[]`                                 | éléments `bullet`                                                                                |                                                                                                                                            |
| `.types_styles[]`                                             | éléments `labeled` (label, body)                                                                 |                                                                                                                                            |
| `.tasting`                                                    | 3 éléments `labeled` (attr `eye`, `nose`, `mouth`)                                               | absent pour les fiches 1, 43, 44, 45, 46 et 48                                                                                             |
| `.cocktails.in_socle`, `.other_classics`                      | éléments `labeled` (attr) ; liens `mentions` proposés vers les fiches nommées                    | 45 et 44 textes                                                                                                                            |
| `.cocktails.extra[]`                                          | éléments `labeled` (label, body)                                                                 | 7                                                                                                                                          |
| `.jury_questions[]`                                           | éléments `qa`, origin_doc `mind_map`                                                             | 48                                                                                                                                         |
| `.brands[]` (et champs de relecture)                          | éléments `list` (label = `group`, list_values = `names`, review_*)                               | 149 groupes, 418 noms                                                                                                                      |
| `.other_blocks[]`                                             | une section `other` par bloc (titre), éléments `bullet` au texte d'origine                       | 9 blocs, 34 puces                                                                                                                          |
| `key_takeaway`                                                | `key_takeaway`                                                                                   |                                                                                                                                            |
| `sources`                                                     | `source_citations` vers les sources du carnet produits                                           |                                                                                                                                            |
| `needs_review`                                                | non stocké                                                                                       | faux partout                                                                                                                               |
| (absent du JSON)                                              | `knowledge_links` `about` vers catégories et ingrédients                                         | proposés, puis confirmés dans l'aperçu                                                                                                     |

#### Autres fichiers

| Champ                                                             | Destination                                                                                                                         | Remarque                                                                |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `product_summary_tables.json` : `title`, `description`, `columns` | `study_tables`                                                                                                                      | `quiz_columns` = toutes sauf « Réf. »                                   |
| `.rows[]`                                                         | `study_table_rows.cells` (NULL conservé)                                                                                            | la colonne « Réf. » donne aussi des `source_citations` (`table_row_id`) |
| `product_sources.json[]`                                          | `guide_sources` du carnet produits                                                                                                  |                                                                         |
| introduction et paragraphe « Limites » de `README_products.md`    | `study_guides.sources_intro`, `sources_limits`                                                                                      | c'est la seule lecture d'un README par le script                        |
| `brand_directory.json` : `legend`                                 | section `directory_legend` de la page de carnet produits, élément `text`                                                            |                                                                         |
| `.pages[].code`, `.title`, `.page`                                | `source_code`, `source_title`, `source_page` des sections `brand_directory` et `owner_groups`                                       |                                                                         |
| `.pages[].fiches`                                                 | dérivé                                                                                                                              | 8/8                                                                     |
| `.by_product[].fiche`, `.directory_title`, `.page_code`, `.page`  | section `brand_directory` de la fiche catégorie : titre et colonnes `source_*`                                                      | les fiches 1, 19 et 39 n'en ont pas                                     |
| `.by_product[].product`                                           | dérivé                                                                                                                              | titre de la fiche (45/45)                                               |
| `.by_product[].brands[]`                                          | éléments `brand` : label = `name`, place = `origin`, actor = `owner`, body = `note`, raw_text = `details_raw`, `in_socle`, review_* | 263                                                                     |
| `.owner_groups.title`, `.subtitle`, `.jury_note`                  | section `owner_groups` (titre), éléments `text` (attr `subtitle`, `jury_note`)                                                      |                                                                         |
| `.owner_groups.groups[]`                                          | éléments `list` (label = groupe, place = pays, list_values = marques)                                                               | 12 groupes, 79 noms                                                     |

**Ce qui n'est pas stocké** : les valeurs dérivées listées ci-dessus, qui sont vérifiées à l'identique, et les drapeaux `needs_review`, tous à faux et bloquants s'ils sont vrais. Aucune donnée imprimée n'est perdue. Comme l'indiquent les README, la mise en page, les couleurs, les dessins et la page « Comment lire une carte » sont absents des JSON.

### 3. Questions de révision

**Règles communes**

- **Périmètre.** Les questions viennent des `collection_items`.
- **Socle ou recette.** Pour une recette qui a une référence socle dans un carnet, les questions de recette lisent la référence figée et ses libellés. Sinon, elles lisent la recette.
- **Mauvaises réponses.** Elles viennent du même générateur, d'abord dans la collection, puis dans le même carnet. Les doublons normalisés sont écartés.
- **Format.** Avec moins de 3 mauvaises réponses distinctes, la question devient une carte mémoire notée par l'utilisateur. Une donnée vide ne génère aucune question (section 8).
- **Clé de question.** Elle est stable entre appareils : `qa:<item_id>`, `dose:<spec_id>:<line_id>`, `cell:<row_id>:<col>`.

| Type                                                              | Données lues                                                                                                                        | Forme                                                                                                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Dose, ingrédient intrus, méthode, verre, glace, décoration (spec) | `reference_spec_lines` ou `recipe_lines` ; `method_label` ou `method`, `glass_label` ou `glasses.name`, `ice_types.name`, `garnish` | QCM                                                                                                                             |
| Récitation de la recette                                          | `reference_spec_lines.label`, `dose_text` ; `glass_label`, `method_label`, `garnish`, `steps`                                       | carte                                                                                                                           |
| Short ou long, moment, famille du socle                           | `recipes.drink_length`, `serving_moment` ; `reference_specs.family_short_label`                                                     | QCM (2, 3 choix, puis libellés des autres fiches)                                                                               |
| Profil ou « À retenir » : quel cocktail ou quel produit ?         | `recipes.profile`, `knowledge_sheets.key_takeaway`                                                                                  | QCM inverse, sauf si la phrase contient le titre                                                                                |
| Calcul du TAV, méthode socle                                      | `reference_spec_lines` (quantity, unit, abv_pct, counted_in_abv)                                                                    | saisie à 0,1 point près ; corrigé : TAV calculé, `stated_abv_pct` et `abv_gap_explanation` si l'écart atteint 1,5 point         |
| TAV du socle                                                      | `reference_specs.stated_abv_pct`                                                                                                    | QCM                                                                                                                             |
| Coût, prix de vente, prix carte, ratio                            | lignes, `cost_ht_cents`, `garnish_cost_ht_cents`, règles du carnet, `collection_items.sale_price_cents`                             | saisie ; corrigé : valeurs imprimées de `reference_specs`                                                                       |
| Socle et IBA                                                      | `reference_specs` kind `iba` (`spec_text`) face aux lignes du socle ; diff de `compare.ts` si `linked_recipe_id`                    | carte, ou QCM « dose selon l'IBA »                                                                                              |
| Produit de référence                                              | `reference_spec_lines.reference_label`                                                                                              | QCM                                                                                                                             |
| Question jury                                                     | éléments `qa` (120 cartes)                                                                                                          | carte                                                                                                                           |
| Qui, où, quand                                                    | élément `origin` : actor, place, label                                                                                              | QCM                                                                                                                             |
| Frise                                                             | éléments `event`                                                                                                                    | QCM d'année seulement si `date_kind` = 'year' ; remise en ordre par `year_from` pour au moins 4 années distinctes ; carte sinon |
| Variantes                                                         | éléments `variant` : « violette, sans maraschino ? » donne Blue Moon ; « de quel cocktail le Last Word est-il une variante ? »      | QCM (`attr` NULL seulement pour la seconde forme)                                                                               |
| Truc du pro, technique, produits                                  | sections `pro_tips`, `technique`, `products`                                                                                        | carte                                                                                                                           |
| En-tête produit                                                   | `class_label`, `min_abv_pct` ou `min_abv_label`, `origin_label`, `glass_id`                                                         | QCM                                                                                                                             |
| Réglementation et fabrication à trou                              | puces contenant un nombre, masqué (« au moins __ ans en Écosse »)                                                                   | QCM numérique, mauvaises réponses prises dans les nombres de même unité du carnet                                               |
| Ordre de fabrication                                              | sections `is_ordered`                                                                                                               | remise en ordre (au moins 4 étapes)                                                                                             |
| Types et styles                                                   | `labeled` : label et body                                                                                                           | QCM dans les deux sens                                                                                                          |
| Dégustation                                                       | `labeled` attr `nose` ou `mouth` : quel produit ?                                                                                   | QCM (42 fiches)                                                                                                                 |
| Cocktails liés                                                    | `labeled` attr `in_socle`, liens `mentions`                                                                                         | QCM                                                                                                                             |
| Marques des cartes                                                | `list` (label, list_values) : « une marque d'Islay ? »                                                                              | QCM, intrus pris dans d'autres groupes                                                                                          |
| Répertoire                                                        | `brand` : actor, place, body, `in_socle`                                                                                            | QCM ou carte, avec la mention « état 2026, à revérifier » de la légende                                                         |
| Qui possède quoi                                                  | `list` de la section `owner_groups`                                                                                                 | QCM                                                                                                                             |
| Tableaux récapitulatifs                                           | `study_table_rows.cells[c]` pour `c` dans `quiz_columns`                                                                            | QCM, mauvaises réponses prises dans la même colonne                                                                             |

Chaque réponse produit une ligne de `practice_answers`. « Erreurs à revoir » et la priorité aux points faibles sont calculées par `core/practice.ts` à partir de ce journal.

### 4. Recherche, export `.shakery`, synchronisation

**Recherche FTS5 (12.1)**

| Entité                              | `title`          | `aliases`                                                       | `body`                                                                                     |
| ----------------------------------- | ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `recipe` (existante)                | nom              | libellés de famille, de méthode et de verre, noms des variantes | profil, texte IBA, tous les éléments de sa fiche culture : « Ensslin » trouve l'Aviation   |
| `sheet` (catégorie, page de carnet) | titre            | sous-titre, noms des catégories et ingrédients liés             | en-tête, labels, questions, réponses, puces, `list_values`                                 |
| `brand_entry` (263)                 | nom de la marque |                                                                 | origine, propriétaire, note, titre de la fiche ; ouvre la fiche à la section du répertoire |
| `study_table`                       | titre            |                                                                 | cellules : « 2019/787 » est trouvé                                                         |

- **Mise à jour.** Elle se fait dans la transaction d'écriture du repository. Une modification d'élément réindexe sa fiche, et la recette ou la marque concernée.
- **Classement.** Ce contenu se classe au niveau « contenu ».
- **Volume.** Environ 0,5 Mo de texte normalisé de plus, loin du budget de 50 ms.

**Export et import (12.4)**

- **Format.** `data.json` reçoit les 12 tables, dans l'ordre suivant : carnets, sources, ingrédients et produits, recettes et historique, références, fiches, sections, éléments, liens, citations, tableaux, collections, révision. Le format n'étant pas encore publié, la version reste 1 si le schéma entre en phase 1.
- **Export partiel d'une recette.** Il embarque ses références et leurs lignes, sa fiche culture, seulement les sources citées et l'en-tête du carnet. Les liens dont la cible est absente sont retirés.
- **Prix.** La case « prix », décochée par défaut, couvre `purchase_price_cents` et sa base, `garnish_cost_ht_cents`, les colonnes de coût de `reference_specs` et de `reference_spec_lines`, `sale_price_cents` et `vat_rate_bp`. À l'export, ces valeurs passent à NULL, et le manifeste l'indique.
- **Journal de révision.** `practice_answers` est exclu de l'export partiel, comme le journal de dégustation.
- **Conflit « dupliquer ».** Toutes les références sont de vraies clés étrangères, réécrites par l'import, sauf `practice_answers.subject_id` et `question_key`, que le schéma Zod liste explicitement.
- **Chemin d'import des carnets.** `scripts/maf-import/` est un outil de développement non livré. Il lit `imports/maf/` et produit une archive `.shakery`.
  - Les UUIDv7 sont déterministes : horodatage fixe de l'édition et bits aléatoires tirés d'un SHA-256 de clés comme `maf-2025/cocktails/1/history/3`.
  - L'utilisateur passe ensuite par l'import standard : aperçu, rapprochement des ingrédients et des catégories, correspondances à relire, une seule transaction.
  - Un second import déclenche « ignorer ou remplacer » au lieu de créer des doublons.

**Synchronisation future (15)**

- **Granularité.** Un fait par ligne, avec les colonnes communes. Deux modifications concurrentes sur deux éléments ne se gênent pas.
- **Dernier écrit gagnant.** Il ne s'applique qu'à l'intérieur d'un même élément.
- **Doublons d'import.** Avec des identifiants déterministes, un carnet importé sur les deux appareils produit les mêmes lignes, donc aucun doublon.
- **Suppression.** Supprimer une fiche ou un carnet supprime logiquement ses enfants dans la même transaction, avec le même `deleted_at`. Les lectures n'ont pas à joindre le parent. Les marqueurs de suppression sont gardés jusqu'à leur propagation.
- **Numéros uniques.** Une collision sur `guide_sources.number` ou `knowledge_sheets.number` se règle en renumérotant la ligne la plus récente. Les citations pointent vers des identifiants, donc restent justes.
- **Journal et calculs.** `practice_answers` se fusionne par union. Les règles de calcul du carnet voyagent avec `study_guides`. L'index FTS et les calculs ne sont jamais synchronisés.

### 5. Écarts, risques, alternatives écartées

**Écarts avec la spec, à consigner dans `DECISIONS.md` et à valider avant la migration**

1. **TVA (D-002).**
   - Réglages `pricing.*`, et règles de calcul portées par `study_guides`.
   - `sale_price_cents` défini comme prix TTC, avec la surcharge `vat_rate_bp`.
   - `purchase_price_basis` sur les produits.
   - Cela va contre « pas de TVA » (sections 2, 7, 8 et 15).
2. **`collection_items`** : la ligne pointe vers une recette ou une fiche culture, et `recipe_id` devient facultatif.
3. **`products`** :
   - articles comptés (`pack_*`), avec l'unité de prix `serving`, propre à `products` ;
   - base de prix HT ou TTC ;
   - `reference_guide_id` ;
   - produits de référence non possédés, avec un prix HT estimé.
4. **`recipes`** : 4 colonnes ajoutées. L'énumération `family` est inchangée, mais 12 fiches sur 36 tombent dans `other`.
5. **Second TAV.** La méthode socle est calculée dans `core/`, sans colonne. C'est le point déjà ouvert dans `DECISIONS.md`.
6. **Révision élargie** : environ 25 générateurs au lieu de 6, et `practice_answers`. `mistakes` devient un résumé.
7. **`entity_type` étendu** dans `notebook_links`, `recent_views` et `search_index`.
8. **Intégrité étendue.**
   - La fusion d'ingrédients (10.8) doit aussi réécrire `reference_spec_lines.ingredient_id` et `knowledge_links.ingredient_id`.
   - Un ingrédient cité par une ligne de référence ne peut pas être supprimé, seulement fusionné.
9. **Valeurs dérivées** non stockées et vérifiées par l'import. À l'inverse, des valeurs imprimées sont stockées même quand elles se recalculent en partie.
10. **Taux en points de base** : un entier qui n'est pas un montant.

**Risques**

- **Correspondances heuristiques.** Elles sont toutes relues dans l'aperçu :
  - 67 libellés d'ingrédients pour 63 catégories, dont 11 libellés qui diffèrent (« Eau-de-vie (ici gin) », « Whisky tourbé », « Nectar ou purée de pêche blanche ») ;
  - familles, méthodes et verres ;
  - catégories des fiches produits ;
  - lien entre une marque et une bouteille.

  Le texte imprimé reste toujours disponible.

- **Analyse des dates.** 121 étiquettes sur 504 n'ont aucun chiffre, et beaucoup d'autres sont des fourchettes ou des doubles dates (« 1919 (Campari) / 1947 (socle) »). Les années restent NULL en cas de doute, et le QCM d'année est réservé à `date_kind = 'year'`.
- **Socle et version de travail.** Elles divergent dès la première modification, et c'est voulu. L'interface doit les distinguer clairement : « Socle 2025 (figé) » et « Ma version ».
- **Doublons avec la base IBA de la phase 4.** Deux « Aviation » coexisteront. Le crédit les distingue, et `reference_specs.linked_recipe_id` relie le texte IBA à la fiche IBA.
- **Catégories.** Le schéma de la section 12.4 ne rapproche que les ingrédients. L'aperçu d'import doit aussi rapprocher les catégories, par `slug`.
- **Calendrier.** L'import `.shakery` est prévu en phase 10, alors que la révision arrive en phase 8 (voir C.6).
- **Prix TTC.** Le coût HT d'une bouteille achetée TTC est signalé incomplet. C'est voulu, puisqu'aucune TVA d'achat n'est devinée, mais l'interface doit l'expliquer.
- **Sucre en poudre.** Mesuré en `barspoon`, il entre comme environ 5 ml dans le TAV servi. Un drapeau « solide » sur l'ingrédient reste à décider en fin de phase 3.
- **Propriétaires datés.** Le répertoire est en « état 2026 ». La question affiche cette mention, et les éléments restent modifiables.

**Alternatives écartées**

- **Un document JSON par fiche** (dans `notebook_entries` ou ailleurs). C'est contraire à D-003. Les références sont sans clé étrangère, la révision passe par `json_each`, et un conflit de synchronisation fait perdre toute la fiche.
- **Une table par type de bloc** (frise, questions, variantes, puces de réglementation, dégustation…, une douzaine de tables). Chaque nouveau bloc demanderait une migration, et la recherche, l'export et la révision devraient interroger toutes ces tables.
- **Une recette épinglée** (`pinned_version` dans `recipe_history`) au lieu de `reference_specs`. L'instantané ne porte ni les libellés courts, ni les TAV retenus, ni les coûts imprimés.
- **Une archive des fichiers bruts dans la base.** Elle masque des pertes au lieu de les éviter et duplique environ 0,7 Mo.
- **Une liste de prix distincte de `products`.** Elle ajoute une troisième source au repli de `cost.ts`. `reference_guide_id` et `purchase_price_basis` suffisent à distinguer un prix estimé d'un prix payé.
- **Des clés étrangères composites** pour la cohérence carnet et source. Un contrôle dans le repository et un test suffisent, sans compliquer l'ordre de synchronisation.
- **Des liens polymorphes `(entity_type, entity_id)`** pour les fiches. Ils laissent des orphelins après une purge et ont été remplacés par des clés étrangères exclusives.
- **Découper le texte IBA en lignes.** Ce serait interpréter un texte, contraire à la règle 9.
- **Créer une recette par variante nommée.** Ce serait inventer des doses.
- **Des tables `people` et `places`.** Les valeurs ne sont pas des entités (« Tradition populaire », « Pat MacGarry (selon Vermeire) »).
- **Ajouter des valeurs à `family` sans décision** (voir C.5).

---

## Décisions à trancher

1. **Forme du contenu « culture ».** Trois options : fiche, section et élément typé (proposé ici, 12 tables) ; une table par type de bloc ; ou du JSON par fiche.
   - Recommandation : fiche, section, élément. C'est la lecture de D-003 (« tables et champs dédiés ») qui reste la plus simple à migrer, à exporter et à synchroniser.
2. **Socle figé.** Garder une copie du socle imprimé (`reference_specs` et ses lignes, 130 lignes en double avec la recette), ou se contenter de la recette et de son historique.
   - Recommandation : la copie figée. C'est le seul endroit où vivent les libellés du jury, les TAV retenus et les coûts imprimés non reproductibles, et elle accueille aussi la spécification IBA.
3. **Marques.** Garder le répertoire comme éléments de fiche, avec un lien facultatif vers la bouteille, ou créer tout de suite des tables `brands` et `brand_owners` normalisées.
   - Recommandation : des éléments de fiche. Les entrées sont contextuelles (Giffard trois fois avec trois notes), 19 noms sont composés et les propriétaires ne sont pas normalisés (65 libellés, « Suntory » et « Suntory Global Spirits »). Une table `brands` pourra être dérivée plus tard sans perte.
4. **Détail des prix (suite de D-002).**
   - Recommandation :
     - `sale_price_cents` en TTC ;
     - taux de TVA en points de base, avec une surcharge par élément de collection pour le sans alcool ;
     - règles du carnet (coefficient 5, TVA 20 %, arrondi au 0,50 € supérieur, trait à 0,25 ml) portées par le carnet, et non par les réglages globaux ;
     - prix d'achat avec une base HT ou TTC, sans conversion automatique : un coût dont les bases sont mélangées est signalé incomplet.
5. **Énumération `family`.** La garder et conserver le libellé du socle à côté, ou y ajouter `sparkling` (Bellini, Champagne Cocktail, Spritz) et `julep_smash` (Caipirinha, Gin Basil Smash, Mint Julep).
   - Recommandation : la garder telle quelle pour la version 1, en excluant `other` du calcul des zones de référence. Ajouter des valeurs reste possible par une migration simple si `other` gêne à l'usage.
6. **Chemin, calendrier et collections de l'import.**
   - Recommandation :
     - un script de conversion vers `.shakery` et l'import standard, sans code MAF dans l'application ;
     - avancer l'import `.shakery` (validation, aperçu, transaction, sans l'export partiel ni Open Food Facts) à la fin de la phase 3, pour réviser les carnets dès la phase 8 ;
     - deux collections, « MAF 2025 : socle des cocktails » et « MAF 2025 : fiches produits », plutôt que la collection unique de D-004. Ce point modifie D-004 et demande donc son accord.
