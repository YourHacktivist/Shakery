# Architecture

Shakery est une application Electron à trois processus logiques : le processus principal (main), le preload et le renderer. Le renderer n'accède jamais au système : toute lecture ou écriture passe par une API typée et fermée, validée puis exécutée dans le main. La logique métier vit dans `src/core/`, sans dépendance à Electron, à Node ni au DOM, pour être reprise telle quelle par la future version téléphone.

Schéma des frontières : [`architecture.png`](architecture.png) (section 5 de la spec).

## Processus et frontières

| Processus                  | Rôle                                                                                                    | Peut importer                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| main (`src/main/`)         | fenêtre, cycle de vie, sécurité, IPC, base de données (phase 1), fichiers, réseau facultatif (phase 10) | Electron, Node, `shared/`, `core/`                                      |
| preload (`src/preload/`)   | expose `window.shakery` par `contextBridge`, rien d'autre                                               | `electron` (`contextBridge`, `ipcRenderer`) et `shared/ipc/channels.ts` |
| renderer (`src/renderer/`) | interface React, aucun accès système                                                                    | `shared/`, `core/`, React et ses bibliothèques                          |
| `src/shared/`              | contrat IPC, schémas Zod, types partagés                                                                | Zod seulement                                                           |
| `src/core/`                | calculs métier purs (à partir de la phase 3)                                                            | rien                                                                    |

Le preload tourne en bac à sable (`sandbox: true`) : il ne peut charger que le module `electron`. Il est donc empaqueté avec tout son code (`externalizeDeps: false` dans `electron.vite.config.ts`) et n'importe que `channels.ts`, qui n'a aucune dépendance.

## Arborescence

```
shakery/
├─ .github/workflows/ci.yml     lint, typage, tests, build, audit, e2e
├─ electron.vite.config.ts      build main / preload / renderer, CSP en balise meta
├─ electron-builder.yml         installeurs NSIS et DMG, fuses
├─ build/                       ressources de packaging (icônes)
├─ resources/                   icône de fenêtre et base de départ embarquée
├─ design/                      maquettes, tokens et logo de référence (non embarqués)
├─ data/seed/                   données de départ relues
├─ docs/                        SPEC, DECISIONS, SECURITY, ARCHITECTURE, DATA_SOURCES, PASSATION
├─ scripts/                     icônes, licences, import MAF, performances, base de départ
├─ src/
│  ├─ main/
│  │  ├─ index.ts               verrou d'instance unique, démarrage, cycle de vie
│  │  ├─ window.ts              fenêtre, barre de titre masquée, webPreferences
│  │  ├─ security.ts            navigation, fenêtres, permissions, CSP, liens externes
│  │  ├─ security-policy.ts     règles de sécurité en fonctions pures (testées)
│  │  ├─ protocol.ts            protocole shakery-media://
│  │  ├─ logger.ts              journal local electron-log, sans chemin personnel
│  │  ├─ ipc/                   enregistrement, validation, un fichier par domaine
│  │  ├─ db/                    connexion, migrations, schéma, repositories
│  │  ├─ services/              sauvegardes, export, import, impression, Open Food Facts
│  │  └─ seed/                  chargement de la base de départ
│  ├─ preload/index.ts          window.shakery
│  ├─ shared/                   contrat IPC, schémas, réglages, routes d'impression
│  ├─ core/                     logique métier pure
│  └─ renderer/src/
│     ├─ app/                   coquille, navigation, scènes, thème, raccourcis
│     ├─ components/            composants de base
│     ├─ features/              un dossier par écran
│     ├─ print/                 gabarits imprimés
│     ├─ i18n/                  toutes les chaînes françaises
│     ├─ styles/                tokens Tailwind v4, scènes, polices embarquées
│     └─ assets/                logo, licences
└─ tests/                       e2e/ (Playwright sur Electron) et screens/ (revue des écrans)
```

## Flux d'un appel IPC

Exemple : `window.shakery.app.getVersion()`.

