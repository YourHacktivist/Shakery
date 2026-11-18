# Correspondance des carnets MAF avec les référentiels

Rangement des données des carnets MAF de l'utilisateur (`imports/maf/`, hors dépôt) dans les référentiels livrés (`data/seed/`). Ce document sert au script d'import de la fin de la phase 3 (D-018). Les libellés repris ici sont génériques ; aucune donnée personnelle n'y figure.

## Règles d'import

- « Blanc d'œuf (ou aquafaba) » donne deux ingrédients : le blanc d'œuf dans Œufs (allergène œufs), l'aquafaba dans Émulsifiants (sans allergène œufs).
- Les sirops de sucre et de miel du carnet ont pour référence une proportion (« 1 vol. eau / 1 vol. sucre ») : ce sont des préparations maison, rangées dans Sirops maison. Ils ne sont pas fusionnés avec le sirop simple de départ, dont la proportion peut être en poids.
- Les noms d'ingrédients créés à l'import sont sans ambiguïté (par exemple « Rhum blanc léger », « Bitter rouge italien ») ; le libellé du carnet devient un alias.
- La précision de glace d'un libellé de verre ou de méthode (« (glace pilée) ») renseigne la glace de la fiche.
- Le givrage au sel reste dans le texte de garniture : son coût est déjà dans le coût de garniture du socle, et une ligne sans prix rendrait le coût de la recette incomplet. Le shot de champagne servi à part avec le Pornstar Martini n'a pas de dose dans le carnet : il reste dans les étapes et la garniture, sans ligne de recette.
- Les articles comptés à l'unité (sucre, menthe, basilic, citron vert, assaisonnement) ont un TAV de 0 % : c'est une valeur connue, pas une valeur manquante. Sans elle, le TAV des recettes sucrées en poudre resterait incomplet.
- Les deux références de bourbon (Woodford Reserve, Buffalo Trace) donnent un seul ingrédient « Bourbon » avec deux produits.

## Conversion

Le script `scripts/maf-import/` (outil de développement, non livré) lit `imports/maf/` et écrit `imports/maf/maf-2025.shakery`, hors dépôt comme ses sources :

```bash
npm run maf:convert
```

