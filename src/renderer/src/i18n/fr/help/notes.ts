/** Help of the home, the journal and the notes (D-048, D-057). */
import { componentsForms as forms } from '../components-forms'
import { home as h } from '../home'
import { journal as j } from '../journal'
import { item, section, topic } from './model'

const nb = j.notebook
/** « le degré » becomes the term « Le degré »: the help compares without the case. */
const capital = (text: string) => `${text.charAt(0).toLocaleUpperCase('fr')}${text.slice(1)}`

export const home = topic(
  'Accueil',
  'L’accueil montre la création en focus, les étapes à retester et les créations en cours. Une colonne à droite réunit l’atelier, ce que permet le bar ce soir et les préparations en cours.',
  section(
    'En haut de l’écran',
    item(
      h.title,
      'C’est le titre de l’accueil. Le compteur au-dessus donne le nombre de créations en cours, au statut Idée, Brouillon ou En test.',
    ),
  ),
  section(
    h.focus.title,
    item(
      'La fiche choisie',
      'C’est la création en test la plus récente. Sans création en test, c’est la création en cours la plus récente.',
    ),
    item('En tête', 'La famille et la date de la dernière dégustation précèdent le nom, qui ouvre la fiche.'),
    item(h.focus.meta.status, 'Il donne l’avancement de la fiche, dans sa couleur.'),
    item(h.focus.meta.version, 'Elle donne le numéro de la version courante.'),
    item(h.focus.meta.rating, 'Elle donne la moyenne des notes de la dernière version notée.'),
    item(h.focus.lab, 'Le bouton ouvre cette fiche dans l’atelier.'),
    item(h.focus.taste, 'Le bouton ouvre une note de dégustation sur sa version courante.'),
    item(h.focus.abv, 'Le degré rapporte l’alcool au volume servi, dilution comprise.'),
    item(h.focus.sugar, 'La valeur est en grammes pour 100 ml servis.'),
    item(h.focus.acid, 'La valeur est en grammes pour 100 ml servis.'),
    item(h.focus.ratio, 'Le rapport divise le sucre par l’acidité.'),
    item(
      'La jauge',
      'Elle n’apparaît que pour une valeur connue. Le curseur plein marque la version courante, le repère creux la précédente et la bande la zone de la famille. Une zone demande cinq fiches complètes.',
    ),
    item(h.empty.firstIdea, 'Sans création en cours, ce bouton ouvre l’idée rapide, comme Ctrl N.'),
  ),
  section(
    'Indicateurs à compléter',
    item(
      'La phrase sous les jauges',
      'Elle nomme les indicateurs encore inconnus. Le panneau Calculs de la fiche dit quelle ligne bloque.',
    ),
    item(
      capital(h.focus.unknown.abv),
      'Il manque quand un ingrédient de la fiche n’a pas de degré, ni sa bouteille choisie. Il se renseigne dans Ingrédients, avec 0 pour un produit sans alcool.',
    ),
    item(
      capital(h.focus.unknown.sugar),
      'Il manque quand un ingrédient n’a pas de teneur en sucre. Elle se renseigne dans Ingrédients, avec 0 s’il n’y en a pas.',
    ),
    item(
      capital(h.focus.unknown.acid),
      'Elle manque quand un ingrédient n’a pas d’acidité. Elle se renseigne dans Ingrédients, avec 0 s’il n’y en a pas.',
    ),
  ),
  section(
    h.retest.title,
    item(
      'Les lignes',
      'Chacune reprend la prochaine étape d’une dégustation, pas encore cochée comme testée, avec la version qui l’a fait naître.',
    ),
    item(h.retest.action, 'Le bouton ouvre la fiche dans l’atelier.'),
    item(h.retest.journal, 'Le lien ouvre le journal des dégustations.'),
  ),
  section(
    h.inProgress.title,
    item(
      h.inProgress.label,
      'Le tableau montre les cinq créations au statut Idée, Brouillon ou En test les plus récentes, selon la dernière modification ou dégustation.',
    ),
    item(h.inProgress.columns.name, 'Le nom ouvre la fiche.'),
    item(h.inProgress.columns.family, 'Un trait signale une fiche sans famille.'),
    item(
      h.inProgress.columns.activity,
      'Elle date la dernière modification ou la dernière dégustation, la plus récente des deux.',
    ),
    item(h.inProgress.all, 'Le lien ouvre la page Fiches, qui liste toutes les créations.'),
  ),
  section(
    h.hero.title,
    item(h.hero.openLab, 'Le bouton ouvre l’atelier, où se choisit une fiche à régler ou une page blanche.'),
    item(h.hero.fromClassic, 'Le lien ouvre les classiques de la page Fiches.'),
  ),
  section(
    h.tonight.title,
    item('Le nombre', 'Il compte les fiches réalisables avec les ingrédients cochés Au bar.'),
    item(
      h.tonight.firstToBuy,
      'C’est l’ingrédient qui débloquerait le plus de fiches, auxquelles il manque seul.',
    ),
    item(h.tonight.action, 'Le lien ouvre les ingrédients et leur liste d’achats.'),
  ),
  section(
    h.preps.title,
    item('Les lignes', 'Elles montrent les lots en cours, le plus proche de sa date limite en premier.'),
    item(h.preps.action, 'Le lien ouvre les préparations.'),
  ),
)