1. **`src/shared/ipc/channels.ts`** déclare le nom de l'opération dans `IPC_CHANNELS` (`'app.getVersion'`), au format `domaine.operation`.
2. **`src/shared/ipc/contract.ts`** associe à ce nom un schéma Zod d'entrée et un schéma de sortie. Le type `satisfies Record<IpcChannel, ContractEntry>` impose qu'aucune opération ne manque.
3. **`src/shared/ipc/api.ts`** dérive du contrat le type `ShakeryApi` : `app.getVersion` devient `window.shakery.app.getVersion()`, qui renvoie une `Promise<IpcResult<{ version: string }>>`.
4. **`src/preload/index.ts`** parcourt `IPC_CHANNELS` et crée une fonction par opération, qui transmet un seul argument par `ipcRenderer.invoke`. L'objet est exposé sous `window.shakery`.
5. **`src/main/ipc/index.ts`** enregistre un `ipcMain.handle` par opération, et aucun autre. Chaque appel vérifie que l'expéditeur est la trame principale du document de l'application, sinon il renvoie `FORBIDDEN`.
6. **`src/main/ipc/dispatch.ts`** valide l'entrée avec le schéma Zod (`INVALID_INPUT` en cas d'échec), exécute le handler, renvoie `{ ok: true, data }`. Une `DomainError` passe telle quelle ; toute autre erreur est écrite au journal et devient `INTERNAL`, sans trace de pile.
7. **`src/renderer/src/lib/ipc.ts`** fournit `unwrap()`, qui renvoie la donnée ou lève une `ShakeryError` portant le code. Le message affiché vient de `i18n/fr.ts` (`fr.errors[code]`).

## Ajouter une opération IPC

1. Ajouter le nom dans `IPC_CHANNELS` (`src/shared/ipc/channels.ts`).
2. Déclarer ses schémas dans `ipcContract` (`src/shared/ipc/contract.ts`) : objets en `.strict()`, `.max()` sur chaque chaîne et chaque tableau, `noInput` s'il n'y a pas d'entrée.
3. Écrire le handler dans le fichier du domaine (`src/main/ipc/<domaine>.ts`) et l'ajouter à `createHandlers()` dans `src/main/ipc/index.ts`. Le typage refuse la compilation tant qu'un handler manque.
4. Tester : schéma qui refuse les entrées invalides et trop longues, comportement du handler (section 13.1).
5. Appeler l'opération depuis le renderer avec `unwrap(shakery.<domaine>.<operation>(...))`. Rien à modifier dans le preload, ni dans le type de `window.shakery`.

## Projets TypeScript

| Fichier              | Contenu                                                | Ce qu'il garantit                                                                                                        |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `tsconfig.node.json` | main, preload, shared, core, fichiers de configuration | types Node, pas de DOM                                                                                                   |
| `tsconfig.web.json`  | renderer, shared, core                                 | DOM et types Vite, pas de types Node, alias `@renderer`, `@shared`, `@core`                                              |
| `tsconfig.core.json` | core et shared, hors tests                             | ni DOM ni Node (`lib: ES2023`, `types: []`) : une fuite d'API système dans le code métier ou le contrat échoue au typage |
| `tsconfig.e2e.json`  | tests Playwright                                       | Node et DOM (le code passé à `page.evaluate` tourne dans la page)                                                        |

Tous héritent de `tsconfig.base.json` : mode strict, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `noImplicitReturns`. `npm run typecheck` vérifie les quatre.

## Règles ESLint de frontière

Définies dans `eslint.config.mjs`, en plus du jeu `strictTypeChecked` de typescript-eslint :

- `src/renderer/` : interdiction d'importer `electron` et les modules Node (`fs`, `path`, `os`, `child_process`, `url`, `crypto`, `process`, avec ou sans préfixe `node:`) ; règles des hooks React.
- `src/core/` et `src/shared/` : mêmes interdictions, plus `react` et tout fichier de `main/`, `renderer/` ou `preload/`.
- Partout : `dangerouslySetInnerHTML` interdit (section 6).

## Chargement de l'interface

- En développement (`npm run dev`), le main charge l'URL du serveur Vite (`ELECTRON_RENDERER_URL`).
- Sinon, il charge `out/renderer/index.html` en `file://`. Le routage par hash (phase 2) reste compatible avec ce mode.
- La CSP est appliquée par en-tête et par balise meta (voir `docs/DECISIONS.md`, D-007 et D-008).

## Couche de données (phase 1)

