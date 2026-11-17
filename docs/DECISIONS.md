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

## À valider plus tard

| Sujet                          | Proposition                                                                                                                                                           | Échéance              |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| TAV « méthode socle »          | Afficher le TAV théorique selon la méthode du socle MAF (sans dilution, traits, poudres et herbes non comptés) à côté du TAV servi estimé de la spec (avec dilution). | Fin de phase 3        |
| Taux de dilution par méthode   | Valeurs initiales proposées avec leurs sources dans `DATA_SOURCES.md`.                                                                                                | Fin de phase 3        |
| Équivalences d'unités          | Trait, goutte, cuillère de bar, cuillère à café, once (30 ml ou 29,57 ml). Le carnet MAF compte un trait à 0,25 ml.                                                   | Fin de phase 3        |
| Police définitive              | Manrope (déjà embarquée) ou Outfit, sur la page `/dev/kit`.                                                                                                           | Phase 2               |
| Corbeille et données de départ | La purge définitive devra garder une trace des `seed_key` purgés, sinon la mise à jour suivante recrée l'entrée.                                                      | Phase de la corbeille |
| Licence du code source         | MIT ou GPL-3.0, et publication ou non du dépôt.                                                                                                                       | Avant diffusion       |
| Signature de code              | Certificat Windows et notarisation macOS. La configuration est prête mais désactivée.                                                                                 | Avant diffusion       |

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
