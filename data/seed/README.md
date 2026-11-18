# Données de départ

Référentiels fixes chargés au premier lancement (section 9 de `docs/SPEC.md`), relus à la main et versionnés.

| Fichier           | Contenu                                                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories.json` | Arbre des catégories d'ingrédients génériques : 96 nœuds sur 3 niveaux, dont 78 feuilles (« À classer » reçoit les ingrédients créés par l’idée rapide) |
| `glasses.json`    | 24 verres et contenants                                                                                                                                 |
| `ice.json`        | 8 types de glace                                                                                                                                        |

La correspondance avec les carnets MAF de l'utilisateur est décrite dans `docs/maf-mapping.md`.

## Format

- `seed_key` : identifiant stable, en anglais, jamais réutilisé ni renommé. Préfixes `cat.`, `glass.`, `ice.`.
- `categories.json` : `name`, `slug` (unique, minuscules sans accents), `parent` (seed_key du parent ou `null`), `sort_order` (ordre entre frères), `batch_hint` :
  - `ok` : se prépare d'avance dans un batch ;
  - `add_at_service` : s'ajoute au moment du service (gazeux : eaux gazeuses, tonics, sodas, vins effervescents, bières, cidres, sodas maison) ;
  - `fresh` : se prépare à la minute (jus pressés, fruits, légumes et herbes frais, œufs, lait et crème, café).
- `glasses.json` : `name`, `capacity_ml`, `sort_order`. `capacity_ml` vaut `null` partout : les contenances varient d'un modèle à l'autre et aucune n'est sourcée (règle 9 de la section 1).
- `ice.json` : `name`, `sort_order`.

Un fichier qui contient encore `needs_review: true` est refusé au chargement.

## Règles de l'arbre

- Un ingrédient se range toujours dans une feuille de l'arbre, jamais dans un nœud qui a des enfants.
- Un nœud parent porte l'indication de batch la plus restrictive de ses enfants (`fresh`, puis `add_at_service`, puis `ok`).
- Une bouteille du commerce va dans sa famille (Sirops et cordiaux du commerce, par exemple) ; une fabrication maison va sous Préparations maison.

## Règles de rangement

| Ingrédient                                                                                                      | Catégorie                               |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Liqueurs de banane, coco, litchi, melon, fruit de la passion                                                    | Liqueurs exotiques                      |
| Liqueurs de fruits rouges, à noyau, à pépins ; sloe gin                                                         | Crèmes et liqueurs de fruits            |
| Limoncello et liqueurs d'agrumes                                                                                | Liqueurs d'orange et d'agrumes          |
| Violette                                                                                                        | Marasquin, cerise et violette           |
| Sureau, rose et autres fleurs                                                                                   | Liqueurs d'épices, de miel et de fleurs |
| Applejack, eau-de-vie de cidre hors AOC                                                                         | Calvados et eaux-de-vie de cidre        |
| Raicilla, sotol, bacanora                                                                                       | Mezcal et autres agaves                 |
| Distillats sans alcool, apéritifs et amers sans alcool (Crodino, Sanbittèr)                                     | Alternatives sans alcool                |
| Cordiaux du commerce (citron vert, sureau)                                                                      | Sirops et cordiaux du commerce          |
| Laits végétaux (avoine, amande)                                                                                 | Lait, crème et boissons végétales       |
| Crème, lait et eau de coco ; crème de coco sucrée et non sucrée sont deux ingrédients distincts                 | Coco                                    |
| Agrumes entiers, pilés ou en garniture (une garniture se signale par la ligne de recette, pas par la catégorie) | Fruits et légumes frais                 |
| Piment frais, concombre, céleri branche, gingembre racine                                                       | Fruits et légumes frais                 |
| Piment séché, Tajín                                                                                             | Épices                                  |
| Sauces piquantes, sel de céleri, Worcestershire                                                                 | Sel, sauces et condiments               |
| Eau de fleur d'oranger, eau de rose, extrait de vanille                                                         | Arômes, extraits et eaux florales       |
| Acides citrique, malique, tartrique, lactique ; gomme arabique, xanthane                                        | Acides et texturants                    |
| Solution saline, solution acide maison                                                                          | Solutions salines et acides             |
| Ginger beer maison, kombucha, tepache, gazéification au siphon                                                  | Sodas et fermentés maison               |
| Milk punch, cocktail en bouteille, clarifications                                                               | Pré-mélanges et clarifications          |
| Rondelles d'agrumes déshydratées, cerises au marasquin                                                          | Cerises, fruits confits et séchés       |
| Saumure d'olive, pickles                                                                                        | Olives, pickles et saumures             |
| Mélanges à givrer (sel pimenté, sucre-cannelle) ; le sel et le sucre seuls restent dans leur catégorie          | Givrages                                |

## Glace

- « Glace pilée » : glace fine ; « Glace concassée » : gros éclats. Les carnets les confondent parfois (« pilée ou concassée »).
- « Sans glace » se choisit pour un cocktail servi sans glace dans le verre (Daiquiri en coupe). Une fiche sans glace renseignée reste « non précisé » et ne génère pas de question de révision sur la glace.

## Règles de chargement

- Au premier lancement, toutes les entrées sont ajoutées.
- À chaque mise à jour de Shakery, seules les entrées dont le `seed_key` est absent de la base sont ajoutées.
- Une entrée déjà présente n'est jamais écrasée, même si l'utilisateur l'a modifiée.
- Une entrée supprimée par l'utilisateur n'est pas recréée : son `seed_key` reste dans la base avec `deleted_at`. La purge définitive par la corbeille devra garder une trace des `seed_key` purgés pour tenir cette règle.
- Si une nouvelle entrée a le même slug qu'une catégorie créée par l'utilisateur, elle reçoit un suffixe (`-2`, `-3`...) au lieu de bloquer le chargement.
