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
    blur: 'Effet de verre',
    blurs: { full: 'Fort', light: 'Léger', none: 'Aucun' },
    performance: 'Mode performance',
    note: 'Le mode performance retire flou, ombres, dessins de fond et animations. Les animations se coupent aussi quand Windows les réduit.',
  },
  backups: {
    eyebrow: 'Sauvegardes',
    title: 'Sauvegarder et restaurer',
    description: 'Une sauvegarde au démarrage selon la fréquence choisie, et une à chaque fermeture.',
    frequency: 'Fréquence',
    every: (hours: number) =>
      hours === 24
        ? 'Chaque jour'
        : hours === 168
          ? 'Chaque semaine'
          : hours < 24
            ? `Toutes les ${hours} h`
            : `Tous les ${hours / 24} jours`,
    keepDaily: 'Jours gardés',
    keptDays: (count: number) => `${count} jours`,
    keepWeekly: 'Semaines gardées',
    keptWeeks: (count: number) => (count === 0 ? 'Aucune' : `${count} semaines`),
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
      'pre-purge': 'avant de vider la corbeille',
      'pre-reset': 'avant une réinitialisation',
    },
    confirmTitle: 'Restaurer cette sauvegarde',
    confirmText: (when: string) =>
      `Le carnet reviendra à son état du ${when}. Son état actuel est sauvegardé juste avant.`,
    cancel: 'Annuler',
  },
  calculation: {
    eyebrow: 'Calculs',
    title: 'Équivalences, dilution, atelier',
    description: 'Chaque fiche, jauge et calculateur suit ces valeurs. Les doses notées ne changent pas.',
    ounce: 'Une once',
    ounces: { bar: '30 ml', exact: '29,57 ml' },
    measures: {
      dashMl: 'Un trait',
      dropMl: 'Une goutte',
      barspoonMl: 'Une cuillère de bar',
      tspMl: 'Une cuillère à café',
    },
    dilution: 'Dilution par méthode',
    dilutionHint: 'L’eau qu’apporte la glace, en part du volume de départ. Une fiche peut avoir la sienne.',
    steps: 'Pas des doses dans l’atelier',
    stepMl: 'En ml et cl',
    stepOz: 'En onces',
    inMl: (value: string) => `${value} ml`,
    inOz: (value: number) =>
      value === 0.125 ? '⅛ oz' : value === 0.25 ? '¼ oz' : value === 0.5 ? '½ oz' : `${value} oz`,
    reset: 'Valeurs d’origine',
  },
  print: {
    eyebrow: 'Impression',
    title: 'Proposé à l’impression',
    description: 'Chaque fenêtre d’impression part de ces choix.',
    paper: 'Papier des fiches',
    indicators: 'Indicateurs sur la fiche',
    label: 'Format des étiquettes',
  },
  maintenance: {
    eyebrow: 'Zone sensible',
    title: 'Corbeille et entretien',
    description: 'Une sauvegarde est faite avant tout effacement définitif.',
    rebuild: 'Reconstruire la recherche',
    rebuilt: (count: number) => `Recherche reconstruite, ${count} éléments.`,
    trash: 'Corbeille…',
    trashTitle: 'Corbeille',
    trashText: 'Ce que tu as supprimé, jusqu’à ce que tu vides la corbeille.',
    trashEmpty: 'La corbeille est vide.',
    kinds: {
      recipe: 'Fiche',
      ingredient: 'Ingrédient',
      product: 'Bouteille',
      tasting_note: 'Dégustation',
      notebook_entry: 'Note du carnet',
      prep_batch: 'Fabrication',
      collection: 'Collection',
    },
    restore: 'Restaurer',
    restoreOf: (title: string) => `Restaurer ${title}`,
    restored: (title: string) => `${title} est de retour.`,
    more: (count: number) => `Et ${count} autres, plus anciens.`,
    empty: 'Vider la corbeille',
    emptyConfirm: (count: number) =>
      `${count === 1 ? 'L’élément sera effacé' : `Les ${count} éléments seront effacés`} pour de bon, avec les versions et les dégustations des fiches concernées. Seule la sauvegarde faite juste avant permettra de revenir en arrière.`,
    emptyNow: 'Effacer pour de bon',
    emptied: 'Corbeille vidée, après une sauvegarde.',
    cancel: 'Annuler',
    reset: 'Réinitialiser Shakery…',
    resetTitle: 'Réinitialiser Shakery',
    resetText:
      'Tes créations, dégustations, notes, bouteilles, photos et réglages sont effacés, les classiques de départ reviennent. Le carnet actuel est sauvegardé avant : tu le retrouveras dans Sauvegardes.',
    resetField: 'Tape RÉINITIALISER pour confirmer',
    resetWord: 'RÉINITIALISER',
    resetNow: 'Sauvegarder puis réinitialiser',
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
      { name: 'Wikidata', text: 'Noms d’ingrédients et degrés, CC0.' },
      {
        name: 'Allergènes',
        text: 'Liste du règlement (UE) 1169/2011, attribuée par type de produit. L’étiquette de la bouteille fait foi.',
      },
      {
        name: 'Degrés de référence',
        text: 'Règlements (UE) 2019/787, 251/2014 et 1308/2013, Wikipédia en anglais (CC BY-SA 4.0), fiches des fabricants et des distributeurs.',
      },
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
