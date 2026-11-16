# Sources des données

Ce fichier recense chaque source de données, sa licence, sa date de récupération et les choix de tri (section 9 de `docs/SPEC.md`). Toute valeur par défaut présentée dans l'interface (durées, taux de dilution, équivalences d'unités, teneurs en sucre et en acide) y est sourcée (section 1, règle 9). L'écran « À propos » affiche les attributions.

État : squelette. Les sections marquées « à remplir » le seront en phase 3 (unités, dilution) et en phase 4 (base de départ).

## Base de départ (générée au build, jamais à l'exécution)

| Source               | Usage prévu                                                                                                                                                                                | Licence et contraintes                                                                                                                       | Date de récupération | État                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------------------- |
| Wikidata (SPARQL)    | Ingrédients génériques : types de spiritueux, liqueurs, vermouths et vins fortifiés, amers, fruits, agrumes, herbes, épices. Libellés français et alias. QID conservé dans `external_ref`. | CC0. User-Agent descriptif obligatoire, requêtes paginées.                                                                                   | à remplir            | à remplir en phase 4                                    |
| Table Ciqual (Anses) | Teneur en sucres des jus et fruits, acides organiques quand la table les renseigne (`composition_source = 'ciqual'`).                                                                      | Accès gratuit, citation de la source obligatoire. Conditions et version exactes à vérifier sur la page de téléchargement au moment du build. | à remplir            | à remplir en phase 4                                    |
| Liste officielle IBA | Cocktails classiques de départ (`origin = 'classic'`, `source = 'seed_iba'`) avec leur famille.                                                                                            | Doses et ingrédients repris comme des faits, vérifiés fiche par fiche sur le site de l'IBA. Étapes réécrites en français, jamais copiées.    | à remplir            | à remplir en phase 4                                    |
| Rédigé à la main     | Arbre de catégories, verres, types de glace, méthodes, unités, allergènes, préparations classiques (sirops, orgeat, oleo saccharum, cordial…).                                             | Contenu propre au projet. Aucune `shelf_life_days` sur les préparations de départ.                                                           | sans objet           | à remplir en phase 1 (référentiels fixes) et en phase 4 |

### Composition sucre et acidité

À remplir en phase 4 : méthode de rapprochement avec Ciqual, liste des ingrédients sourcés, calculés (`computed`), lus sur étiquette (`label`) ou laissés vides. Aucune valeur n'est inventée : une liqueur sans donnée publiée reste vide et l'interface invite à la compléter avec une valeur marquée « estimée ».

### Sources écartées

- TheCocktailDB : clé de test réservée au développement et à l'usage éducatif, diffusion publique soumise à l'offre Premium, données en anglais et de qualité inégale.
- Aucun site de recettes n'est aspiré.

## Valeurs par défaut modifiables

| Valeur                                                 | Défaut proposé                                       | Source    | État                 |
| ------------------------------------------------------ | ---------------------------------------------------- | --------- | -------------------- |
| Once (oz)                                              | 30 ml (arrondi de bar) ou 29,57 ml (exact), au choix | à remplir | à remplir en phase 3 |
| Trait (dash), goutte, cuillère de bar, cuillère à café | approximations affichées comme telles                | à remplir | à remplir en phase 3 |
| Taux de dilution par méthode (shake, stir, build…)     | proposés puis validés par l'utilisateur              | à remplir | à remplir en phase 3 |

## Service à l'exécution

| Source                | Usage                                                                                                                           | Licence et contraintes                                                                                                                                                                                                                                                                                      | État              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Open Food Facts (API) | Recherche facultative d'une bouteille par code-barres, depuis le formulaire produit. Réponses brutes stockées dans `off_cache`. | ODbL : attribution et partage à l'identique. Mention « © contributeurs Open Food Facts, ODbL » partout où ces données apparaissent. 100 requêtes par minute pour la lecture de produits, 10 pour la recherche. User-Agent personnalisé obligatoire. Aucune donnée OFF dans la base de départ. Désactivable. | prévu en phase 10 |

## Données utilisateur importées

Ces données appartiennent à l'utilisateur. Elles ne sont pas livrées avec l'application et ne font pas partie de la base de départ.

### Carnets de préparation MAF (spécialité bar)

- **Contenu** : quatre carnets Word fournis par l'utilisateur. Les 36 cocktails du « Socle des cocktails de référence » (édition 2025) avec recette, famille, méthode, verre, garniture, calcul du TAV, coût matière, prix de vente, histoire, variantes, question de jury et sources ; une base produits (TAV, contenance, prix d'achat HT estimés) ; des fiches produits et des cartes mentales illustrées.
- **Usage** : import comme données de l'utilisateur dans une collection dédiée au socle MAF 2025 (décision D-004).
- **Stockage des fichiers extraits** : `imports/maf/`, exclu de git car ces fichiers contiennent des données personnelles.
- **Limites signalées par les carnets eux-mêmes** : les prix d'achat HT sont des estimations arrondies (novembre 2026), pas des relevés officiels ; certains récits d'origine ne reposent que sur la tradition orale ; pour quelques cocktails, la valeur de TAV du socle n'est pas reproductible avec la recette. L'import conserve ces mentions.
- **Sources citées dans les carnets** : le socle 2025, les fiches IBA, des textes réglementaires (notamment le règlement (UE) 2019/787 sur les boissons spiritueuses), des cahiers des charges d'appellations et des sites de producteurs. Elles sont reprises avec chaque fiche importée.