Il construit le carnet dans une base temporaire avec les dépôts de l'application, l'exporte, puis le réimporte deux fois dans un carnet neuf : la première importation doit tout insérer, la seconde ne rien ajouter. Les identifiants sont déterministes (date d'édition fixe, flux SHA-256) : convertir à nouveau les mêmes fichiers donne la même archive. Toute valeur `needs_review` vraie, tout écart entre une fiche et le tableau de synthèse, ou tout libellé sans correspondance arrête la conversion.

Contrôle fait le 18 novembre 2026 : les 36 recettes importées ont un coût complet, égal au coût matière du carnet à l'arrondi du centime près ; le TAV servi calculé par l'application est celui du socle corrigé de la dilution.

## Familles et méthodes du socle

| Famille du socle                                                                                  | Famille Shakery  |
| ------------------------------------------------------------------------------------------------- | ---------------- |
| Sour, Sour (daisy)                                                                                | `sour`           |
| Highball, Highball (buck), Highball (buck, mule), Highball (cousin du julep), Highball fruité     | `highball`       |
| Fizz, Fizz au champagne                                                                           | `fizz`           |
| Aromatique (verre à mélange), Aromatique amer, Old-Fashioned, Cocktail de vins                    | `spirit_forward` |
| Tiki, Colada, Swizzle                                                                             | `tiki`           |
| Punch                                                                                             | `punch`          |
| Sparkling, Pilé (proche du smash), Cocktail au café, Smash, Julep, Fruité contemporain, Savoureux | `other`          |

Le libellé exact reste dans la version socle de la recette. Méthodes : « Shaker (dry shake) » donne `dry_shake`, les autres « Shaker » `shake`, « Direct au verre (swizzle) » `swizzle`, les autres « Direct au verre » `build`, « Verre à mélange » `stir`.

## Base produits du carnet cocktails (63 catégories)

| Catégorie de la base produits          | Référence du carnet              | Catégorie Shakery                        | seed_key                      |
| -------------------------------------- | -------------------------------- | ---------------------------------------- | ----------------------------- |
| Gin London Dry                         | Beefeater                        | Gin et genièvre                          | `cat.spirits.gin`             |
| Vodka                                  | Absolut Blue                     | Vodka                                    | `cat.spirits.vodka`           |
| Vodka vanille                          | Absolut Vanilia                  | Vodka                                    | `cat.spirits.vodka`           |
| Ron cubain 3 años                      | Havana Club 3 Años               | Rhum de mélasse                          | `cat.spirits.rum.molasses`    |
| Rhum blanc                             | Bacardí Carta Blanca             | Rhum de mélasse                          | `cat.spirits.rum.molasses`    |
| Rhum agricole blanc AOC Martinique     | Rhum J.M Blanc                   | Rhum agricole                            | `cat.spirits.rum.agricole`    |
| Rhum agricole ambré                    | AOC Martinique, ambré            | Rhum agricole                            | `cat.spirits.rum.agricole`    |
| Rhum vieux agricole                    | Clément VSOP                     | Rhum agricole                            | `cat.spirits.rum.agricole`    |
| Rhum vieux jamaïcain                   | Appleton Estate 8 ans            | Rhum de mélasse                          | `cat.spirits.rum.molasses`    |
| Black rum                              | Goslings Black Seal              | Rhum de mélasse                          | `cat.spirits.rum.molasses`    |
| Rum ambré                              | Mount Gay Eclipse                | Rhum de mélasse                          | `cat.spirits.rum.molasses`    |
| Cachaça                                | Cachaça 51                       | Cachaça                                  | `cat.spirits.cachaca`         |
| Tequila blanco 100 % agave             | Patrón Silver                    | Tequila                                  | `cat.spirits.tequila`         |
| Cognac VSOP                            | Rémy Martin VSOP                 | Cognac                                   | `cat.spirits.cognac`          |
| Whiskey américain (bourbon)            | Woodford Reserve                 | Whiskeys américains                      | `cat.spirits.whisky.american` |
| Bourbon                                | Buffalo Trace                    | Whiskeys américains                      | `cat.spirits.whisky.american` |
| Blended scotch whisky                  | The Famous Grouse                | Scotch whisky                            | `cat.spirits.whisky.scotch`   |
| Single malt tourbé d'Islay             | Laphroaig 10 ans                 | Scotch whisky                            | `cat.spirits.whisky.scotch`   |
| Vermouth rouge                         | Martini Rosso (TAV socle 14,5 %) | Vermouths                                | `cat.wines.vermouth`          |
| Vermouth dry                           | Noilly Prat Original Dry         | Vermouths                                | `cat.wines.vermouth`          |
| Bitter                                 | Campari                          | Bitters apéritifs                        | `cat.bitters.aperitif`        |
| Sherry fino                            | Tío Pepe                         | Xérès                                    | `cat.wines.sherry`            |
| Liqueur de marasquin                   | Luxardo Maraschino               | Marasquin, cerise et violette            | `cat.liqueurs.cherry_violet`  |
| Crème de violette                      | Rothman & Winter                 | Marasquin, cerise et violette            | `cat.liqueurs.cherry_violet`  |
| Crème de mûre                          | Giffard                          | Crèmes et liqueurs de fruits             | `cat.liqueurs.fruit`          |
| Triple sec                             | Cointreau                        | Liqueurs d'orange et d'agrumes           | `cat.liqueurs.orange`         |
| Curaçao orange                         | Pierre Ferrand Dry Curaçao       | Liqueurs d'orange et d'agrumes           | `cat.liqueurs.orange`         |
| Liqueur de café                        | Kahlúa                           | Liqueurs de café, de cacao et à la crème | `cat.liqueurs.coffee_cream`   |
| Liqueur de fruit de la passion         | Passoã                           | Liqueurs exotiques                       | `cat.liqueurs.exotic`         |
| Liqueur de pêche                       | Peachtree                        | Crèmes et liqueurs de fruits             | `cat.liqueurs.fruit`          |
| Velvet Falernum                        | John D. Taylor's                 | Liqueurs d'épices, de miel et de fleurs  | `cat.liqueurs.spice_honey`    |
| Champagne brut                         | Champagne brut AOC               | Champagne                                | `cat.sparkling.champagne`     |
| Vin effervescent (Prosecco DOC)        | Prosecco DOC brut                | Autres effervescents                     | `cat.sparkling.other`         |
| Aromatic bitters                       | Angostura                        | Bitters cocktail                         | `cat.bitters.aromatic`        |
| Bitters orange                         | Angostura Orange                 | Bitters cocktail                         | `cat.bitters.aromatic`        |
| Sirop de sucre                         | 1 vol. eau / 1 vol. sucre        | Sirops maison                            | `cat.preps.syrups`            |
| Sirop de miel                          | 1 vol. miel / 1 vol. eau         | Sirops maison                            | `cat.preps.syrups`            |
| Sirop de vanille                       | Monin                            | Sirops et cordiaux du commerce           | `cat.sweeteners.syrups`       |
| Sirop d'orgeat                         | Monin                            | Sirops et cordiaux du commerce           | `cat.sweeteners.syrups`       |
| Sirop d'agave                          | Monin                            | Sirops et cordiaux du commerce           | `cat.sweeteners.syrups`       |
| Sirop de grenadine                     | Monin                            | Sirops et cordiaux du commerce           | `cat.sweeteners.syrups`       |
| Jus de citron frais                    | pressé minute                    | Jus d'agrumes frais                      | `cat.juices.citrus`           |
| Jus de citron vert frais               | pressé minute                    | Jus d'agrumes frais                      | `cat.juices.citrus`           |
| Nectar de cranberry                    | Ocean Spray                      | Jus et nectars en bouteille              | `cat.juices.bottled`          |
| Jus d'orange frais                     | pressé minute                    | Jus d'agrumes frais                      | `cat.juices.citrus`           |
| Jus d'ananas                           | pur jus                          | Jus et nectars en bouteille              | `cat.juices.bottled`          |
| Jus de pamplemousse frais              | pressé minute                    | Jus d'agrumes frais                      | `cat.juices.citrus`           |
| Jus de tomate                          | pur jus                          | Jus et nectars en bouteille              | `cat.juices.bottled`          |
| Crème de noix de coco                  | Coco López                       | Coco                                     | `cat.fruits.coconut`          |
| Purée de fruit de la passion           | Boiron                           | Purées et coulis                         | `cat.fruits.puree`            |
| Purée de pêche blanche                 | Boiron                           | Purées et coulis                         | `cat.fruits.puree`            |
| Café espresso                          | extraction minute                | Café                                     | `cat.coffee_tea.coffee`       |
| Eau gazeuse                            | eau de Seltz                     | Eaux gazeuses                            | `cat.mixers.sparkling_water`  |
| Ginger beer                            | Fever-Tree                       | Ginger beer et ginger ale                | `cat.mixers.ginger`           |
| Ginger ale                             | Fever-Tree                       | Ginger beer et ginger ale                | `cat.mixers.ginger`           |
| Jus de gingembre frais                 | centrifugé                       | Autres jus frais                         | `cat.juices.fresh`            |
| Blanc d'œuf (ou aquafaba)              | œuf frais pasteurisé             | Œufs                                     | `cat.dairy.eggs`              |
| Sucre en poudre (bar spoon)            | à l'unité                        | Sucres                                   | `cat.sweeteners.sugars`       |
| Morceau de sucre                       | à l'unité                        | Sucres                                   | `cat.sweeteners.sugars`       |
| Feuilles de menthe (10)                | à l'unité                        | Herbes et fleurs fraîches                | `cat.seasonings.herbs`        |
| Feuilles de basilic (10)               | à l'unité                        | Herbes et fleurs fraîches                | `cat.seasonings.herbs`        |
| Citron vert en morceaux (1/2)          | à l'unité                        | Fruits et légumes frais                  | `cat.fruits.fresh`            |
| Sel de céleri, Tabasco, sauce anglaise | à l'unité                        | Sel, sauces et condiments                | `cat.seasonings.condiments`   |

## Fiches produits (48 fiches)

La première catégorie est le rattachement principal de la fiche culture ; les suivantes sont des liens supplémentaires.

| Fiche                                     | Catégories Shakery                                                      | seed_key                                               |
| ----------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| 1. Distillation et vieillissement         | Spiritueux                                                              | `cat.spirits`                                          |
| 2. Whisky écossais                        | Scotch whisky                                                           | `cat.spirits.whisky.scotch`                            |
| 3. Whiskeys américains                    | Whiskeys américains                                                     | `cat.spirits.whisky.american`                          |
| 4. Irish et whiskies du monde             | Irish whiskey, Whiskies du monde                                        | `cat.spirits.whisky.irish`, `cat.spirits.whisky.world` |
| 5. Rhum agricole                          | Rhum agricole                                                           | `cat.spirits.rum.agricole`                             |
| 6. Rhums de mélasse                       | Rhum de mélasse                                                         | `cat.spirits.rum.molasses`                             |
| 7. Cachaça                                | Cachaça                                                                 | `cat.spirits.cachaca`                                  |
| 8. Tequila                                | Tequila                                                                 | `cat.spirits.tequila`                                  |
| 9. Mezcal                                 | Mezcal et autres agaves                                                 | `cat.spirits.mezcal`                                   |
| 10. Vodka                                 | Vodka                                                                   | `cat.spirits.vodka`                                    |
| 11. Gin et genièvre                       | Gin et genièvre                                                         | `cat.spirits.gin`                                      |
| 12. Cognac                                | Cognac                                                                  | `cat.spirits.cognac`                                   |
| 13. Armagnac                              | Armagnac                                                                | `cat.spirits.armagnac`                                 |
| 14. Calvados                              | Calvados et eaux-de-vie de cidre, Vins doux naturels et vins de liqueur | `cat.spirits.calvados`, `cat.wines.vdn`                |
| 15. Brandies du monde et pisco            | Brandies et pisco                                                       | `cat.spirits.brandy`                                   |
| 16. Eaux-de-vie de fruits et marcs        | Eaux-de-vie de fruits et marcs                                          | `cat.spirits.fruit_brandy`                             |
| 17. Anisés et absinthe                    | Anisés et absinthe                                                      | `cat.spirits.anise`                                    |
| 18. Spiritueux du monde                   | Spiritueux du monde                                                     | `cat.spirits.world`                                    |
| 19. Les liqueurs : bases                  | Liqueurs et crèmes                                                      | `cat.liqueurs`                                         |
| 20. Liqueurs d'orange                     | Liqueurs d'orange et d'agrumes                                          | `cat.liqueurs.orange`                                  |
| 21. Marasquin, cerise, violette           | Marasquin, cerise et violette                                           | `cat.liqueurs.cherry_violet`                           |
| 22. Crèmes et liqueurs de fruits          | Crèmes et liqueurs de fruits                                            | `cat.liqueurs.fruit`                                   |
| 23. Liqueurs exotiques                    | Liqueurs exotiques                                                      | `cat.liqueurs.exotic`                                  |
| 24. Chartreuse et liqueurs de plantes     | Liqueurs de plantes                                                     | `cat.liqueurs.herbal`                                  |
| 25. Épices, miel et fleurs                | Liqueurs d'épices, de miel et de fleurs                                 | `cat.liqueurs.spice_honey`                             |
| 26. Café, cacao et crème                  | Liqueurs de café, de cacao et à la crème                                | `cat.liqueurs.coffee_cream`                            |
| 27. Amande, noix et noisette              | Liqueurs d'amande, de noix et de noisette                               | `cat.liqueurs.nut`                                     |
| 28. Bitters apéritifs                     | Bitters apéritifs                                                       | `cat.bitters.aperitif`                                 |
| 29. Gentiane et amers français            | Gentiane et amers français                                              | `cat.bitters.gentian`                                  |
| 30. Amari et liqueurs amères              | Amari et liqueurs amères                                                | `cat.bitters.amari`                                    |
| 31. Bitters aromatiques                   | Bitters cocktail                                                        | `cat.bitters.aromatic`                                 |
| 32. Vermouths                             | Vermouths                                                               | `cat.wines.vermouth`                                   |
| 33. Quinquinas et apéritifs à base de vin | Quinquinas et apéritifs à base de vin                                   | `cat.wines.quinquina`                                  |
| 34. Xérès (sherry)                        | Xérès                                                                   | `cat.wines.sherry`                                     |
| 35. Porto, madère, marsala                | Porto, madère et marsala                                                | `cat.wines.port`                                       |
| 36. VDN et vins de liqueur                | Vins doux naturels et vins de liqueur                                   | `cat.wines.vdn`                                        |
| 37. Champagne                             | Champagne                                                               | `cat.sparkling.champagne`                              |
| 38. Autres effervescents                  | Autres effervescents                                                    | `cat.sparkling.other`                                  |
| 39. Vins tranquilles au bar               | Vins tranquilles                                                        | `cat.wines.still`                                      |
| 40. Bières                                | Bières                                                                  | `cat.beer_cider.beer`                                  |
| 41. Cidres et poirés                      | Cidres et poirés                                                        | `cat.beer_cider.cider`                                 |
| 42. Saké                                  | Saké                                                                    | `cat.beer_cider.sake`                                  |
| 43. Sirops et sucres                      | Sirops et sucres, Sirops maison                                         | `cat.sweeteners`, `cat.preps.syrups`                   |
| 44. Agrumes et jus                        | Jus et nectars, Fruits et légumes frais                                 | `cat.juices`, `cat.fruits.fresh`                       |
| 45. Purées, coco et émulsifiants          | Purées et coulis, Coco, Œufs, laitages et émulsifiants                  | `cat.fruits.puree`, `cat.fruits.coconut`, `cat.dairy`  |
| 46. Sodas, tonics et eaux gazeuses        | Eaux, sodas et tonics                                                   | `cat.mixers`                                           |
| 47. Café, thé et infusions                | Café, thé et infusions                                                  | `cat.coffee_tea`                                       |
| 48. Herbes, épices et assaisonnements     | Herbes, épices et assaisonnements, Givrages                             | `cat.seasonings`, `cat.garnishes.rims`                 |

## Verres du carnet cocktails (14 libellés)

| Verre du carnet cocktails | Verre Shakery                     | Glace                       | Remarque                                             |
| ------------------------- | --------------------------------- | --------------------------- | ---------------------------------------------------- |
| Coupe                     | Coupe (`glass.coupe`)             |                             |                                                      |
| Coupe + verre shot        | Coupe (`glass.coupe`)             |                             | le shot servi à part devient une ligne de la recette |
| Coupe givrée au sel       | Coupe (`glass.coupe`)             |                             | givrage : ligne de garniture                         |
| Flûte                     | Flûte (`glass.flute`)             |                             |                                                      |
| Highball                  | Highball (`glass.highball`)       |                             |                                                      |
| Highball (glace pilée)    | Highball (`glass.highball`)       | Glace pilée (`ice.crushed`) |                                                      |
| Highball givré au sel     | Highball (`glass.highball`)       |                             | givrage : ligne de garniture                         |
| Martini                   | Verre à martini (`glass.martini`) |                             |                                                      |
| Nick & Nora               | Nick & Nora (`glass.nick_nora`)   |                             |                                                      |
| Rocks                     | Rocks (`glass.rocks`)             |                             |                                                      |
| Rocks (glace pilée)       | Rocks (`glass.rocks`)             | Glace pilée (`ice.crushed`) |                                                      |
| Timbale julep             | Timbale julep (`glass.julep`)     |                             |                                                      |
| Timbale mule              | Mug en cuivre (`glass.mule`)      |                             |                                                      |
| Verre à vin               | Verre à vin (`glass.wine`)        |                             |                                                      |

## Verres des fiches produits (16 libellés)

| Verre des fiches produits | Verre Shakery                          |
| ------------------------- | -------------------------------------- |
| Bolée                     | Bolée (`glass.bolee`)                  |
| Caballito                 | Verre à shot (`glass.shot`)            |
| Copa                      | Copa (`glass.copa`)                    |
| Copita                    | Verre de dégustation (`glass.tasting`) |
| Flûte                     | Flûte (`glass.flute`)                  |
| Highball                  | Highball (`glass.highball`)            |
| Tokkuri et ochoko         | gardé en texte dans la fiche           |
| Veladora                  | Verre à shot (`glass.shot`)            |
| Verre digestif            | Verre à liqueur (`glass.liqueur`)      |
| Verre dégustation         | Verre de dégustation (`glass.tasting`) |
| Verre martini             | Verre à martini (`glass.martini`)      |
| Verre rocks               | Rocks (`glass.rocks`)                  |
| Verre shot                | Verre à shot (`glass.shot`)            |
| Verre à bière             | Verre à bière (`glass.beer`)           |
| Verre à pastis            | Verre à pastis (`glass.pastis`)        |
| Verre à vin               | Verre à vin (`glass.wine`)             |
