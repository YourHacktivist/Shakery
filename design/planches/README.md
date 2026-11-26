# Planches de la refonte ergonomique

Ces planches montrent la refonte proposée le 24 novembre 2026, écran par écran, avant tout changement du code. Les données affichées sont fictives.

## Ce que contient le dossier

- `png/planches/` : une planche par écran, avec l'écran actuel et l'écran proposé côte à côte, la liste des changements et les questions à trancher. `index.png` résume les principes.
- `png/avant/` et `png/apres/` : les écrans seuls, à 1440 × 900 (images à l'échelle 1,25 comme les captures de Windows).
- `png/reference/` : le mode préparation et la maquette d'origine de l'accueil, qui servent de référence visuelle.
- `html/avant/` : instantanés du DOM réel de l'appli, capturés sur une base de test avec quelques créations fictives.
- `html/apres/` : les mêmes pages retravaillées. Elles s'appuient sur la feuille compilée de l'appli (`html/assets/index-*.css`) et sur `html/assets/planches.css`.
- `notes.json` : changements et questions de chaque écran, source des planches composées.

## Regénérer les images

Depuis la racine du projet, rendre une page en PNG :

```powershell
npx electron design/planches/rendu.cjs design/planches/html/apres/03-fiche.html design/planches/png/apres/03-fiche.png
```

Recomposer les planches après une modification de `notes.json`, puis rendre chacune en largeur 1800 et hauteur automatique :

```powershell
node design/planches/assembler.cjs
```

```powershell
npx electron design/planches/rendu.cjs design/planches/html/planches/03-fiche.html design/planches/png/planches/03-fiche.png 1800 auto
```