| Fichier                       | Rôle                                                                                                           |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/main/db/schema.ts`       | Schéma Drizzle : tables de la section 7 et extension MAF (D-016), énumérations en contraintes `CHECK`          |
| `resources/migrations/`       | Migrations générées par `npx drizzle-kit generate`, plus `0001_search_index.sql` écrite à la main (table FTS5) |
| `src/main/db/connection.ts`   | Ouverture de la base (WAL, clés étrangères, `busy_timeout`), `quick_check`                                     |
| `src/main/db/migrate.ts`      | Migrations en attente, application avec contrôle des clés étrangères                                           |
| `src/main/db/manager.ts`      | Cycle de vie : démarrage, sauvegardes, restauration, état de santé                                             |
| `src/main/db/repositories/`   | Seul code qui exécute du SQL ; implémente les interfaces de `src/shared/`                                      |
| `src/main/seed/`              | Validation et chargement des référentiels de `data/seed/`                                                      |
| `src/main/services/backup.ts` | Sauvegardes : copie cohérente, manifeste, magasin de photos, rotation (D-022)                                  |

Le carnet est `userData/shakery.db`, les photos sont dans `userData/media/` et les sauvegardes dans `userData/backups/` (ou le dossier choisi dans les réglages).

**Démarrage** (`DatabaseManager.open`) :

1. ouverture du fichier et `PRAGMA quick_check`. En cas d'échec, rien n'est migré ni écrit : l'application démarre en état « corrompu » et les opérations qui lisent le carnet renvoient `UNAVAILABLE` ;
2. si le fichier contient déjà un carnet et que des migrations attendent, sauvegarde `pre-migration` ;
3. migrations, dans une transaction ;
4. ajout des entrées de départ absentes (une entrée supprimée par l'utilisateur n'est jamais recréée).

Une fois la fenêtre ouverte, une sauvegarde quotidienne est faite si la dernière date de plus de 24 heures. Une autre est faite à la fermeture.

**Ajouter une table ou une colonne** : modifier `schema.ts`, lancer `npx drizzle-kit generate --name <nom>`, relire le SQL produit, compléter les tests de `src/main/db/migrate.test.ts`. Une migration ne supprime jamais de données utilisateur sans étape de conversion (section 7).

**Tests du module natif** : better-sqlite3 est compilé en Node-API et se charge aussi bien sous Node que sous Electron (D-021). Les tests qui touchent la base tournent donc sous Vitest, sur des bases en mémoire ou dans un dossier temporaire.

## Apparence, écrans et impression (phase 11)

- Thèmes : `src/renderer/src/styles/tokens.css` (copie de `design/tokens.css`). Aucune couleur propre à un thème dans un composant : utiliser les jetons (`bg-tint/4` pour un survol, `shadow-pop` pour un élément flottant).
- Écrans : `app/scenes.tsx` nomme la scène d'une adresse, `styles/scenes.css` porte son entrée et son motif. Un nouvel écran y ajoute sa scène, sa largeur est `max-w-page`.
- Fenêtre : `src/main/window.ts` (barre de titre masquée, couleurs des boutons natifs) ; les zones `window-drag` déplacent la fenêtre.
- Impression : une route `/print/…` hors coquille, rendue dans une fenêtre cachée (`src/main/services/print.ts`).

## Aide, données sensibles et alignement (D-043 à D-049)

- Aide : `features/help/HelpDialog.tsx`, ouverte par `useHelpStore` (pas une des fenêtres de `useOverlayStore`, pour ne pas fermer une saisie en cours). `app/help.ts` relie chaque scène à son sujet : une scène sans sujet ne compile pas. Les textes sont dans `i18n/fr/help/` et reprennent les libellés des écrans par leurs clés.
- Effacements : corbeille (`services/trash.ts`) et réinitialisation (`db/manager.ts`) passent toujours par `backupBeforeErasing`, qui refuse d'effacer si la sauvegarde ne se vérifie pas.
- Photos : le renderer réencode en WebP ; `services/photos.ts` relit la structure, refuse toute métadonnée et choisit le nom du fichier. Une photo n'est jamais réécrite en place ; les fichiers orphelins partent quand la corbeille est vidée.
- Alignement : `tests/e2e/page-alignment.ts` (centres, hauteurs, rangées cassées, libellés coupés) complète `page-audit.ts` (débordements, contrastes, noms). Un contrôle dans une rangée fait 32 px, ou 28 px pour toute la rangée.
