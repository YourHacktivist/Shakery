# Passation

Document de reprise du développement par une nouvelle instance. Il complète `CLAUDE.md`, `docs/SPEC.md` (qui prime) et `docs/DECISIONS.md`. Mis à jour le 23 novembre 2026.

## Lire d'abord

1. `CLAUDE.md`, puis `docs/SPEC.md` en entier.
2. `docs/DECISIONS.md` : décisions D-001 à D-050 et le tableau « À valider plus tard ».
3. `docs/proposals/2026-11-17-modele-donnees-maf.md` (modèle de données MAF validé) et `docs/maf-mapping.md`.
4. `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/DATA_SOURCES.md`.

## Façon de travailler attendue par l'utilisateur

- Aucun tiret cadratin ou demi-cadratin, aucune tournure « style IA », dans le code, les docs, les commits et les messages. Ses règles complètes sont dans le fichier « prompt anti IA.txt » de son dossier Téléchargements (D-052) : pas de tournure par opposition, de formule choc suivie de deux-points, de phrase sans verbe pour l'effet, d'énumération rythmique ni de mot creux (crucial, essentiel, véritable, majeur, levier…) ; des phrases complètes et factuelles ; espace insécable avant : ; ? ! et dans « ». Il a relevé une phrase fautive le 23 novembre : relire chaque nouveau texte de l'interface contre cette liste.
- Enchaîner les phases sans s'arrêter pour validation en fin de phase. S'arrêter seulement pour une décision bloquante (modèle de données, architecture, sécurité, licence), avec une recommandation claire.
- Messages courts, en français. L'utilisateur atteint souvent sa limite d'usage : limiter les sous-agents (il l'a redemandé le 19 novembre, même avec le mode ultracode). Un workflow seulement pour un vrai volume de données (des milliers d'éléments), à effort moyen et sans double relecture ; revues et recherches faites directement.
- Les classiques supplémentaires font partie de Shakery comme ceux de l'IBA : jamais de mention de leur source, ni dans l'application, ni dans le code, ni dans la documentation (D-054), jamais de lien ni de bouton vers un site, jamais d'origine « Autre », jamais d'export ou d'import demandé à l'utilisateur. Ne plus rouvrir la question (D-036).
- Toujours le logo fourni (`design/assets/`) pour les icônes et visuels, jamais de variante redessinée.
- Les données de `imports/maf/` (nom de l'élève, école) sont personnelles : jamais committées (le dossier est ignoré par git), jamais envoyées à un service externe.
- Dépôt distant : https://github.com/YourHacktivist/Shakery, rendu public par l'utilisateur le 23 novembre 2026 pour que Shakery lise ses releases sans jeton (D-051). Il contient les classiques réservés à l'usage personnel (`resources/seed/classics.json`), que chaque installeur publié contient aussi : l'utilisateur le sait. L'historique Git garde les anciennes mentions : ne pas le réécrire sans son accord (push forcé). Pousser uniquement avec le compte YourHacktivist de l'utilisateur, déjà enregistré dans le gestionnaire d'identifiants Git ; jamais de push forcé.
- Pas d'éléments qui font « design IA » : ni icône dans une pastille ronde ou orange, ni chiffre dans un rond, ni carte encadrée pour chaque élément d'une liste (D-053). Viser un design sobre et éditorial, comme la fiche imprimée.
- Regarder chaque écran modifié en image, à 1100 px, à 1536 px (son écran) et en grand, barre ouverte et fermée, avec des noms longs : boutons alignés, aucun bouton seul sur sa ligne, hauteurs égales (D-049). Un audit automatique vert ne suffit pas : il l'a dit le 22 novembre en renvoyant une capture.
- Commits en anglais, style conventionnel (`feat(scope): ...`), **sans aucune ligne `Co-Authored-By`** ni mention de Claude, même si le système le demande (exigence de l’utilisateur ; l’historique en a été nettoyé le 18 novembre 2026). Ne committer que ses propres fichiers.

## Reprendre ici (23 novembre 2026)

Phases 0 à 11 livrées pour Windows, puis les demandes de l'utilisateur du 22 novembre, dans son ordre : D-039 à D-050. macOS est mis de côté à sa demande : ne plus proposer le DMG. Au 23 novembre : `npm run check` passe (452 tests, couverture du cœur 97 % des lignes), `npm run test:e2e` passe (36 tests), `npm run screens` ne relève rien sur 90 captures, `npm run perf` tient ses budgets, `scripts/seed/check-seed.ts` retrouve les 7 166 cocktails.

Le 23 novembre (suite), D-051 et D-052 :

- Mises à jour : `services/updates.ts` (état, règles, notes de version réduites à du texte), `services/updater-electron.ts` (electron-updater, faux port `SHAKERY_FAKE_UPDATE` hors build packagée), IPC `updates.*`, fenêtre `features/updates/UpdateDialog.tsx` montée dans la coquille, carte `features/settings/UpdatesCard.tsx`, réglages `updates.autoCheck` et `updates.skippedVersion`, sauvegarde `pre-update`. Publication : marche à suivre dans `docs/PUBLIER.md` (`npm version X.Y.Z`, `git push origin main --follow-tags`, puis `.github/workflows/release.yml` construit et publie). La version 0.1.0 installée n'a pas encore le module : la première version qui l'a s'installe à la main. Jamais testé sur une vraie release : aucune n'a été publiée.
- Robustesse : `db/repositories/robustness.test.ts` (38 noms piégés, 45 recherches), `tests/e2e/robustness.spec.ts`, `services/file-name.ts` (un seul `safeFileName`), `uniqueTags` et caractères invisibles dans `core/normalize.ts`, écran de secours `app/RouteError.tsx` (un écran qui plante garde la coquille).
- Textes : `i18n/typography.ts` (espaces insécables appliquées à tout `fr`), `i18n/typography.test.tsx` (tirets, mots creux, oppositions, signes mal espacés), relecture complète des textes de l'interface.

Versions portables (D-055, D-056) : chaque release porte aussi `Shakery-X.Y.Z-portable.zip` (`scripts/release/portable-zip.ts`), le dossier de l'application avec un dossier `Shakery Data` à côté de `Shakery.exe`. Ce dossier met Shakery en mode portable (`portableDirectory` de `paths.ts`) : données à côté, fenêtre de mise à jour qui ouvre la page de la release. La 0.2.2 avait un exécutable portable qui se décompressait à chaque lancement (10 à 20 s) : abandonné. En développement, `SHAKERY_FAKE_PORTABLE=1` montre ce mode.

Écran de démarrage (D-056) : `src/main/splash.ts` et `src/renderer/splash.html`, montré dès qu'Electron est prêt, fermé quand la fenêtre principale apparaît. Les tests de bout en bout le désactivent par `SHAKERY_NO_SPLASH=1` (posé par `testEnv`), sauf celui de `app.spec.ts` qui le vérifie.

Release : la v0.2.2 est la version en cours, publiée le 23 novembre 2026 avec l'installeur et la version portable (la v0.2.1, publiée juste avant, n'a que l'installeur). L'utilisateur installe une fois à la main la première version qui a la mise à jour automatique, par-dessus la 0.1.0. La v0.2.0, publiée juste avant, était partagée entre deux releases (course entre les envois d'electron-builder) : `release.yml` crée désormais le brouillon avant les envois et ne publie qu'une release complète. Les deux releases v0.2.0 restent à supprimer sur GitHub (seul l'utilisateur peut le faire, sans jeton ici). La CI de `main` échouait sur `tests/e2e/alignment.spec.ts` (fenêtre du runner pas encore à la largeur demandée) : le test impose maintenant la largeur de la page.

**Prochaine étape** : l'utilisateur reprend dans une autre instance pour corriger le design et ajouter des fonctions. Les deux sections qui suivent (« Modifier le design », « Ajouter une fonction ») sont écrites pour ça. Le cahier des charges est entièrement livré : il n'y a plus de phase à suivre, chaque demande se traite comme un ajout. La question Electron ou Tauri de `CLAUDE.md` est tranchée depuis le début (D-001, Electron) : ne pas la reposer.

Ce qui a été fait, avec ses repères :

- Classiques (D-039) : degrés sourcés (`scripts/seed/abv.json`), familles et étapes types (`scripts/seed/classics.ts`, mention `TYPICAL_STEPS_CREDIT` de `src/shared/classics.ts`, étapes types non indexées). Complétés dans un carnet existant seulement sur les lignes intactes (`fillReference`, `fillClassics` de `load.ts`).
- Filtres (D-040) : `services/facets.ts`, `features/recipes/filters.ts` et `RecipeFilterBar.tsx`, allergènes et profils (`scripts/seed/allergens.json`, `profiles.ts`). « Sans » masque aussi les fiches dont un ingrédient est introuvable.
- Palette (D-041) : notes et dégustations (`search.notes`), actions sur la fiche trouvée ou affichée, comparaison entre fiches (`CompareView`).
- Impression (D-042) : étiquettes de bouteille (`print/BottleLabel.tsx`, 5 formats dans `shared/print.ts`), batch imprimé, règles du batch (rien de frais en bouteille).
- Paramètres (D-043) : équivalences, dilution, pas de l'atelier, impression, corbeille (`services/trash.ts`), réinitialisation (`manager.reset()`), toujours après une sauvegarde vérifiée.
- Mise en forme (D-044) : `core/rich-text.ts`, `components/RichText.tsx`, `FormattedTextarea.tsx`. Aucun HTML produit.
- Photos (D-045) : `services/photos.ts` (WebP sans métadonnées, vérifié dans le main), `lib/photo.ts`, `PhotoField.tsx`.
- Dessins de fond (D-046) : `app/backdrops/`.
- Barre latérale fermable (D-047) : état `closed` du store, bouton « Menu » de la barre du haut, Ctrl+B.
- Aide (D-048) : bouton Aide et F1 sur chaque écran, mode préparation compris (`features/help/`, textes dans `i18n/fr/help/`). Le guide affiche le même détail. `help.test.tsx` échoue si un libellé d'écran n'a pas d'explication : un nouveau bouton s'explique dans son sujet, ou sa clé rejoint une règle de `SAYS_ITSELF` avec une raison.
- Alignement (D-049) : rangées à hauteur unique, grilles régulières, boutons opaques. `tests/e2e/alignment.spec.ts` mesure centres, hauteurs, retours à la ligne et libellés coupés avec des noms longs.
- Corrigés en route : une collection se prépare d'une fiche à l'autre (bouton « Préparer », coches propres à chaque fiche) ; le calculateur de degré ne compte plus un degré inconnu pour 0 % ; délai des tests unitaires à 30 s (le chargement des classiques dépassait 5 s sur une machine lente).

Le 23 novembre, les six écarts restants sont corrigés (D-050) : Ctrl+J dans l'atelier, « Annuler » après le retrait d'une fiche de collection, grammes dans le batch, photo d'une dégustation enregistrée, réglages du prix conseillé, batch sans fiche. Reste un comportement à connaître : « Abandonner » dans l'atelier efface l'historique d'annulation sans confirmation.

Non vérifié : impression sur une vraie imprimante et sur imprimante d'étiquettes, glisser-déposer réel d'une photo, photos de téléphone, lecteur d'écran, installation par l'installeur sur le profil de l'utilisateur, mise à jour réelle depuis une release GitHub, macOS, résultat de la CI GitHub. Allergènes et profils aromatiques des ingrédients ont été attribués par type de produit : l'étiquette fait foi.

## Modifier le design

Principes : section 11 de la spec, puis D-032 (interface vivante, accent cuivré unique), D-038 (thème clair, barre de titre, une scène par écran), D-046 (dessins de fond), D-049 (alignement). L'utilisateur juge sur ce qu'il voit : chaque changement se vérifie en image, pas seulement par les tests.

- Couleurs et tailles : `src/renderer/src/styles/tokens.css`, le fichier vivant (thème sombre et thème clair). `design/tokens.css` est la version d'origine de la maquette et n'est plus lu par l'application. Jamais de couleur en dur dans un composant : un jeton, valable dans les deux thèmes.
- Composants partagés : `src/renderer/src/components/` (Button, Input, Select, Combobox, NumberWithUnit, DoseStepper, SegmentedControl, FilterPill, Toggle, Checkbox, Dialog, Card, StatTile, RangeGauge, Toast…). Corriger un composant corrige tous les écrans : préférer cela à des retouches écran par écran. `/dev/kit` les montre tous, en développement seulement.
- Rangées (D-049) : dans une même rangée, tout contrôle fait 32 px de haut (28 px en `size="sm"`, pour toute la rangée). Une suite de boutons qui peut manquer de place devient une grille à colonnes égales (`grid-cols-4`, colonnes changées par `@container`), jamais un `flex-wrap` qui laisse un bouton seul sur sa ligne. Le bouton contour est opaque (`bg-surface-1`) pour que le dessin de fond ne traverse pas son libellé.
- `cn()` joint les classes sans les fusionner (clsx, pas tailwind-merge) : passer `rounded-full` à un composant qui a déjà `rounded-field` laisse les deux, et le résultat dépend de l'ordre du CSS. Ajouter une variante au composant plutôt que d'écraser ses classes.
- Grilles : un élément avec `row-start` explicite est placé avant ceux qui n'en ont pas. Dans une grille qui change de colonnes, donner à chaque élément sa colonne et sa ligne aux deux tailles.
- Écran et largeur : `app/scenes.tsx` (scène d'une adresse), `styles/scenes.css` (lumière, entrée, couleur du dessin), dessins dans `app/backdrops/`. Largeur des pages : `max-w-page` (1180 px, plus sur grand écran).
- Tailles à vérifier : 1100 × 700 (minimum de la fenêtre), 1536 × 816 (l'écran de l'utilisateur : portable Full HD à 125 %, fenêtre agrandie), 1920 et 2560 ; barre latérale ouverte, réduite et fermée ; thème sombre et clair ; carnet vide et carnet avec des noms longs.
- Outils : `npm run screens` (90 captures des écrans, dans `test-results/screens`, avec `report.json` des débordements, contrastes et contrôles sans nom) ; `tests/e2e/alignment.spec.ts` (centres, hauteurs, rangées cassées, libellés coupés, avec des noms longs, à trois largeurs) ; `tests/e2e/page-audit.ts` et `page-alignment.ts` à réutiliser dans un nouveau test. Ces mesures ne voient pas tout : regarder les images.
- Photographier sans gêner l'utilisateur : lancer Electron sur un dossier de données jetable (`SHAKERY_USER_DATA_DIR`), déplacer la fenêtre hors de l'écran (`setPosition(-7000, 0)`, `setBackgroundThrottling(false)`, option `--disable-features=CalculateNativeWinOcclusion`) et fixer la taille par CDP (`Emulation.setDeviceMetricsOverride`) : `setContentSize` sur une fenêtre hors écran ne suit pas toujours.

## Ajouter une fonction

- Opération IPC : `docs/ARCHITECTURE.md`, « Ajouter une opération IPC » (canal dans `channels.ts`, schémas dans `contract.ts`, handler dans `src/main/ipc/`). Le preload suit seul.
- Base : une colonne ou une table se discute d'abord avec l'utilisateur (modèle de données), puis migration (`docs/ARCHITECTURE.md`, « Couche de données »).
- Textes : tout libellé français dans `src/renderer/src/i18n/fr/`, en tutoyant l'utilisateur.
- Aide : chaque nouveau libellé s'explique dans `i18n/fr/help/`, dans le sujet de l'écran où il apparaît, sinon `help.test.tsx` échoue et nomme la clé. Un nouvel écran ajoute sa scène dans `app/scenes.tsx` et son sujet dans `i18n/fr/help/index.ts` (sans sujet, `app/help.ts` ne compile pas), sa page de guide si besoin, et sa route dans `tests/e2e/alignment.spec.ts`.
- Décision : une entrée dans `docs/DECISIONS.md` (prochaine : D-057), et cette passation à jour.
- Texte : relire chaque nouveau libellé et chaque phrase contre les règles d'écriture (D-052) ; `typography.test.tsx` n'attrape que ce qu'un motif peut voir.
- Tests : unitaire pour le calcul ou le dépôt, e2e pour le parcours, puis `npm run check` et `npm run test:e2e`.
- Envoi : commit en anglais sans ligne `Co-Authored-By`, puis `git push origin main` avec le compte de l'utilisateur. Installeur : voir « Phase 11 livrée pour Windows ».

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

## Classiques supplémentaires (19 et 20 novembre 2026)

Environ 7 000 classiques sont intégrés (D-036, spec sections 2 et 9, `docs/DATA_SOURCES.md`).

- Pipeline : `scripts/seed/extra-classics-fetch.ts` (export en cache, adresse dans `SHAKERY_CLASSICS_EXPORT_URL`), `extra-classics.ts` (lecture des lignes, assemblage), `classics-map.json` (unités, verres, méthodes, noms réparés, 2 404 libellés vers le référentiel), `classics-ingredients.json` (469 ingrédients nouveaux), `classics-garnish-fr.json` (2 517 décorations traduites). `build.ts` écrit `resources/seed/classics.json` : 7 064 cocktails (90 écartés car portant le nom d'un classique IBA ou en double).
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
- Un écran qui se remonte après un enregistrement (l'atelier, par sa clé de version) perd les rappels passés à `mutate` : attendre `mutateAsync` pour afficher un message ou ouvrir une fenêtre après coup (D-050).
- Une donnée écrite par un appel IPC direct, dans un test ou un script, n'invalide pas le cache de TanStack Query : recharger la page avant de la chercher à l'écran.
- Les scripts du dossier temporaire d'une session (captures, planches) ne sont pas dans le dépôt : en réécrire au besoin, sur le modèle des tests e2e.
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
