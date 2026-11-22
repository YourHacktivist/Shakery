/** Help of the home, the journal and the notebook (D-048). */
import { home as h } from '../home'
import { journal as j } from '../journal'
import { item, section, topic } from './model'

const nb = j.notebook

export const home = topic(
  'Accueil',
  'Où en sont tes créations : les plus récentes, celle du moment et ce qu’il reste à tester.',
  section(
    h.title,
    item(
      h.views.current,
      'Tes cocktails au statut Idée, Brouillon ou En test. Leur nombre est rappelé au-dessus du titre.',
    ),
    item(h.views.favorites, 'Tes cocktails marqués d’une étoile, quel que soit leur statut.'),
    item(h.viewsLabel, 'Les deux boutons En cours et Favoris.'),
    item(h.families, 'Ne montre qu’une famille de cocktails.'),
    item(h.allFamilies, 'Enlève le filtre de famille.'),
    item(
      'Les trois cartes',
      'Les plus récentes, selon la dernière modification ou dégustation. La flèche en coin ouvre la fiche. Un emplacement vide note une idée.',
    ),
    item(
      h.card.lastRating,
      'La moyenne des notes de la dernière version notée. ▲ ou ▼ donne l’écart avec la version notée d’avant.',
    ),
    item(h.card.curve, 'La courbe apparaît à partir de deux versions notées.'),
    item(h.empty.firstIdea, 'Sur un carnet vide : ouvre l’idée rapide.'),
    item(h.empty.classics, 'Sur un carnet vide : ouvre la liste des fiches.'),
  ),
  section(
    h.hero.title,
    item(h.hero.openLab, 'Pour choisir une fiche à régler ou partir de zéro.'),
    item(h.hero.noteIdea, 'Ouvre l’idée rapide.'),
  ),
  section(
    h.focus.eyebrow,
    item(
      'La fiche choisie',
      'Ta fiche en test la plus récente. Sans fiche en test, la création en cours la plus récente.',
    ),
    item(h.focus.lab, 'Ouvre cette fiche dans l’atelier.'),
    item(h.focus.taste, 'Note une dégustation de sa version courante.'),
    item(h.focus.nextStep, 'La plus récente prochaine étape de cette fiche, pas encore cochée comme testée.'),
    item(h.focus.abv, 'L’alcool rapporté au volume servi, dilution comprise.'),
    item(h.focus.sugar, 'Grammes pour 100 ml servis.'),
    item(h.focus.acid, 'Grammes pour 100 ml servis.'),
    item(h.focus.ratio, 'Le sucre divisé par l’acidité.'),
    item('L’écart', 'Au-dessus de chaque chiffre : la différence avec la version précédente.'),
    item(
      'La jauge',
      'Curseur plein pour la version courante, repère creux pour la précédente, bande pour la zone de la famille. Une zone demande cinq fiches complètes.',
    ),
    item('Un tiret', 'Une donnée manque. Ouvre la fiche : le panneau Calculs dit laquelle.'),
  ),
)

export const tastings = topic(
  j.title,
  'Chaque essai noté, du plus récent au plus ancien, avec ce qu’il faut tester ensuite.',
  section(
    j.filters.label,
    item(j.add, 'Ouvre la note de dégustation, avec la fiche filtrée déjà choisie. Ctrl J.'),
    item(j.filters.recipe, 'Les notes d’une seule fiche. Seules les fiches déjà goûtées sont proposées.'),
    item(j.filters.allRecipes, 'Enlève le filtre de fiche.'),
    item(j.filters.minOverall, 'À partir de 2, 3, 4 ou 5 étoiles. Une note sans étoile est alors masquée.'),
    item(j.filters.anyOverall, 'Enlève le filtre de note.'),
    item(j.filters.view, 'Les deux boutons Toutes et À retester.'),
    item(j.filters.all, 'Toutes les notes.'),
    item(
      j.filters.toRetest,
      'Les notes dont la prochaine étape n’est pas testée. Celle que tu coches reste visible jusqu’au changement de vue.',
    ),
  ),
  section(
    'Une note',
    item('En tête', 'La fiche, la version goûtée, les étoiles et la date. Le nom ouvre la fiche.'),
    item('Les pastilles', 'Les critères qui ne sont pas justes, avec leur écart de −2 à +2.'),
    item('Le commentaire', 'Avec sa mise en forme, puis la photo et le contexte.'),
    item(j.nextStep, 'Ce que tu t’étais promis d’essayer.'),
    item(j.nextStepDone, 'Coche-la quand tu as essayé : elle quitte « À retester » et la barre latérale.'),
    item(
      j.delete,
      'Met la note à la corbeille, avec « Annuler » pendant 8 secondes. Une note ne se modifie pas : supprime-la et refais-la.',
    ),
  ),
)

export const notebook = topic(
  nb.title,
  'Tout ce qui n’est pas encore une fiche : associations, techniques, bouteilles à goûter.',
  section(
    'La liste',
    item(nb.add, 'Crée une note vide et l’ouvre.'),
    item(nb.filter, 'Cherche dans le titre, le texte et les tags, sans tenir compte des accents.'),
    item('L’ordre', 'Les notes épinglées d’abord, puis les plus récemment modifiées.'),
  ),
  section(
    'Une note',
    item(
      nb.saved,
      'La note s’enregistre seule pendant que tu écris. Les points de suspension disent que c’est en cours.',
    ),
    item(nb.pin, 'La garde en haut de la liste.'),
    item(nb.unpin, 'La remet à sa place.'),
    item(nb.toIdea, 'Crée une fiche au statut Idée, avec le titre pour nom et le texte pour notes.'),
    item(nb.delete, 'Met la note à la corbeille, avec « Annuler » pendant 8 secondes.'),
    item(nb.titleField, 'Vide, il devient « Nouvelle note ».'),
    item(nb.body, 'Gras, italique et listes par les boutons, Ctrl B ou Ctrl I.'),
    item(
      nb.mentions,
      'Tape @ puis quelques lettres d’une fiche, d’un ingrédient ou d’une bouteille. ↑ et ↓ choisissent, Entrée ou Tab insère, Échap abandonne.',
    ),
    item(nb.tags, 'Séparés par des virgules, 30 au plus. Ils se cherchent.'),
    item(
      nb.links,
      'Ce que tu as lié. Une fiche ou un ingrédient s’ouvre au clic. La croix retire le lien sans toucher au texte.',
    ),
  ),
)
