/** Settings screen (section 10.14). */
export const settings = {
  title: 'Paramètres',
  subtitle: 'Ton Shakery, à ta façon',
  appearance: {
    eyebrow: 'Affichage',
    title: 'Apparence et unités',
    theme: 'Thème',
    themes: { dark: 'Sombre', light: 'Clair' },
    unit: 'Unité des doses',
    units: { ml: 'ml', cl: 'cl', oz: 'oz' },
    warning: 'Alerte des préparations',
    days: (count: number) =>
      count === 0 ? 'Le jour même' : count === 1 ? '1 jour avant' : `${count} jours avant`,
    animations: 'Animations',
    note: 'Une once compte 30 ml. Les animations se coupent aussi quand Windows les réduit.',
  },
  backups: {
    eyebrow: 'Sauvegardes',
    title: 'Sauvegarder et restaurer',
    description:
      'Une sauvegarde par jour et une à la fermeture. Shakery garde les 14 derniers jours et 8 semaines.',
    create: 'Sauvegarder maintenant',
    created: 'Carnet sauvegardé.',
    choose: 'Changer de dossier…',
    useDefault: 'Dossier par défaut',
    restore: 'Restaurer',
    restoreOf: (when: string) => `Restaurer la sauvegarde du ${when}`,
    reasons: {
      daily: 'quotidienne',
      shutdown: 'à la fermeture',
      manual: 'manuelle',
      'pre-migration': 'avant une mise à jour',
      'pre-restore': 'avant une restauration',
    },
    confirmTitle: 'Restaurer cette sauvegarde',
    confirmText: (when: string) =>
      `Le carnet reviendra à son état du ${when}. Son état actuel est sauvegardé juste avant.`,
    cancel: 'Annuler',
  },
  about: {
    title: 'À propos de Shakery',
    tagline: 'Carnet de création du barman, local et hors ligne.',
    guide: 'Guide',
    shortcuts: 'Raccourcis',
    logs: 'Journaux',
    licences: 'Licences',
    licencesTitle: 'Licences des composants',
    licencesText: 'Les logiciels libres livrés avec Shakery.',
    sources: [
      { name: 'Wikidata', text: 'Noms d’ingrédients, CC0.' },
      {
        name: 'Anses',
        text: 'Anses. 2020. Table de composition nutritionnelle des aliments Ciqual. Licence Ouverte.',
      },
      {
        name: 'International Bartenders Association',
        text: 'Doses des cocktails officiels, étapes réécrites.',
      },
      { name: '24cocktails.com', text: 'Formules des classiques, pour un usage personnel.' },
      { name: 'Open Food Facts', text: '© contributeurs Open Food Facts, ODbL.' },
      { name: 'Manrope', text: 'Police sous licence SIL Open Font License 1.1.' },
    ],
  },
  import: {
    eyebrow: 'Importer',
    title: 'Importer un carnet',
    description:
      'Un fichier .shakery venant d’un autre carnet ou d’une conversion, comme les carnets MAF. Le carnet actuel est sauvegardé avant l’import.',
    choose: 'Choisir un fichier…',
    reading: 'Lecture du fichier…',
    source: (label: string | null) => (label ? `Fichier : ${label}` : 'Fichier sans nom'),
    tableHead: { table: 'Contenu', total: 'Dans le fichier', added: 'Nouveaux', matched: 'Déjà présents' },
    conflicts: (count: number) =>
      count === 1
        ? '1 élément existe déjà avec un contenu différent.'
        : `${count} éléments existent déjà avec un contenu différent.`,
    strategyLabel: 'Éléments déjà présents',
    strategies: {
      ignore: 'Garder les miens',
      replace: 'Remplacer',
      duplicate: 'Garder les deux',
    },
    apply: 'Importer',
    applying: 'Import en cours…',
    cancel: 'Annuler',
    done: (inserted: number, updated: number) =>
      updated > 0
        ? `Import terminé : ${inserted} éléments ajoutés, ${updated} remplacés.`
        : `Import terminé : ${inserted} éléments ajoutés.`,
    invalid: 'Ce fichier n’est pas un carnet Shakery valide. Rien n’a été modifié.',
    expired: 'Le fichier choisi a expiré. Choisis-le à nouveau.',
    /** Names of the tables shown in the preview; the others are counted in « Autres éléments ». */
    tables: {
      recipes: 'Recettes',
      ingredients: 'Ingrédients',
      products: 'Bouteilles',
      knowledge_sheets: 'Fiches de culture',
      knowledge_items: 'Éléments de fiches',
      reference_specs: 'Versions de référence',
      collections: 'Collections',
      study_tables: 'Tableaux à réviser',
      tasting_notes: 'Dégustations',
      notebook_entries: 'Notes du carnet',
      prep_batches: 'Lots de préparations',
    } as Record<string, string>,
    otherTables: 'Autres éléments',
  },
  export: {
    eyebrow: 'Exporter',
    title: 'Exporter le carnet',
    description:
      'Tout le carnet dans un fichier .shakery, photos comprises : à garder en lieu sûr ou à réimporter sur un autre ordinateur.',
    full: 'Exporter tout le carnet',
    running: 'Export en cours…',
    done: 'Carnet exporté.',
    csvTitle: 'Tableaux CSV',
    csvDescription: 'Pour un tableur : fiches avec leurs ingrédients, journal de dégustation, ingrédients.',
    csv: { recipes: 'Fiches', journal: 'Journal', ingredients: 'Ingrédients' },
    csvDone: 'Tableau enregistré.',
  },
  off: {
    eyebrow: 'Open Food Facts',
    title: 'Recherche par code-barres',
    description:
      'Remplit une bouteille depuis la base libre Open Food Facts (marque, nom, contenance, degré, allergènes). C’est la seule fonction de Shakery qui utilise Internet. Désactivée, aucune requête ne part.',
    toggle: 'Recherche par code-barres',
    attribution: '© contributeurs Open Food Facts, ODbL',
  },
} as const
