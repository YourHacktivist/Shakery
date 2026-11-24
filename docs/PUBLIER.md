# Publier une nouvelle version

Une version publiée sur GitHub arrive d'elle-même sur les Shakery installés. Au lancement suivant, une fenêtre la propose, puis Shakery sauvegarde le carnet, installe la version sans assistant et redémarre (D-051). La publication se fait par une étiquette Git : la CI de GitHub construit l'installeur et crée la release. Rien n'est publié depuis le PC.

## Avant de publier

Le travail à publier est commité et poussé sur `main`, les notes de version sont écrites (voir plus bas), et les vérifications passent :

```powershell
npm run check
```

```powershell
npm run test:e2e
```

Le numéro de version suit la forme `X.Y.Z`. On augmente `Z` pour une correction, `Y` pour un ajout, `X` pour un changement profond. Le nouveau numéro doit être plus grand que celui qui est installé, sinon aucune fenêtre ne le propose.

## Publier

1. Change le numéro de version. La commande met à jour `package.json` et `package-lock.json`, crée le commit et pose l'étiquette `v0.2.0` :

   ```powershell
   npm version 0.2.0 -m "chore(release): %s"
   ```

2. Pousse le commit et l'étiquette :

   ```powershell
   git push origin main --follow-tags
   ```

3. Suis la construction dans l'onglet Actions du dépôt, sous le nom « Release ». Elle dure une quinzaine de minutes.

La CI (`.github/workflows/release.yml`) vérifie que l'étiquette correspond à la version de `package.json`, installe les dépendances, contrôle le typage et lance les tests unitaires. Elle crée ensuite la release en brouillon, avec le texte de `build/release-notes.md`, y dépose l'installeur, construit l'archive portable (`scripts/release/portable-zip.ts`) et l'ajoute, vérifie que tout y est, puis la publie. La release n'apparaît donc qu'une fois complète. La release contient quatre fichiers : l'installeur `Shakery-X.Y.Z-setup.exe`, son `.blockmap`, `latest.yml` et l'archive portable `Shakery-X.Y.Z-portable.zip`. Shakery installé lit `latest.yml` pour savoir qu'une version existe, vérifie l'installeur par son empreinte SHA-512, et le blockmap lui permet de ne télécharger que ce qui a changé.

La version portable ne s'installe pas. On décompresse l'archive une fois, où on veut, par exemple sur une clé USB, et on lance `Shakery.exe` dans le dossier `Shakery`. Le dossier `Shakery Data`, livré à côté de l'exécutable, met Shakery en mode portable : carnet, sauvegardes et journal y restent. Elle ne peut pas se remplacer seule. Au lancement, elle annonce la nouvelle version comme l'autre, et son bouton ouvre la page de la release : il suffit de décompresser la nouvelle archive au même endroit, en remplaçant les fichiers, pour retrouver le carnet.

## Écrire les notes de version

Avant de publier, décris les changements dans `build/release-notes.md`, en phrases simples séparées par une ligne vide. electron-builder recopie ce texte dans `latest.yml`, et c'est lui que la fenêtre de Shakery affiche sous « Ce qui change ». Il sert aussi de texte à la release sur GitHub. Remplace le texte à chaque version et commite-le avant `npm version`, qui demande un arbre de travail propre.

## Vérifier

Sur GitHub, la release de la version existe et porte les quatre fichiers. Sur le PC, lance Shakery : la fenêtre « Shakery X.Y.Z est disponible » s'ouvre quelques secondes après le démarrage. Si elle ne vient pas, ouvre Paramètres, carte « Mises à jour », et clique sur « Rechercher maintenant ».

## La toute première fois

La version 0.1.0 installée aujourd'hui n'a pas le module de mise à jour. Télécharge l'installeur de la première release qui l'a (fichier `Shakery-X.Y.Z-setup.exe` de la release sur GitHub) et installe-le une fois à la main, par-dessus l'ancienne version : le carnet reste en place. Les versions suivantes arriveront seules.

## En cas de problème

- La CI s'arrête sur « Tag … does not match package.json version » : l'étiquette ne correspond pas au numéro de `package.json`. Supprime l'étiquette locale et distante, puis recommence avec `npm version`.

  ```powershell
  git tag -d v0.2.0
  ```

  ```powershell
  git push origin :refs/tags/v0.2.0
  ```

- Un test échoue dans la CI : rien n'est publié. Corrige, pousse, puis publie le numéro suivant.
- La construction échoue après la création du brouillon : relancer le workflow (« Re-run all jobs » dans l'onglet Actions) supprime d'abord ce que la tentative précédente a laissé pour cette étiquette, puis recommence.
- La release existe mais aucune fenêtre ne s'ouvre : vérifie que la release contient `latest.yml` et que « Rechercher au lancement » est activé dans les paramètres. Le journal de Shakery (Paramètres, À propos, Journaux) note chaque recherche.

## Construire un installeur sans le publier

Pour essayer un installeur sur ce PC sans rien publier :

```powershell
npm run build
```

```powershell
npx electron-builder --win --publish never -c.electronDist=node_modules/electron/dist
```

L'installeur arrive dans `dist/`.
