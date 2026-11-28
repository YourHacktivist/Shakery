/** Settings screen (section 10.14, D-057). */
export const settings = {
  title: 'Paramètres',
  subtitle: 'Réglages et données du carnet',
  /** Table of contents on the left of the page: short names of the blocks. */
  toc: {
    label: 'Sommaire des paramètres',
    appearance: 'Apparence',
    backups: 'Sauvegarde',
    transfer: 'Import et export',
    calculation: 'Calculs',
    print: 'Impression',
    barcode: 'Code-barres',
    updates: 'Mises à jour',
    about: 'À propos',
  },
  /** Small capitals over the groups of rows inside a block. */
  groups: {
    display: 'Affichage',
    reminders: 'Unités et rappels',
    automatic: 'Sauvegarde automatique',
    recent: 'Sauvegardes récentes',
    whole: 'Carnet entier',
    equivalences: 'Équivalences',
    help: 'Aide',
    credits: 'Crédits des données',
  },
  appearance: {
    title: 'Apparence et unités',
    description: 'Ces choix valent pour tous les écrans de Shakery.',
    theme: 'Thème',
    themes: { dark: 'Sombre', light: 'Clair' },
    unit: 'Unité des doses',
    units: { ml: 'ml', cl: 'cl', oz: 'oz' },
    warning: 'Alerte des préparations',
    warningHint: 'Une préparation est signalée avant d’atteindre sa date limite.',
    days: (count: number) =>
      count === 0 ? 'Le jour même' : count === 1 ? '1 jour avant' : `${count} jours avant`,
    animations: 'Animations',
    performance: 'Mode performance',
    note: 'Ce mode retire le flou, les ombres, les dessins de fond et les animations. Les animations se coupent aussi quand Windows les réduit.',
  },
  backups: {
    title: 'Sauvegarder et restaurer',
    description: 'Shakery sauvegarde au démarrage selon la fréquence choisie, et à chaque fermeture.',
    manual: 'Sauvegarde manuelle',
    lastBackup: (when: string | null) =>
      when === null ? 'Aucune sauvegarde pour l’instant.' : `Dernière sauvegarde le ${when}.`,
    folder: 'Dossier des sauvegardes',
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
    keepDailyHint: 'Les sauvegardes quotidiennes plus anciennes sont effacées.',
    keptDays: (count: number) => `${count} jours`,
    keepWeekly: 'Semaines gardées',
    keepWeeklyHint: 'Une sauvegarde par semaine est gardée en plus.',
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
      'pre-update': 'avant d’installer une version',
    },
    confirmTitle: 'Restaurer cette sauvegarde',
    confirmText: (when: string) =>
      `Le carnet reviendra à son état du ${when}. Son état actuel est sauvegardé juste avant.`,
    cancel: 'Annuler',
  },
  calculation: {
    title: 'Calculs',
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
    dilutionHint:
      'Chaque valeur est la part d’eau apportée par la glace, rapportée au volume de départ. Une fiche peut avoir la sienne.',
    steps: 'Pas des doses dans l’atelier',
    stepMl: 'En ml et cl',
    stepOz: 'En onces',
    inMl: (value: string) => `${value} ml`,
    inOz: (value: number) =>
      value === 0.125 ? '⅛ oz' : value === 0.25 ? '¼ oz' : value === 0.5 ? '½ oz' : `${value} oz`,
    pricing: 'Prix conseillé',
    pricingHint:
      'Le calculateur de coût propose le coût HT multiplié par le coefficient, TVA comprise, puis arrondi.',
    multiplier: 'Coefficient',
    vat: 'TVA',
    step: 'Arrondi',
    rounding: 'Sens de l’arrondi',
    roundings: { up: 'Au-dessus', nearest: 'Au plus proche' },
    reset: 'Valeurs d’origine',
  },
  print: {
    title: 'Impression',
    description: 'Chaque fenêtre d’impression part de ces choix.',
    paper: 'Papier des fiches',
    indicators: 'Indicateurs sur la fiche',
    label: 'Format des étiquettes',
  },
  maintenance: {
    title: 'Corbeille et entretien',
    description: 'Une sauvegarde est faite avant tout effacement définitif.',
    search: 'Recherche',
    rebuildHint: 'À relancer si une fiche manque dans les résultats.',
    rebuild: 'Reconstruire la recherche',
    rebuilt: (count: number) => `Recherche reconstruite, ${count} éléments.`,
    trashHint: 'Un élément supprimé s’y retrouve, à restaurer ou à effacer pour de bon.',
    trash: 'Ouvrir la corbeille',
    trashTitle: 'Corbeille',
    trashText: 'Un élément supprimé reste ici jusqu’à ce que la corbeille soit vidée.',
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
    resetHint: 'Le carnet est vidé après une dernière sauvegarde.',
    reset: 'Réinitialiser…',
    resetTitle: 'Réinitialiser Shakery',
    resetText:
      'Les créations, dégustations, notes, bouteilles, photos et réglages sont effacés, et les classiques de départ reviennent. Le carnet actuel est sauvegardé avant et reste disponible parmi les sauvegardes.',
    resetField: 'Saisir RÉINITIALISER pour confirmer',
    resetWord: 'RÉINITIALISER',
    resetNow: 'Sauvegarder puis réinitialiser',
  },
  about: {
    title: 'À propos',
    tagline:
      'Shakery est le carnet de création du barman. Il garde tout sur ce PC et fonctionne sans Internet.',
    tools: 'Guide et outils',
    toolsHint: 'Les journaux aident à comprendre un problème au moment de le signaler.',
    guide: 'Guide',
    shortcuts: 'Raccourcis',
    logs: 'Journaux',
    licences: 'Licences',
    licencesTitle: 'Licences des composants',
    licencesText: 'Shakery est livré avec ces logiciels libres.',
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
        name: 'Sucre et acidité',
        text: 'Table Ciqual, mesures de laboratoire publiées par Alko et Vinmonopolet pour chaque bouteille, étiquettes et fiches des producteurs.',
      },
      {
        name: 'International Bartenders Association',
        text: 'Doses des cocktails officiels, étapes réécrites.',
      },
      { name: 'Open Food Facts', text: '© contributeurs Open Food Facts, ODbL.' },
      { name: 'Manrope', text: 'Police sous licence SIL Open Font License 1.1.' },
    ],
  },
  /** The block that gathers the export and the import of a whole notebook. */
  transfer: {
    title: 'Exporter et importer',
    description: 'Le carnet passe ainsi d’un ordinateur à l’autre, ou se reprend dans un tableur.',
  },
  import: {
    title: 'Importer un carnet',
    description:
      'Le fichier .shakery peut venir d’un autre carnet ou d’une conversion, comme les carnets MAF. Le carnet actuel est sauvegardé avant l’import.',
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
      ignore: 'Garder l’existant',
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
    expired: 'Le fichier choisi a expiré. Il faut le choisir à nouveau.',
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
    title: 'Exporter le carnet',
    description: 'Le carnet entier part dans un fichier .shakery, photos comprises.',
    full: 'Exporter tout le carnet',
    running: 'Export en cours…',
    done: 'Carnet exporté.',
    csvTitle: 'Tableaux CSV',
    csvLabel: 'Exporter pour un tableur',
    csvDescription:
      'Un tableur reçoit les fiches avec leurs ingrédients, le journal de dégustation ou la liste des ingrédients.',
    csv: { recipes: 'Fiches', journal: 'Journal', ingredients: 'Ingrédients' },
    csvDone: 'Tableau enregistré.',
  },
  off: {
    title: 'Recherche par code-barres',
    description:
      'La recherche par code-barres remplit une bouteille depuis la base libre Open Food Facts, avec la marque, le nom, la contenance, le degré et les allergènes.',
    toggle: 'Recherche par code-barres',
    toggleHint: 'Quand elle est désactivée, aucune requête ne part vers Open Food Facts.',
  },
  updates: {
    title: 'Mises à jour',
    description:
      'Shakery cherche sur GitHub une version plus récente et propose de l’installer. Aucune donnée du carnet n’est envoyée.',
    toggle: 'Rechercher au lancement',
    /** Label of the row of the version while the version is being read. */
    installed: 'Version installée',
    check: 'Rechercher maintenant',
    show: 'Voir la nouvelle version',
    status: {
      unsupported: 'Cette version de développement ne se met pas à jour.',
      idle: 'Aucune recherche n’a encore été faite depuis le lancement.',
      checking: 'Shakery interroge GitHub…',
      none: 'Shakery est à jour.',
      available: (version: string) => `La version ${version} est disponible.`,
      skipped: (version: string) => `La version ${version} est disponible et a été ignorée.`,
      downloading: (percent: string) => `La nouvelle version se télécharge (${percent}).`,
      ready: (version: string) => `La version ${version} est prête à installer.`,
    },
    checkedAt: (when: string) => `Dernière recherche : ${when}.`,
  },
} as const
