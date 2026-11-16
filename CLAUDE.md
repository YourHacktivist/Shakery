# Shakery

Application de bureau (Electron, React, Tailwind CSS v4, TypeScript). C'est le carnet de création personnel d'un barman, installé sur son propre PC. Tout est local, sans compte et sans serveur.

## Avant d'écrire du code

- Lis `docs/SPEC.md` en entier. C'est le cahier des charges complet, et il prime sur tout le reste de ce dossier.
- Applique les règles de travail de sa section 1 : une phase à la fois dans l'ordre de la section 14, arrêt et validation à la fin de chaque phase, décisions consignées dans `docs/DECISIONS.md`.
- La première question ouverte de la section 15 (Electron ou Tauri 2) doit être tranchée par l'utilisateur avant la phase 0. Pose-la en premier, avec ta reformulation du projet.
- Seule la version PC est concernée pour l'instant. Le téléphone et la synchronisation sont hors périmètre.

## Design

- `design/maquettes/png/` : captures de l'accueil rempli, de l'accueil d'une base vide et du kit de composants. C'est la cible visuelle de la phase 2 et de la phase 9.
- `design/maquettes/html/` : les mêmes écrans en HTML autonome, à ouvrir dans un navigateur pour relever les styles exacts (tout est en styles inline).
- `design/maquettes/source-canvas/` : sources de l'outil de maquettage. Ce n'est pas du code d'application, ne pas le reprendre tel quel.
- `design/tokens.css` : tokens de la section 11 au format Tailwind v4. Dans Tailwind v4, le préfixe `--text-*` est réservé aux tailles de police, donc les couleurs de texte de la spec y sont nommées `--color-fg`, `--color-fg-secondary` et `--color-fg-muted`.
- `design/assets/` : logo (master carré de 1024 px et déclinaisons, original 1024 × 1536) et police Manrope sous licence OFL.
- `design/reference/reference-dashboard.png` : inspiration visuelle. On en reprend les principes (section 11), jamais l'écran.
- Toutes les données visibles dans les maquettes (cocktails, notes, valeurs) sont fictives. Aucune ne doit se retrouver dans l'application.