export const tastings = topic(
  j.title,
  'Le journal liste chaque essai noté, du plus récent au plus ancien, avec ce qu’il faut tester ensuite.',
  section(
    j.filters.label,
    item(j.add, 'Ouvre la note de dégustation, avec la fiche filtrée déjà choisie. Ctrl J.'),
    item(
      j.filters.recipe,
      'Ne montre que les notes d’une seule fiche. Seules les fiches déjà goûtées sont proposées.',
    ),
    item(j.filters.allRecipes, 'Enlève le filtre de fiche.'),
    item(
      j.filters.minOverall,
      'Ne montre que les notes d’au moins 2, 3, 4 ou 5 étoiles. Une note sans étoile est alors masquée.',
    ),
    item(j.filters.anyOverall, 'Enlève le filtre de note.'),
    item(j.filters.view, 'Ce sont les deux boutons Toutes et À retester.'),
    item(j.filters.all, 'Montre toutes les notes.'),
    item(
      j.filters.toRetest,
      'Montre les notes dont la prochaine étape n’est pas testée. Une étape cochée reste visible jusqu’au changement de vue.',
    ),
  ),
  section(
    'Une note',
    item('En tête', 'Il donne la fiche, la version goûtée, les étoiles et la date. Le nom ouvre la fiche.'),
    item('Les pastilles', 'Elles montrent les critères qui ne sont pas justes, avec leur écart de −2 à +2.'),
    item('Le commentaire', 'Il s’affiche avec sa mise en forme, suivi de la photo et du contexte.'),
    item(
      forms.photo.add,
      'L’icône image, sur une note sans photo, ouvre la zone où la déposer. Une photo se change ou se retire, avec « Annuler ».',
    ),
    item(j.nextStep, 'Elle rappelle ce qui reste à essayer.'),
    item(
      j.nextStepDone,
      'Cochée une fois l’essai fait, l’étape quitte « À retester », dans le journal comme sur l’accueil.',
    ),
    item(
      j.delete,
      'Met la note à la corbeille, avec « Annuler » pendant 8 secondes. Une note ne se modifie pas. Pour la corriger, il faut la supprimer puis la refaire.',
    ),
  ),
)

export const notebook = topic(
  nb.title,
  'Les notes gardent ce qui n’est pas encore une fiche, comme une association, une technique ou une bouteille à goûter.',
  section(
    'La liste',
    item(nb.add, 'Crée une note vide et l’ouvre.'),
    item(nb.filter, 'Cherche dans le titre, le texte et les tags, sans tenir compte des accents.'),
    item('L’ordre', 'Les notes épinglées viennent d’abord, puis les plus récemment modifiées.'),
  ),
  section(
    'Une note',
    item(
      nb.saved,
      'La note s’enregistre seule pendant la saisie. Les points de suspension signalent un enregistrement en cours.',
    ),
    item(nb.pin, 'La garde en haut de la liste.'),
    item(nb.unpin, 'La remet à sa place.'),
    item(nb.toIdea, 'Crée une fiche au statut Idée, avec le titre pour nom et le texte pour notes.'),
    item(nb.delete, 'Met la note à la corbeille, avec « Annuler » pendant 8 secondes.'),
    item(nb.titleField, 'Vide, il devient « Nouvelle note ».'),
    item(nb.body, 'Les boutons, Ctrl B et Ctrl I mettent le texte en gras, en italique ou en liste.'),
    item(
      nb.mentions,
      'Le signe @ suivi de quelques lettres cherche une fiche, un ingrédient ou une bouteille. ↑ et ↓ choisissent, Entrée ou Tab insère, Échap abandonne.',
    ),
    item(nb.tags, 'Séparés par des virgules, 30 au plus. Ils se cherchent.'),
    item(
      nb.links,
      'La liste montre les éléments liés. Une fiche ou un ingrédient s’ouvre au clic. La croix retire le lien sans toucher au texte.',
    ),
  ),
)
