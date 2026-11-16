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

## Arborescence actuelle (fin de phase 0)

```
shakery/
├─ .github/workflows/ci.yml     lint, typage, tests, build, audit, e2e
├─ electron.vite.config.ts      build main / preload / renderer, CSP en balise meta
├─ electron-builder.yml         installeurs NSIS et DMG, fuses
├─ eslint.config.mjs            lint typé et règles de frontière
├─ playwright.config.ts         tests de bout en bout sur Electron
├─ vitest.config.ts             tests unitaires
├─ tsconfig*.json               quatre projets TypeScript (voir plus bas)
├─ build/                       ressources de packaging (icône maître)
├─ resources/                   icône de fenêtre en développement
├─ design/                      maquettes, tokens et logo de référence (non embarqués)
├─ docs/                        SPEC, DECISIONS, SECURITY, ARCHITECTURE, DATA_SOURCES
├─ src/
│  ├─ main/
│  │  ├─ index.ts               verrou d'instance unique, démarrage, cycle de vie
│  │  ├─ window.ts              fenêtre principale et réglages webPreferences
│  │  ├─ security.ts            navigation, fenêtres, permissions, CSP, liens externes
│  │  ├─ security-policy.ts     règles de sécurité en fonctions pures (testées)
│  │  ├─ protocol.ts            protocole shakery-media://
│  │  ├─ logger.ts              journal local electron-log
│  │  ├─ paths.ts               chemins : renderer, preload, médias, données
│  │  ├─ errors.ts              DomainError
│  │  ├─ ipc/
│  │  │  ├─ index.ts            enregistrement des handlers, contrôle de l'expéditeur
│  │  │  ├─ dispatch.ts         validation Zod et exécution (testé)
│  │  │  └─ app.ts              handlers du domaine app
│  │  ├─ db/                    phase 1
│  │  ├─ services/              phases 1 et 10
│  │  └─ seed/                  phase 4
│  ├─ preload/index.ts          window.shakery
│  ├─ shared/ipc/
│  │  ├─ channels.ts            liste fermée des opérations
│  │  ├─ contract.ts            schémas Zod d'entrée et de sortie
│  │  ├─ api.ts                 type ShakeryApi dérivé du contrat
│  │  └─ result.ts              IpcResult et codes d'erreur
│  ├─ core/index.ts             logique métier (vide en phase 0)
│  └─ renderer/
│     ├─ index.html
│     └─ src/
│        ├─ main.tsx            point d'entrée React
│        ├─ app/App.tsx         page provisoire de la phase 0
│        ├─ lib/ipc.ts          client IPC typé (unwrap, ShakeryError)
│        ├─ i18n/fr.ts          toutes les chaînes françaises
│        ├─ styles/             tokens Tailwind v4, polices Manrope embarquées
│        ├─ assets/             logo
│        ├─ features/  components/  print/   phases suivantes
├─ scripts/seed/  data/seed/    données de départ (phase 4)
└─ tests/e2e/                   scénarios Playwright (sécurité, démarrage)
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
