# Journal des décisions

Ce fichier consigne toute décision que `docs/SPEC.md` ne couvre pas, ou qui s'en écarte (section 1, règle 3). Une décision qui touche au modèle de données, à l'architecture ou à la sécurité n'est appliquée qu'après validation de l'utilisateur.

Format de chaque entrée : date, contexte, choix, alternatives écartées, validation.

## Décisions de l'utilisateur avant la phase 0

### D-001 Electron plutôt que Tauri 2

- **Date** : 2026-11-16
- **Contexte** : première question ouverte de la section 15. Le téléphone est l'évolution prioritaire et Tauri 2 couvrirait bureau et mobile avec le même front React.
- **Choix** : Electron, comme la stack de la section 4.
- **Alternatives écartées** : Tauri 2. Il aurait fallu réécrire les sections 4, 6 et 12 (better-sqlite3, protocole média, impression PDF, fuses, Playwright sur Electron) et écrire la partie système en Rust. Le mobile reprendra `core/` dans un second projet (Capacitor ou React Native), comme prévu par la section 15.
- **Validation** : oui, par l'utilisateur.

### D-002 Prix de vente avec coefficient, TVA et arrondi

- **Date** : 2026-11-16
- **Contexte** : la spec exclut la TVA (sections 2, 7 et 15 : « pas de TVA, c'est un carnet personnel »). Les carnets de préparation au concours MAF (Meilleurs Apprentis de France, spécialité bar) calculent pourtant un prix de vente : coût matière HT, coefficient multiplicateur (5 par défaut), TVA de 20 % sur les boissons alcoolisées, prix carte arrondi au demi-euro supérieur, puis ratio coût matière / prix de vente HT recalculé.
- **Choix** : ajouter ce calcul. Coefficient, taux de TVA et pas d'arrondi sont des réglages modifiables. La fiche et les collections affichent le coût matière HT, le prix TTC conseillé et le ratio. Les montants restent en centimes entiers.
- **Alternatives écartées** : rester sans TVA (coût de revient et rapport prix / coût seulement), ce qui ne répond pas à l'usage MAF.
- **Validation** : oui, par l'utilisateur. Le détail des champs (réglages, `collection_items.sale_price_cents` HT ou TTC) sera soumis avec le schéma de la phase 1.

### D-003 Contenu « culture » MAF en sections structurées

- **Date** : 2026-11-16
- **Contexte** : les fiches MAF contiennent, pour chaque cocktail, la catégorie (short ou long drink), le moment de consommation (before dinner, all day, after dinner), un profil en une ligne, une frise historique datée, des variantes avec leur histoire, une ou plusieurs questions de jury avec réponse, un « truc du pro », une phrase « à retenir », la spécification IBA à comparer avec le socle et des sources numérotées. Pour chaque produit : fabrication par étapes, histoire, réglementation (TAV minimum, mentions d'âge), types et styles, dégustation (œil, nez, bouche), service, cocktails liés, marques. Le modèle de la section 7 ne prévoit que `notes`, `description` et `flavor_tags`.
- **Choix** : des tables et champs dédiés, pour que la révision puisse générer des questions « histoire », « question jury » ou « réglementation » et qu'un affichage en carte mentale soit possible.
- **Alternatives écartées** : un champ de texte libre en Markdown simple, plus léger mais inutilisable par la révision.
- **Validation** : oui, par l'utilisateur. Les tables détaillées seront proposées avec le schéma de la phase 1, avant toute migration.

### D-004 Import des carnets MAF comme données utilisateur

- **Date** : 2026-11-16
- **Contexte** : l'utilisateur fournit quatre carnets Word (36 cocktails du « Socle des cocktails de référence 2025 », base produits avec TAV et prix, fiches produits et cartes mentales illustrées). Ils montrent le contenu minimum que l'application doit pouvoir porter.
- **Choix** : importer ce contenu comme données de l'utilisateur, regroupé dans une collection dédiée au socle MAF 2025, et non comme base de départ livrée avec l'application. Les fichiers extraits sont rangés dans `imports/maf/`, exclu de git (`.gitignore`) parce qu'ils contiennent des données personnelles (nom, établissement). Les pages illustrées (images) seront retranscrites.
- **Alternatives écartées** : se servir des carnets seulement comme modèle, sans import.
- **Validation** : oui, par l'utilisateur. L'import lui-même dépend du schéma (phase 1) et des fiches (phase 3).

## Décisions techniques de la phase 0

### D-005 TypeScript 6.0.3 au lieu de 7.0.2

- **Date** : 2026-11-16
- **Contexte** : la règle 7 demande les dernières versions stables. TypeScript 7.0.2 est la dernière version publiée, mais typescript-eslint 8.72.2 déclare la dépendance pair `typescript >=4.8.4 <6.1.0`.
- **Choix** : TypeScript 6.0.3, dernière version compatible avec typescript-eslint, version exacte verrouillée.
- **Alternatives écartées** : TypeScript 7 sans lint typé (contraire à la section 13.2), ou forcer la dépendance pair (comportement non garanti).
- **Validation** : non requise (outillage). À revoir quand typescript-eslint acceptera TypeScript 7.

### D-006 Renderer minifié

- **Date** : 2026-11-16
- **Contexte** : electron-vite 6 ne minifie pas le renderer par défaut (568 ko pour la page de la phase 0).
- **Choix** : `build.minify: true` dans la configuration du renderer (221 ko). Le processus principal reste non minifié pour garder des traces d'erreur lisibles dans le journal.
- **Alternatives écartées** : bundle non minifié, plus long à analyser au démarrage (objectif : moins de 3 s sur un PC d'entrée de gamme).
- **Validation** : non requise.

### D-007 CSP par en-tête et par balise meta

- **Date** : 2026-11-16
- **Contexte** : la section 6 impose une CSP stricte par en-tête de réponse. En production, la page est chargée en `file://`, pour lequel `webRequest.onHeadersReceived` ne garantit pas l'ajout d'en-têtes.
- **Choix** : les deux. Le processus principal ajoute l'en-tête à toutes les réponses (`src/main/security.ts`). Le build injecte la même politique dans une balise meta en tête de `index.html` (plugin `shakery-csp-meta` dans `electron.vite.config.ts`). La balise meta n'inclut pas `frame-ancestors`, qu'un navigateur ignore dans une meta. La politique vient d'une seule fonction, `buildCsp` (`src/main/security-policy.ts`).
- **Alternatives écartées** : servir l'application par un protocole personnalisé (`app://`) avec un vrai en-tête. Plus propre, mais c'est un changement d'architecture que la spec ne prévoit pas (elle part de `file://` et d'un routeur par hash) : à proposer si besoin, avec validation.
- **Validation** : à confirmer par l'utilisateur en fin de phase 0 (sécurité).

### D-008 CSP de développement assouplie

- **Date** : 2026-11-16
- **Contexte** : le serveur de développement Vite injecte un préambule React Refresh en script inline, des styles par balise `<style>` et ouvre un websocket de rechargement à chaud.
- **Choix** : en développement seulement, `script-src` et `style-src` reçoivent `'unsafe-inline'` et `connect-src` reçoit l'origine du serveur Vite et son websocket. `'unsafe-eval'` n'est jamais autorisé. La production garde exactement la politique de la section 6, ce qu'un test unitaire vérifie.
- **Alternatives écartées** : CSP stricte en développement, incompatible avec le rechargement à chaud.
- **Validation** : à confirmer par l'utilisateur en fin de phase 0 (sécurité).

### D-009 Canal IPC d'electron-log retiré

- **Date** : 2026-11-16
- **Contexte** : `electron-log/main` enregistre dès son import un canal IPC `__ELECTRON_LOG__` pour recevoir les journaux d'un renderer. La section 5 interdit tout canal hors du contrat.
- **Choix** : `setupLogging()` retire ce canal au démarrage (`removeAllListeners` et `removeHandler`), et `log.initialize()` n'est jamais appelé. Un test de bout en bout vérifie qu'aucun canal hors contrat n'existe. Si le renderer doit un jour écrire dans le journal, ce sera par une opération du contrat.
- **Alternatives écartées** : garder le canal (le renderer ne peut de toute façon pas l'atteindre sans `ipcRenderer`, mais la règle de la spec serait enfreinte).
- **Validation** : non requise (application stricte de la spec).

### D-010 Menu applicatif supprimé

- **Date** : 2026-11-16
- **Contexte** : le menu par défaut d'Electron apporte des raccourcis (Ctrl+R, Ctrl+Maj+I, Ctrl+W…) qui entreraient en conflit avec ceux de la section 10.1 et rechargeraient la page en perdant une saisie.
- **Choix** : `Menu.setApplicationMenu(null)`. F12 ouvre les outils de développement uniquement hors build packagé. En build packagé, `devTools: false`.
- **Alternatives écartées** : un menu natif personnalisé, à reconsidérer pour macOS en phase 11 si les conventions de la plateforme l'exigent.
- **Validation** : non requise.

### D-011 Règles du protocole `shakery-media://`

- **Date** : 2026-11-16
- **Contexte** : la section 6 limite le protocole média au dossier médias et refuse toute traversée.
- **Choix** : URL de la forme `shakery-media://media/<segments>`. Hôte `media` obligatoire, ni identifiants, ni port, ni paramètres. Chaque segment est décodé puis doit respecter `[A-Za-z0-9._-]` (pas de point initial, pas de `..`), 8 segments au plus. Seule l'extension `.webp` est servie, puisque toute image importée est réencodée en WebP. Le chemin réel (`realpath`) doit rester dans le dossier médias réel, ce qui bloque les liens symboliques sortants. Seule la méthode GET est acceptée.
- **Alternatives écartées** : accepter aussi PNG et JPEG, inutile tant que l'import réencode tout en WebP.
- **Validation** : à confirmer par l'utilisateur en fin de phase 0 (sécurité).

### D-012 Dossier de données forcé pour les tests

- **Date** : 2026-11-16
- **Contexte** : les tests de bout en bout lancent plusieurs instances isolées, chacune avec son dossier de données, sans toucher au carnet réel du développeur.
- **Choix** : la variable d'environnement `SHAKERY_USER_DATA_DIR` remplace `userData`, uniquement quand l'application n'est pas packagée. Elle est lue avant le verrou d'instance unique, qui dépend du dossier de données.
- **Alternatives écartées** : un argument de ligne de commande, équivalent mais plus visible ; aucun mécanisme, ce qui ferait écrire les tests dans le carnet réel.
- **Validation** : à confirmer par l'utilisateur en fin de phase 0 (sécurité).

### D-013 Fuse `grantFileProtocolExtraPrivileges` laissé par défaut

- **Date** : 2026-11-16
- **Contexte** : la section 6 liste cinq fuses, tous configurés dans `electron-builder.yml`. Electron propose aussi `grantFileProtocolExtraPrivileges`, que la spec ne cite pas.
- **Choix** : le laisser à sa valeur par défaut (activé). Le renderer est chargé en `file://` avec des modules ES (`<script type="module" crossorigin>`), qui ont besoin de ces privilèges. `enableCookieEncryption` est en plus activé, sans effet négatif pour une application sans cookie.
- **Alternatives écartées** : le désactiver, ce qui empêcherait le chargement du bundle. À revoir si l'application passe un jour à un protocole personnalisé (voir D-007).
- **Validation** : non requise.

### D-014 Binaire Electron absent après `npm install`

- **Date** : 2026-11-16
- **Contexte** : sur le poste de développement (npm 11.12.1, `ignore-scripts` à false), le script d'installation du paquet `electron` n'a pas téléchargé le binaire.
- **Choix** : relancer `node node_modules/electron/install.js`, commande documentée dans le README. À surveiller en CI.
- **Alternatives écartées** : un script `postinstall` maison, ajouté seulement si le problème se reproduit ailleurs.
- **Validation** : non requise.

### D-015 Alertes npm audit de niveau « moderate »

- **Date** : 2026-11-16
- **Contexte** : `npm audit` signale 12 alertes de niveau « moderate », toutes dues à `minimatch` (déni de service par expression régulière) via electron-builder et typescript-eslint.
- **Choix** : les accepter pour l'instant. Elles ne concernent que l'outillage de développement : `npm audit --omit=dev` ne signale aucune vulnérabilité dans ce qui est livré. La section 13.2 ne bloque que les niveaux « high » et « critical ». Le correctif proposé (`npm audit fix --force`) ramènerait electron-builder à la version 25, ce qui serait une régression.
- **Alternatives écartées** : forcer le correctif.
- **Validation** : non requise. À recontrôler à chaque mise à jour des dépendances.

## Décisions de la phase 1

### D-016 Extension du modèle de données pour les carnets MAF

- **Date** : 2026-11-17
- **Contexte** : D-003 demande un contenu « culture » structuré. La proposition complète, avec la correspondance champ par champ des fichiers de `imports/maf/`, est dans `docs/proposals/2026-11-17-modele-donnees-maf.md`. Elle a été conçue par trois propositions indépendantes puis arbitrée.
- **Choix** : fiches culture découpées en sections et en éléments typés (`knowledge_sheets`, `knowledge_sections`, `knowledge_items`, `knowledge_links`), carnets avec leurs sources et citations (`study_guides`, `guide_sources`, `source_citations`), copie figée du socle imprimé et de la spécification IBA à côté de la recette de travail (`reference_specs`, `reference_spec_lines`), tableaux récapitulatifs (`study_tables`, `study_table_rows`) et journal de révision en ajout seul (`practice_answers`). Colonnes ajoutées à `recipes` (longueur, moment, profil, coût de garniture), `products` (articles comptés, base de prix HT ou TTC, produit de référence d'un carnet), `collection_items` (fiche culture possible, taux de TVA propre) et `practice_sessions` (mode).
- **Alternatives écartées** : une table par type de bloc (une migration par nouveau bloc), un document JSON par fiche (contraire à D-003), la recette seule sans socle figé (perte des libellés du jury, des TAV retenus et des coûts imprimés dès la première modification).
- **Validation** : oui, par l'utilisateur.

### D-017 Détail du prix de vente (suite de D-002)

- **Date** : 2026-11-17
- **Choix** : `collection_items.sale_price_cents` est un prix carte TTC. Taux de TVA en points de base entiers (2000 = 20 %), réglable globalement et par élément de collection (boissons sans alcool servies sur place). Les règles d'un carnet (coefficient 5, TVA 20 %, arrondi au 0,50 € supérieur, trait à 0,25 ml) sont portées par le carnet (`study_guides`) et ne s'appliquent qu'à ses fiches ; les réglages globaux s'appliquent ailleurs. Un prix d'achat a une base HT ou TTC et n'est jamais converti : un coût qui mélange les deux est signalé incomplet, avec les lignes en cause.
- **Alternatives écartées** : réglages globaux seulement.
- **Validation** : oui, par l'utilisateur.

### D-018 Import `.shakery` avancé à la fin de la phase 3

- **Date** : 2026-11-17
- **Contexte** : la spec place l'import en phase 10 et la révision en phase 8.
- **Choix** : l'import `.shakery` de base (validations de la section 6, aperçu, rapprochement, une seule transaction) est livré à la fin de la phase 3. Un script de développement non livré (`scripts/maf-import/`) convertit `imports/maf/` en archive `.shakery` avec des UUIDv7 déterministes. Aucun code propre au MAF dans l'application. L'export partiel et Open Food Facts restent en phase 10.
- **Validation** : oui, par l'utilisateur.

### D-019 Deux collections pour les carnets MAF (modifie D-004)

- **Date** : 2026-11-17
- **Choix** : « MAF 2025 : socle des cocktails » (36 fiches) et « MAF 2025 : fiches produits » (48 fiches), au lieu d'une collection unique.
- **Validation** : oui, par l'utilisateur.

### D-020 Marques en éléments de fiche, familles inchangées

- **Date** : 2026-11-17
- **Choix** : le répertoire des marques reste fait d'éléments de fiche (`knowledge_items` de type `brand`), avec un lien facultatif vers une bouteille. Les entrées sont contextuelles (Giffard trois fois avec trois notes) et les propriétaires ne sont pas normalisés (65 libellés). L'énumération `recipes.family` de la spec ne change pas : le libellé du socle est gardé mot pour mot dans `reference_specs.family_label`, et `other` est exclu du calcul des zones de référence.
- **Alternatives écartées** : tables `brands` et `brand_owners` normalisées (dérivables plus tard sans perte), ajout de `sparkling` et `julep_smash` à l'énumération (migration simple si `other` gêne à l'usage).
- **Validation** : recommandations de la proposition D-016, appliquées telles quelles ; réversibles par une migration.

### D-021 better-sqlite3 sans recompilation pour Electron

- **Date** : 2026-11-17
- **Contexte** : la section 4 prévient que better-sqlite3, module natif, doit être recompilé pour Electron, et que le binaire recompilé ne se charge plus sous Node, ce qui casserait les tests Vitest.
- **Constat** : better-sqlite3 13.2.0 est compilé en Node-API (`NAPI_VERSION=10`) et livre des binaires précompilés par plateforme. Le même binaire se charge sous Node 24 (ABI 137) et sous Electron 45 (ABI 150), FTS5 avec le tokenizer `trigram` et `backup()` compris (vérifié le 17 novembre 2026).
- **Choix** : aucune recompilation. Les tests qui touchent la base tournent sous Vitest et Node, sans `ELECTRON_RUN_AS_NODE`. electron-builder : `npmRebuild: false`, binaires `.node` sortis de l'asar (`asarUnpack`).
- **Alternatives écartées** : `electron-builder install-app-deps` en `postinstall` avec une compilation dédiée aux tests (inutile avec Node-API), `node:sqlite` (contraire à la section 4, et Drizzle n'a pas de pilote stable pour lui).
- **Validation** : non requise (pas d'écart avec la stack).

### D-022 Sauvegardes : magasin de photos partagé et règles de rotation

- **Date** : 2026-11-17
- **Contexte** : la section 12.3 demande de copier les photos avec la base, et de garder 14 sauvegardes quotidiennes et 8 hebdomadaires. Copier tout le dossier médias dans chacune des sauvegardes multiplierait l'espace disque d'autant.
- **Choix** :
  - Chaque sauvegarde est un dossier : `shakery.db`, copiée par l'API de sauvegarde de SQLite, puis `manifest.json`, écrit en dernier, avec la liste des photos. Un dossier sans manifeste est une sauvegarde inachevée, ignorée.
  - Les photos sont copiées une seule fois dans un magasin partagé (`<dossier>/media/`) : une photo n'est jamais modifiée sur place, puisqu'une nouvelle photo reçoit un nouveau nom UUID. Les photos que plus aucune sauvegarde ne cite sont supprimées.
  - Rotation : la plus récente de chacun des 14 derniers jours et des 8 dernières semaines ISO (jours et semaines locaux), plus les 3 plus récentes faites avant une migration, les 3 plus récentes faites avant une restauration, et les 5 dernières sauvegardes manuelles, quel que soit leur jour.
  - La sauvegarde visée par une restauration est protégée de la rotation que déclenche la sauvegarde de sécurité prise juste avant. Sans cette règle, restaurer une sauvegarde du jour la supprimait (bug trouvé par les tests de bout en bout).
  - Une base corrompue n'est pas sauvegardée par SQLite : ses fichiers bruts sont copiés dans `<dossier>/damaged-<date>/` avant la restauration.
- **Alternatives écartées** : copie complète du dossier médias à chaque sauvegarde ; sauvegardes manuelles soumises à la règle « une par jour ».
- **Validation** : non requise (détail d'implémentation de la section 12.3).

### D-023 Code d'erreur IPC `UNAVAILABLE`

- **Date** : 2026-11-17
- **Contexte** : quand la base a échoué à son contrôle d'intégrité, l'application démarre quand même pour proposer une restauration. Les opérations qui lisent le carnet ne peuvent pas répondre.
- **Choix** : un code d'erreur `UNAVAILABLE` (« Le carnet n'est pas disponible pour le moment »), distinct de `INTERNAL`, renvoyé tant que la base n'est pas prête ou que le dossier de sauvegarde est inaccessible.
- **Validation** : non requise.

### D-024 Référentiels fixes de départ

- **Date** : 2026-11-17
- **Choix** : arbre de 95 catégories d'ingrédients génériques sur 3 niveaux (77 feuilles), 24 verres et contenants, 8 types de glace, dans `data/seed/` (format, règles de rangement et de chargement dans `data/seed/README.md` ; correspondance avec les carnets MAF dans `docs/maf-mapping.md`). Version revue par un relecteur indépendant (24 remarques, aucune bloquante, toutes traitées avant la première publication : alternatives sans alcool, préparations maison salines, gazeuses et en bouteille, arômes, acides, légumes, libellés sans ambiguïté). Aucune contenance de verre n'est renseignée : elles varient d'un modèle à l'autre et aucune n'est sourcée (règle 9). Règles : un ingrédient se range dans une feuille ; un parent porte l'indication de batch la plus restrictive de ses enfants ; une nouvelle entrée dont le slug est pris par une catégorie de l'utilisateur reçoit un suffixe. Les fichiers sont embarqués dans le processus principal à la compilation et revalidés par Zod au chargement ; une entrée encore marquée `needs_review` bloque le chargement.
- **Validation** : relecture de l'arbre par l'utilisateur avant l'import massif de la phase 4 (section 9).

### D-025 Le logo fourni à toutes les tailles

- **Date** : 2026-11-17
- **Contexte** : la section 11 prévoit une variante simplifiée du logo pour les icônes de 16 à 32 px. Une variante redessinée a été proposée.
- **Choix** : refusée par l'utilisateur. Le logo fourni est utilisé partout et à toutes les tailles, jamais redessiné. Pour 32 px et moins, seule la marge transparente autour du logo est recadrée pour qu'il remplisse l'icône (`scripts/icons/generate.mjs`).
- **Validation** : oui, par l'utilisateur.

### D-026 Valeurs par défaut des unités et de la dilution

- **Date** : 2026-11-18
- **Choix** : once 30 ml (29,5735 ml au choix), trait 0,25 ml, goutte 0,05 ml, cuillères de bar et à café 5 ml ; dilution 25 % au shaker, 20 % au verre à mélange, 10 % au verre, 15 % pour « autre » ; aucune dilution pour une préparation. Sources et réserves dans `docs/DATA_SOURCES.md`. Le TAV « méthode socle » (sans dilution, seules les lignes en ml, cl ou oz) est calculé à côté du TAV servi.
- **Validation** : oui, par l'utilisateur le 18 novembre 2026 (dilution 25, 20 et 10 %, trait 0,25 ml, cuillère de bar 5 ml, once 30 ml).

### D-027 Seuil de couverture des branches de `core/`

- **Date** : 2026-11-18
- **Contexte** : la section 13.1 demande 95 % des lignes et des branches. L'option `noUncheckedIndexedAccess` impose des valeurs de repli (`?? 0`) sur des accès de tableau qui ne peuvent pas échouer ; ces branches ne sont pas atteignables.
- **Choix** : seuil de 95 % pour les lignes, instructions et fonctions, 90 % pour les branches (`npm run test:coverage`). Mesure au 18 novembre 2026 : 99,7 % des lignes, 91,9 % des branches.
- **Alternatives écartées** : désactiver `noUncheckedIndexedAccess`, ou marquer chaque repli d'un commentaire d'exclusion.
- **Validation** : non requise.

### D-028 Interface compacte

- **Date** : 2026-11-18
- **Contexte** : l'utilisateur trouve l'interface grossière et demande un rendu compact et moderne. La section 11 fixait des cartes à 24 px de marge et une échelle de 12 à 56 px.
- **Choix** : échelle de texte 11, 12, 13, 14, 16, 22, 28, 40 px (corps à 13 px) ; champs et boutons à 32 px de haut (28 px en petit) ; marge des cartes à 16 px (12 px imbriquées) ; rayons 7, 9, 12 et 16 px ; barre latérale de 212 px ; espacements de page resserrés d'un cran ; panneau « Calculs » en lignes (libellé, valeur, unité) avec les données manquantes regroupées par ligne d'ingrédient. Les tokens de `design/tokens.css` suivent. Le mode préparation garde ses tailles de 32 et 48 px (section 10.12).
- **Alternatives écartées** : un zoom global de la fenêtre, qui grossit aussi les icônes et ne corrige pas les proportions.
- **Validation** : demandée par l'utilisateur.

### D-029 Conversion des valeurs Ciqual en g/L

- **Date** : 2026-11-18
- **Contexte** : Ciqual donne le sucre et les acides en g pour 100 g ; Shakery les stocke en g par litre (section 7).
- **Choix** : multiplication par 10 avec une masse volumique de 1 kg/L, limitée aux produits proches de l'eau (jus, sodas, vins, lait de coco). Écart de 2 à 5 % sur un jus, documenté. Les sirops, le miel et les liqueurs, trop denses, ne sont pas repris. Une acidité notée 0 ou « traces » reste vide.
- **Alternatives écartées** : une masse volumique par produit, qu'aucune source ouverte ne donne de façon homogène ; garder 0 comme acidité du champagne ou du miel, ce qui serait faux.
- **Validation** : non requise (aucun changement de modèle).

### D-030 Produits uniques comme ingrédients génériques

- **Date** : 2026-11-18
- **Contexte** : la section 7 sépare l'ingrédient générique de la bouteille de marque. Les recettes classiques nomment pourtant des produits qui n'existent qu'en une marque (Campari, Aperol, Chartreuse, Bénédictine, Angostura).
- **Choix** : ces produits uniques sont des ingrédients de la base de départ, avec le degré publié sur Wikidata. Les marques d'un type générique (vodkas, gins, rhums, colas) restent des bouteilles à créer par l'utilisateur.
- **Validation** : non requise.

### D-031 Masse volumique des ingrédients

- **Date** : 2026-11-18
- **Contexte** : une ligne en grammes (sucre d'un sirop maison) ne comptait pas dans les calculs, si bien que la composition des sirops de base restait vide (critère de la phase 4).
- **Choix** : colonne facultative `density_g_per_ml` sur `ingredients` (migration `0002`, simple ajout de colonne). Une ligne en grammes d'un ingrédient qui a une masse volumique compte comme `g / masse volumique` millilitres, dans la composition et dans le volume d'une préparation sans rendement (coût). Le sucre cristallisé compte à 1,59 g/ml, volume apparent du saccharose dissous. Valeurs de départ dans `scripts/seed/hand-compositions.json` : eau, sucres blanc, en morceaux et roux, miels, avec le sucre de Ciqual 2020 converti par leur masse volumique. Une base existante reçoit ces valeurs au démarrage si l'ingrédient n'a encore aucune composition. Le TAV « méthode socle » ne change pas : seules les lignes en ml, cl ou oz y comptent.
- **Alternatives écartées** : convertir les grammes en volume à 1 g/ml, faux de 37 % pour le sucre ; demander une conversion à chaque ligne.
- **Validation** : oui, par l'utilisateur le 18 novembre 2026, avec la relecture de l'arbre des catégories et des ingrédients de départ (phase 4).

### D-032 Interface plus vivante

- **Date** : 2026-11-18
- **Contexte** : l'utilisateur veut une interface « magnifique », avec des animations fluides, de belles couleurs, des contrôles dessinés (pas de cases à cocher blanches par défaut) et une barre latérale qui se replie.
- **Choix** : dans les limites de la section 11 (un seul accent cuivré, aucun flou sur les cartes, aucun fond animé, `prefers-reduced-motion` respecté) :
  - couleurs : deux halos cuivrés fixes derrière l'interface, dégradé cuivre clair vers cuivre sur l'action principale, les cases cochées, l'interrupteur et la note sélectionnée, lueur cuivrée au survol ; cartes avec un léger éclairage par le haut et une ombre douce (`bg-card`, `shadow-card`), nouveau token `--color-surface-3` ;
  - contrôles : case à cocher dessinée (l'élément natif reste, pour le clavier, les formulaires et les lecteurs d'écran), listes déroulantes natives redessinées par le `<select>` personnalisable de Chromium (`appearance: base-select`), avec repli sur le rendu natif sombre ;
  - mouvement : entrée de chaque écran (opacité et translation, 220 ms), curseur glissant sous l'entrée active de la barre latérale et sous le choix d'un contrôle segmenté, cartes du journal et du carnet qui apparaissent l'une après l'autre, étoiles et coches qui grandissent en se remplissant, boutons qui s'enfoncent au clic ;
  - barre latérale : repliée en icônes par le bouton du bas ou Ctrl+B, avec une animation de sa largeur (250 ms) et des libellés qui s'effacent. C'est la seule propriété de mise en page animée : un seul élément, coupé par `prefers-reduced-motion`.
- **Alternatives écartées** : une bibliothèque d'animation (poids, minuteries) ; une seconde couleur d'accent, que la section 11 exclut ; remplacer les `<select>` par des listes JavaScript, ce qui casserait le clavier natif et les tests.
- **Validation** : demandée par l'utilisateur.

### D-033 Impression par fenêtre cachée

- **Date** : 2026-11-18
- **Contexte** : la section 12.2 demande des gabarits React rendus dans une fenêtre cachée, avec la même sécurité et la même CSP, puis `printToPDF`.
- **Choix** : `src/main/services/print.ts` ouvre une fenêtre cachée avec `secureWebPreferences()` (les réglages de la fenêtre principale, mis en commun), charge la route `#/print/...` du renderer et attend que le gabarit donne au document le titre `shakery-print-ready` (données affichées et polices chargées), sans exécuter de JavaScript dans la page, ce qui garde la CSP intacte. Le PDF est écrit à l'endroit choisi dans la boîte d'enregistrement. Premier gabarit : la collection (`renderer/src/print/CollectionPrint.tsx`), noir sur blanc.
- **Alternatives écartées** : imprimer la fenêtre principale avec une feuille `@media print` (le PDF dépendrait de l'écran affiché) ; `executeJavaScript` pour sonder la page.
- **Validation** : non requise.

### D-034 Questions de révision de la phase 8

- **Date** : 2026-11-18
- **Contexte** : la proposition MAF (partie C.3) liste environ 25 générateurs de questions.
- **Choix** : `core/practice.ts` en livre 15, ceux qui couvrent les données présentes dans toute collection : dose, ingrédient intrus, méthode, verre, glace, décoration, longueur, moment, famille, TAV du socle et récitation pour les recettes (la référence socle figée quand elle existe) ; classe, TAV minimum, origine, « à retenir » inversé et questions jury pour les fiches culture ; cellules des tableaux récapitulatifs des carnets concernés. Les mauvaises réponses viennent du même générateur dans la collection ; avec moins de mauvaises réponses que nécessaire, la question devient une carte mémoire. Les erreurs de la dernière réponse passent en premier à la session suivante. Les générateurs de frise, variantes, marques, répertoire et calcul du TAV ou du coût restent à faire.
- **Validation** : non requise (aucun changement de modèle).

### D-035 Bascule « je l'ai » sur un ingrédient

- **Date** : 2026-11-18
- **Contexte** : la disponibilité se calcule sur les bouteilles possédées (section 8), alors que la section 10.8 demande une bascule rapide « je l'ai ».
- **Choix** : sur la fiche ingrédient de Mon bar, la bascule coche la première bouteille ; s'il n'y en a aucune, elle crée une bouteille au nom de l'ingrédient, déjà possédée. La décocher retire « possédée » de toutes ses bouteilles. Aucun changement de modèle.
- **Validation** : non requise.

### D-036 Recettes de 24cocktails dans la base de départ

- **Date** : 2026-11-19
- **Contexte** : l'utilisateur veut que Shakery contienne (presque) tous les cocktails, consultables hors ligne, sans export ni import de sa part. L'usage est strictement personnel : Shakery n'est pas diffusé.
- **Choix** : les 7 154 recettes de l'export `https://24cocktails.com/llms/recipes.jsonl` (publié par l'éditeur) entrent dans la base de départ, générée au build par `scripts/seed/`. Chaque recette devient une fiche classique comme celles de l'IBA (`final`, `origin = 'classic'`, `source = 'seed'`, `seed_key` `c24.<slug>`), sans crédit ni lien vers le site : l'utilisateur ne veut ni catégorie « Autre » ni ouverture du site. Aucun changement de modèle. Nom d'origine conservé ; doses, méthode et verre repris ; décoration traduite en français ; ingrédients ramenés au référentiel français (ingrédients nouveaux créés dans une feuille de l'arbre), marque gardée en note de ligne. Les recettes qui portent le nom d'un des 102 classiques IBA sont écartées. Aucun appel réseau à l'exécution. Résultat : 7 064 fiches (90 écartées) et 469 ingrédients nouveaux ; le fichier généré `resources/seed/recipes-24c.json` est lu au démarrage et chargé en bloc, en une transaction (environ 3 à 5 s au premier lancement, puis 0,1 à 0,3 s de vérification à chaque démarrage). La garniture accepte désormais 1 000 caractères au lieu de 300.
- **Risque** : les conditions du site interdisent de bâtir un catalogue concurrent et de republier en masse. Si Shakery devait un jour être diffusé, retirer ces recettes ou obtenir d'abord une autorisation écrite de l'éditeur.
- **Validation** : l'utilisateur, le 19 novembre 2026.

### D-037 Export, partage et Open Food Facts (phase 10)

- **Date** : 2026-11-20
- **Contexte** : section 12.4 et phase 10. Chaque installation contient les mêmes 7 000 classiques (D-036) sous ses propres identifiants : un export suivi d'un import doit les reconnaître au lieu de les recréer.
- **Choix** :
  - Export complet (`src/main/services/export.ts`) : toutes les lignes des tables que l'import connaît, supprimées comprises, et toutes les photos WebP du dossier média. Les réglages et les vues récentes ne partent pas.
  - Import (`import.ts`) : un classique est reconnu par son `seed_key`, un ingrédient de départ aussi. Intact dans l'archive, il est ignoré avec ses lignes et ses versions. Modifié dans l'archive et intact ici (favori, nouvelle version, statut, suppression), l'état de l'archive est repris. Modifié des deux côtés, c'est un conflit tranché par le choix de l'utilisateur ; « Garder les deux » fait de la copie une fiche à lui, sans `seed_key`. Les identifiants des instantanés de versions sont convertis, les alias déjà présents ne sont pas recopiés, seules les lignes écrites sont réindexées. L'aperçu compte de la même façon.
  - Export partiel (fiche ou collection) : les fiches, les préparations qu'elles utilisent (récursivement), leurs ingrédients avec alias et les référentiels. Dégustations, notes du carnet et bouteilles (prix payés) sont exclues sauf case cochée ; les liens vers ce qui ne part pas sont vidés.
  - Fiche en Markdown (copie par le main, ou fichier `.md`) et en image PNG dessinée sur un canvas du renderer, aux couleurs de l'application et avec le logo fourni.
  - CSV (fiches, journal, ingrédients) écrit par le main : séparateur point-virgule, UTF-8 avec BOM, en-têtes en français dans `csv.ts` (ce sont des données du fichier, pas des textes d'interface), cellules commençant par `=`, `+`, `-` ou `@` neutralisées.
  - Open Food Facts : réglage `off.enabled`, activé par défaut et désactivable dans Paramètres ; requête depuis le main (`fetch` de Node), cache de 30 jours ; l'utilisateur coche les champs repris et la bouteille passe en `source = 'off'` avec la mention ODbL. Le bouton disparaît hors ligne ou réglage désactivé ; Entrée dans le champ code-barres lance la recherche (une douchette tape le code puis Entrée).
- **Validation** : non requise (aucun changement de modèle : `products.source` et `off_cache` existaient).

### D-038 Finitions : thèmes, barre de titre, animations, fiche imprimée (phase 11)

- **Date** : 2026-11-22
- **Contexte** : phase 11 et demandes de l'utilisateur : thème clair (pas forcément blanc) avec bouton de bascule, barre de titre de la couleur du fond, animations soignées qui distinguent les écrans, PDF d'une fiche pour l'impression, adaptation à la taille de la fenêtre.
- **Choix** :
  - Thèmes : mêmes jetons, valeurs du thème clair sous `:root[data-theme='light']` (`tokens.css`). La carte héros reste en cuivre profond dans les deux thèmes. Réglage `appearance.theme`, copie dans localStorage pour le premier rendu.
  - Barre de titre : `titleBarStyle: 'hidden'` et boutons natifs transparents ; la barre du haut (48 px) déplace la fenêtre. `useContentSize` : le minimum de 1100 x 700 vaut pour la page.
  - Animations : une chorégraphie, une lumière et un motif par écran (`styles/scenes.css`), une seule fois, coupés par le réglage ou par le système.
  - Adaptation : largeur de page de 1180, 1400 puis 1760 px ; lignes de l'éditeur et de l'atelier qui passent sur deux rangs quand la place manque. Un test de bout en bout mesure débordements, contrastes et noms des contrôles sur chaque écran.
  - Fiche imprimée : A4 ou A5, avec ou sans indicateurs, aperçu, PDF ou impression directe (Ctrl+P). La taille du texte diminue jusqu'à tenir sur une page.
  - Premier lancement : la base est toujours complète (D-036), l'étape « familles à importer » devient une présentation de son contenu. Un carnet déjà utilisé ne voit pas l'assistant.
  - Unité d'affichage : les doses enregistrées ne changent jamais ; calculateurs et révision gardent l'unité de saisie.
- **Validation** : demandes de l'utilisateur du 21 novembre 2026 ; modifications de la spec (sections 10.15, 11 et 12.2).

### D-039 Classiques complétés : degrés de référence, familles, étapes types

- **Date** : 2026-11-22
- **Contexte** : demande de l'utilisateur de compléter les classiques. L'export de 24cocktails ne donne ni étapes ni famille, et 762 des 777 ingrédients de départ n'avaient pas de degré : 2 de ces classiques seulement avaient un degré calculable.
- **Choix** :
  - Degrés (`scripts/seed/abv.json`) : une valeur de référence par ingrédient générique, chacune rattachée à sa source (règlements européens, Wikidata, Ciqual, fiches de produits) ; 0 pour ce qui est sans alcool par nature. La bouteille choisie prime toujours. Sans source, la valeur reste vide (96 ingrédients). Cela élargit D-030, qui ne gardait que les degrés des produits uniques. Pour une catégorie de spiritueux, la source est souvent le minimum légal : le degré réel d'une bouteille peut être un peu plus haut.
  - Le champ « abv » de l'export n'est pas repris : vérification faite, il est calculé par mots-clés (20 % pour toute liqueur, 0 % pour la Bénédictine).
  - Familles (`scripts/seed/classics.ts`) : règles déterministes, en accord avec 90 des 93 fiches IBA classées à la main. 6 341 classiques classés ; les autres restent sans famille, aucun en « Autre ». « Sans alcool » seulement si chaque ligne est connue à 0.
  - Étapes : déroulé type de la méthode, adapté aux bulles, à l'œuf, aux fruits à piler, au service chaud ou en couches, en nommant cette origine sous les étapes (`TYPICAL_STEPS_CREDIT`). Ces phrases communes n'entrent pas dans l'index de recherche. Réécrites par l'utilisateur, elles perdent la mention et sont indexées.
  - Carnet déjà chargé : seuls les champs vides d'entrées jamais modifiées sont remplis, sans changer leur date ni leur version.
  - Zones de référence : toutes les fiches lues en une fois (environ 0,1 s pour 7 000 classiques).
- **Résultat** : degré calculable sur 6 137 des 7 166 cocktails. Les autres ont un complément sans volume (règle de la section 8) ou un ingrédient sans degré.
- **Validation** : demande de l'utilisateur du 22 novembre 2026. Aucun changement de modèle.

### D-040 Filtres des fiches, allergènes et profils de la base de départ

- **Date** : 2026-11-22
- **Contexte** : filtres de la section 10.4. Le filtre « exclusion d'un allergène » aurait été dangereux tel quel : 25 ingrédients de départ seulement déclaraient un allergène (rien sur l'orgeat, le beurre de cacahuète, la bière, le vin).
- **Choix** :
  - Allergènes (`scripts/seed/allergens.json`) relus nom par nom sur les 777 ingrédients : 153 en déclarent désormais. Dans le doute, l'allergène est déclaré.
  - Le calcul des allergènes lit aussi les notes de lignes, pour une courte liste de mots sans ambiguïté (« infusé à la cacahuète », « aux crevettes »).
  - « Sans » : lignes facultatives comprises, et une fiche dont un ingrédient est inconnu n'est jamais présentée comme « sans ». Un rappel de vérifier l'étiquette s'affiche avec le filtre.
  - Profil aromatique : descripteurs posés par règles sur les ingrédients (`scripts/seed/profiles.ts`), modifiables dans Mon bar. Le profil d'une fiche est celui de ses ingrédients, hors décoration et traits.
  - Spiritueux de base : la sous-catégorie de « Spiritueux » qui a le plus de volume dans la fiche.
  - Note : moyenne de la dernière version goûtée, comme à l'accueil.
  - Canal `recipes.facets` séparé de `recipes.list`, qui reste léger pour les autres écrans.
- **Validation** : demande de l'utilisateur du 22 novembre 2026. Aucun changement de modèle.

### D-041 Palette : notes, actions, comparaison entre fiches

- **Date** : 2026-11-22
- **Contexte** : sections 10.1, 10.5 et 12.1. La palette ne cherchait ni dans le carnet ni dans le journal, et l'atelier ne comparait que les versions d'une même fiche.
- **Choix** :
  - Canal `search.notes` à part de `search.query` : les commentaires du journal n'entrent pas dans le classement des fiches.
  - Actions sur la première fiche trouvée et sur la fiche affichée (atelier, préparation, dégustation, comparaison, impression), puis actions générales. La palette se ferme avant d'exécuter l'action, qui peut ouvrir sa propre fenêtre.
  - Comparaison : jusqu'à trois colonnes, versions ou autres fiches. Le lien `?compare` y mène directement.
  - Listes déroulantes : 100 lignes affichées au plus, le reste se trouve en tapant (7 000 fiches).
- **Validation** : demande de l'utilisateur du 22 novembre 2026. Aucun changement de modèle.

### D-042 Batch imprimé et étiquettes de bouteille

- **Date** : 2026-11-22
- **Contexte** : sections 8, 10.9, 10.13 et 12.2. En branchant l'impression, le batch s'est révélé non conforme à la section 8 : les jus, l'œuf et la crème étaient comptés dans la bouteille à garder, il n'y avait ni cible en volume ni pas d'arrondi, et les pièces n'étaient pas arrondies au supérieur.
- **Choix** :
  - Batch corrigé : seule la part qui se garde va dans la bouteille, le frais et le service sont listés à part avec un avertissement, cible en verres ou en ml, arrondi réglable, pièces à l'unité supérieure, décorations exclues par défaut. L'eau reste V0 × d × N.
  - Étiquettes : trois rouleaux (62 × 29, 89 × 36, 57 × 32 mm) et deux planches A4 (21 et 8), page sans marge, première case libre au choix. Le texte rétrécit, rien n'est coupé.
  - L'étiquette porte les allergènes déclarés (désactivable) et une ligne à remplir quand aucune durée de conservation n'est définie : Shakery n'en propose jamais.
  - IPC `export.batch` et `export.labels` : des identifiants et des options validés, jamais de HTML ni de chemin.
- **Validation** : demande de l'utilisateur du 22 novembre 2026. Aucun changement de modèle.

### D-043 Paramètres, corbeille et réinitialisation

- **Date** : 2026-11-22
- **Contexte** : section 10.14 complète, plus la reconstruction de l'index prévue en 12.1.
- **Choix** :
  - Équivalences et dilution des paramètres appliquées partout : panneau des fiches, zones, calculateurs, batch, impression. Le pas de l'atelier, les choix d'impression, la fréquence et la rétention des sauvegardes sont aussi des réglages.
  - Mode performance : ni flou, ni ombre, ni dessin de fond, ni animation. Sans flou, le verre devient opaque.
  - Corbeille : ce qui est supprimé, restaurable avec ce dont il dépend. Vider exige une sauvegarde réussie et vérifiée (`pre-purge`). Une entrée de départ garde une ligne vide, qui tient lieu de trace de son `seed_key` : elle ne revient pas au démarrage suivant (le point « Corbeille et données de départ » est réglé sans changement de modèle). Une ligne encore référencée reste aussi, masquée.
  - Réinitialisation : mot à taper, sauvegarde vérifiée (`pre-reset`), ancien fichier mis de côté, remis en place si le nouveau ne s'ouvre pas. Le dossier de sauvegarde et le thème sont conservés.
- **Défauts corrigés** : « Dossier par défaut » des sauvegardes échouait (valeur nulle refusée par la colonne) ; les notes et dégustations importées n'entraient pas dans la recherche, et une fiche supprimée par import y restait.
- **Validation** : demande de l'utilisateur du 22 novembre 2026. Aucun changement de modèle.

### D-044 Mise en forme des textes libres

- **Date** : 2026-11-22
- **Contexte** : section 6, au plus gras, italique et listes, sans jamais de HTML brut.
- **Choix** :
  - Texte enregistré tel que tapé (`**gras**`, `*italique*`, lignes `- ` ou `1. `), sans changement de modèle. Un signe sans paire, un calcul « 2 * 3 » ou un renvoi « TAV* » restent du texte.
  - Champs concernés : notes et conservation d'une fiche, étapes (gras et italique seulement), carnet, commentaire de dégustation, description de collection. Boutons, Ctrl+B, Ctrl+I et aperçu sous le champ. Dans ces champs, Ctrl+B ne replie plus la barre latérale.
  - Rendu à l'écran, en mode préparation, à l'impression et dans l'export Markdown ; texte nu dans les aperçus et l'image partagée.
- **Validation** : demande de l'utilisateur du 22 novembre 2026.

### D-045 Photos des fiches et des dégustations

- **Date** : 2026-11-22
- **Contexte** : sections 6, 10.4 et 10.6. Les colonnes `photo_path` existaient, rien ne les remplissait.
- **Choix** :
  - JPEG, PNG ou WebP, déposé ou choisi, réencodé en WebP de 1600 px au plus sans aucune métadonnée, revérifié par le main, qui nomme le fichier.
  - La photo n'est pas versionnée : la changer ne crée pas de version. Sur la fiche, l'enregistrement est immédiat avec « Annuler » ; dans l'éditeur, il suit « Enregistrer ».
  - Un fichier remplacé reste jusqu'au vidage de la corbeille, qui le supprime après la sauvegarde.
  - Les sauvegardes et les exports, qui prenaient déjà les photos en charge, n'ont pas changé.
  - HEIC non pris en charge : Chromium ne le décode pas. Le message d'erreur le dit.
- **Défaut corrigé** : un bloc absolu de la fiche ou de l'éditeur sortait de `main` et rendait la coquille défilable : un focus pouvait faire disparaître la barre du haut. `main` est positionné et la coquille coupe au lieu de masquer (`overflow: clip`).
- **Validation** : demande de l'utilisateur du 22 novembre 2026. Aucun changement de modèle.

### D-046 Dessins de fond en gravure

- **Date** : 2026-11-22
- **Contexte** : demande de l'utilisateur, « les dessins de fond de page doivent être plus détaillés et plus fins ». Les motifs de D-038 étaient des icônes agrandies, aux traits de 9 px.
- **Choix** :
  - Quatorze illustrations originales, une par écran (comptoir, fichier, verre taillé, alambic, roue de dégustation, herbier, étagères…), dans `src/renderer/src/app/backdrops/`.
  - Traits de 1, 0,7 et 0,5 px qui ne grossissent pas avec la fenêtre, hachures, aucun fichier image. Calculées une fois, immobiles après l'entrée, masquées en mode performance.
  - Le shaker du logo n'y figure jamais : le logo reste le seul à le montrer (D-025).
- **Validation** : demande de l'utilisateur du 22 novembre 2026.

### D-047 Barre latérale qui se ferme

- **Date** : 2026-11-22
- **Contexte** : demande de l'utilisateur, « la sidebar doit pouvoir se fermer ». Repliée en icônes (D-032), elle restait à l'écran.
- **Choix** :
  - Trois états : ouverte, réduite aux icônes, fermée. Fermée, elle n'occupe plus aucune place et sort du parcours clavier.
  - Bouton « Fermer la barre latérale » dans la barre elle-même, bouton « Menu » avec le logo dans la barre du haut pour la rouvrir telle qu'elle était.
  - Ctrl+B ferme et rouvre, au lieu de réduire aux icônes. Dans un champ de mise en forme, il reste le gras (D-044).
  - L'état est gardé sur l'ordinateur, ouverte par défaut.
- **Validation** : demande de l'utilisateur du 22 novembre 2026.

## À valider plus tard

| Sujet                  | Proposition                                                                           | Échéance        |
| ---------------------- | ------------------------------------------------------------------------------------- | --------------- |
| Police définitive      | Manrope (déjà embarquée) ou Outfit, sur la page `/dev/kit`.                           | Phase 2         |
| Licence du code source | MIT ou GPL-3.0, et publication ou non du dépôt.                                       | Avant diffusion |
| Signature de code      | Certificat Windows et notarisation macOS. La configuration est prête mais désactivée. | Avant diffusion |

## Dépendances (phases 0 et 1)

Versions exactes verrouillées dans `package.json` et `package-lock.json`. La plupart sont imposées par la section 4 de la spec.

### Embarquées dans l'application

| Paquet         | Version | Licence    | Rôle et justification                                                                              |
| -------------- | ------- | ---------- | -------------------------------------------------------------------------------------------------- |
| react          | 19.3.1  | MIT        | Interface (section 4).                                                                             |
| react-dom      | 19.3.1  | MIT        | Rendu de React dans le renderer.                                                                   |
| zod            | 4.6.7   | MIT        | Schémas du contrat IPC, partagés entre main et renderer (sections 4 et 6).                         |
| electron-log   | 5.4.4   | MIT        | Journal local avec rotation (section 4). Canal IPC retiré, voir D-009.                             |
| better-sqlite3 | 13.2.0  | MIT        | Base SQLite, accès exclusif depuis le main (section 4). Node-API, sans recompilation : voir D-021. |
| drizzle-orm    | 0.45.4  | Apache-2.0 | Schéma typé, requêtes paramétrées et migrations au démarrage (sections 4 et 6).                    |

### Outillage de développement

| Paquet                    | Version | Licence    | Rôle et justification                                                                              |
| ------------------------- | ------- | ---------- | -------------------------------------------------------------------------------------------------- |
| electron                  | 45.3.3  | MIT        | Coquille desktop (D-001).                                                                          |
| electron-vite             | 6.0.0   | MIT        | Build séparé main, preload, renderer et rechargement à chaud (section 4).                          |
| vite                      | 8.3.8   | MIT        | Moteur de build utilisé par electron-vite.                                                         |
| @vitejs/plugin-react      | 6.3.0   | MIT        | JSX et React Refresh dans Vite.                                                                    |
| typescript                | 6.0.3   | Apache-2.0 | Typage strict (section 4). Version : voir D-005.                                                   |
| tailwindcss               | 4.3.5   | MIT        | Styles et tokens (sections 4 et 11).                                                               |
| @tailwindcss/vite         | 4.3.5   | MIT        | Intégration de Tailwind v4 dans Vite.                                                              |
| electron-builder          | 26.18.0 | MIT        | Installeurs NSIS et DMG, fuses (sections 4, 6 et 13.3).                                            |
| vitest                    | 5.1.0   | MIT        | Tests unitaires (section 13.1).                                                                    |
| @playwright/test          | 1.65.1  | Apache-2.0 | Tests de bout en bout pilotant Electron (section 13.1).                                            |
| eslint                    | 10.15.0 | MIT        | Lint bloquant (section 13.2).                                                                      |
| @eslint/js                | 10.0.1  | MIT        | Règles recommandées d'ESLint.                                                                      |
| typescript-eslint         | 8.72.2  | MIT        | Lint typé du TypeScript (section 4).                                                               |
| eslint-plugin-react-hooks | 7.1.1   | MIT        | Règles des hooks React, exigées par la section 13.2.                                               |
| globals                   | 17.14.0 | MIT        | Déclaration des variables globales Node et navigateur pour ESLint. Quelques ko, sans code exécuté. |
| prettier                  | 3.10.1  | MIT        | Formatage bloquant (section 13.2).                                                                 |
| @types/node               | 26.6.6  | MIT        | Types de Node pour main, preload et tests.                                                         |
| @types/react              | 19.3.0  | MIT        | Types de React.                                                                                    |
| @types/react-dom          | 19.3.0  | MIT        | Types de React DOM.                                                                                |
| drizzle-kit               | 0.31.11 | MIT        | Génération des migrations versionnées (section 4). Outil de développement, non livré.              |
| @types/better-sqlite3     | 9.6.0   | MIT        | Types de better-sqlite3.                                                                           |
